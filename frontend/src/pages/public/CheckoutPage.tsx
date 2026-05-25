import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, Collapse, Divider, Stack, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { AppButton, AppCard, AppInput, AppRadio, AppSelect, AppTextarea } from '@/components/ui';
import { APPLY_PROMO_CODE_MUTATION, CREATE_ORDER_MUTATION } from '@/graphql/operations/cart';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { DeliveryMethod, PaymentMethod } from '@/constants/enums';
import { Icons } from '@/constants/icons';
import { ROUTES } from '@/constants/routes';
import { tokens } from '@/theme';
import type { OrderOut, PromoValidationResult } from '@/types/cart';
import {
	computeCheckoutTotal,
	computeShippingAmount,
	getCheckoutContactDefaults,
	isValidCardCvv,
	isValidCardExpiry,
	isValidCardNumber,
	NOVA_POST_BRANCHES,
	readCheckoutContactDraft,
	saveCheckoutContactDraft,
} from './checkoutUtils';

const checkoutSchema = z
	.object({
		firstName: z.string().trim().min(1, 'checkout.errors.required'),
		lastName: z.string().trim().min(1, 'checkout.errors.required'),
		email: z.string().trim().email('checkout.errors.invalidEmail'),
		phone: z.string().trim().min(7, 'checkout.errors.invalidPhone'),
		deliveryMethod: z.nativeEnum(DeliveryMethod),
		deliveryAddress: z.string().trim().optional(),
		branchPickupPoint: z.string().trim().optional(),
		paymentMethod: z.nativeEnum(PaymentMethod),
		cardHolderName: z.string().trim().optional(),
		cardNumber: z.string().trim().optional(),
		cardExpiry: z.string().trim().optional(),
		cardCvv: z.string().trim().optional(),
		notes: z.string().max(1000, 'checkout.errors.notesTooLong').optional(),
	})
	.superRefine((values, context) => {
		if (values.deliveryMethod === DeliveryMethod.COURIER && !values.deliveryAddress?.trim()) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['deliveryAddress'],
				message: 'checkout.errors.deliveryAddressRequired',
			});
		}

		if (
			values.deliveryMethod === DeliveryMethod.BRANCH_PICKUP &&
			!values.branchPickupPoint?.trim()
		) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['branchPickupPoint'],
				message: 'checkout.errors.branchRequired',
			});
		}

		if (values.paymentMethod === PaymentMethod.CARD) {
			if (!values.cardHolderName?.trim()) {
				context.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['cardHolderName'],
					message: 'checkout.errors.required',
				});
			}

			if (!values.cardNumber?.trim() || !isValidCardNumber(values.cardNumber)) {
				context.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['cardNumber'],
					message: 'checkout.errors.cardNumberInvalid',
				});
			}

			if (!values.cardExpiry?.trim() || !isValidCardExpiry(values.cardExpiry)) {
				context.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['cardExpiry'],
					message: 'checkout.errors.cardExpiryInvalid',
				});
			}

			if (!values.cardCvv?.trim() || !isValidCardCvv(values.cardCvv)) {
				context.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['cardCvv'],
					message: 'checkout.errors.cardCvvInvalid',
				});
			}
		}
	});

type CheckoutForm = z.infer<typeof checkoutSchema>;

type PaymentStage = 'idle' | 'validating' | 'awaiting' | 'finalizing';

function normalizeDigits(value: string) {
	return value.replace(/\D/g, '');
}

function wait(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function toFieldMessage(
	message: string | undefined,
	t: (key: string, options?: Record<string, unknown>) => string
) {
	return message ? t(message) : undefined;
}

function getBranchLabel(value: string, t: (key: string) => string) {
	const branch = NOVA_POST_BRANCHES.find((item) => item.value === value);
	return branch ? t(branch.labelKey) : t('checkout.summary.empty');
}

function summarizeContact(values: CheckoutForm, t: (key: string) => string) {
	const pieces = [values.firstName, values.lastName, values.email].filter(Boolean);
	return pieces.length > 0 ? pieces.join(' · ') : t('checkout.summary.empty');
}

function summarizeDelivery(values: CheckoutForm, t: (key: string) => string) {
	if (values.deliveryMethod === DeliveryMethod.COURIER) {
		return values.deliveryAddress?.trim()
			? values.deliveryAddress.trim()
			: t('checkout.summary.empty');
	}

	if (values.deliveryMethod === DeliveryMethod.BRANCH_PICKUP) {
		return values.branchPickupPoint?.trim()
			? getBranchLabel(values.branchPickupPoint, t)
			: t('checkout.summary.empty');
	}

	return t('checkout.delivery.selfPickup');
}

function summarizePayment(values: CheckoutForm, t: (key: string) => string) {
	if (values.paymentMethod === PaymentMethod.CASH_ON_DELIVERY) {
		return t('checkout.payment.cash');
	}

	const last4 = normalizeDigits(values.cardNumber ?? '').slice(-4);
	return last4 ? `${t('checkout.payment.card')} · **** ${last4}` : t('checkout.payment.card');
}

function CheckoutSectionCard({
	title,
	subtitle,
	expanded,
	onToggle,
	children,
}: {
	title: string;
	subtitle?: string;
	expanded: boolean;
	onToggle: () => void;
	children: ReactNode;
}) {
	const { t } = useTranslation();

	return (
		<AppCard
			title={title}
			subtitle={subtitle}
			headerAction={
				<AppButton
					tone="ghost"
					size="small"
					onClick={onToggle}
					endIcon={<FontAwesomeIcon icon={expanded ? Icons.angleUp : Icons.angleDown} size="xs" />}
				>
					{expanded ? t('checkout.section.collapse') : t('checkout.section.expand')}
				</AppButton>
			}
		>
			<Collapse in={expanded} timeout="auto" unmountOnExit>
				{children}
			</Collapse>
		</AppCard>
	);
}

function CheckoutConfirmation({ order }: { order: OrderOut }) {
	const { t } = useTranslation();
	const navigate = useNavigate();

	return (
		<Box sx={{ textAlign: 'center', py: 4 }}>
			<Box
				sx={{
					width: 72,
					height: 72,
					borderRadius: '50%',
					bgcolor: tokens.cyanSoft,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					mx: 'auto',
					mb: 3,
				}}
			>
				<FontAwesomeIcon icon={Icons.checkCircle} size="2x" color={tokens.cyanInk} />
			</Box>
			<Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 1 }}>
				{t('checkout.confirmed.title')}
			</Typography>
			<Typography sx={{ fontSize: 14, color: tokens.ink3, maxWidth: 400, mx: 'auto', mb: 3 }}>
				{t('checkout.confirmed.subtitle')}
			</Typography>
			<Box
				sx={{
					display: 'inline-flex',
					alignItems: 'center',
					gap: 1,
					bgcolor: tokens.bg,
					border: `1px solid ${tokens.line}`,
					borderRadius: '10px',
					px: 3,
					py: 1.5,
					mb: 4,
				}}
			>
				<Typography
					sx={{
						fontSize: 12,
						fontWeight: 700,
						color: tokens.ink3,
						textTransform: 'uppercase',
						letterSpacing: '0.08em',
					}}
				>
					{t('checkout.confirmed.orderId')}
				</Typography>
				<Typography
					sx={{
						fontFamily: "'JetBrains Mono', monospace",
						fontSize: 13,
						fontWeight: 700,
						color: tokens.ink1,
					}}
				>
					{order.id.slice(-8).toUpperCase()}
				</Typography>
			</Box>
			<Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
				<AppButton tone="primary" onClick={() => navigate(ROUTES.ACCOUNT_ORDERS)}>
					{t('checkout.confirmed.viewOrders')}
				</AppButton>
				<AppButton tone="ghost" onClick={() => navigate(ROUTES.PRODUCTS)}>
					{t('checkout.confirmed.continueShopping')}
				</AppButton>
			</Box>
		</Box>
	);
}

export default function CheckoutPage() {
	const { t } = useTranslation();
	const user = useAuthStore((state) => state.user);
	const cartItems = useCartStore((state) => state.items);
	const subtotal = useCartStore((state) => state.subtotal());
	const clearCart = useCartStore((state) => state.clearCart);
	const setPromoCodeInStore = useCartStore((state) => state.setPromoCode);
	const [confirmedOrder, setConfirmedOrder] = useState<OrderOut | null>(null);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [promoInput, setPromoInput] = useState('');
	const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
	const [promoDiscount, setPromoDiscount] = useState(0);
	const [promoError, setPromoError] = useState<string | null>(null);
	const [sections, setSections] = useState({ contact: true, delivery: true, payment: true });
	const [paymentStage, setPaymentStage] = useState<PaymentStage>('idle');

	const [createOrder, { loading: submitting }] = useMutation<{ createOrder: OrderOut }>(
		CREATE_ORDER_MUTATION
	);
	const [applyPromo, { loading: promoLoading }] = useMutation<{
		applyPromoCode: PromoValidationResult;
	}>(APPLY_PROMO_CODE_MUTATION);

	const contactDefaults = getCheckoutContactDefaults(user, readCheckoutContactDraft());

	const form = useForm<CheckoutForm>({
		resolver: zodResolver(checkoutSchema),
		defaultValues: {
			...contactDefaults,
			deliveryMethod: DeliveryMethod.COURIER,
			deliveryAddress: '',
			branchPickupPoint: NOVA_POST_BRANCHES[0].value,
			paymentMethod: PaymentMethod.CARD,
			cardHolderName: [contactDefaults.firstName, contactDefaults.lastName]
				.filter(Boolean)
				.join(' '),
			cardNumber: '',
			cardExpiry: '',
			cardCvv: '',
			notes: '',
		},
	});

	const {
		register,
		handleSubmit,
		watch,
		control,
		resetField,
		formState: { errors },
	} = form;

	const watchedFirstName = watch('firstName');
	const watchedLastName = watch('lastName');
	const watchedEmail = watch('email');
	const watchedPhone = watch('phone');
	const watchedDeliveryMethod = watch('deliveryMethod');
	const watchedDeliveryAddress = watch('deliveryAddress');
	const watchedBranchPickupPoint = watch('branchPickupPoint');
	const watchedPaymentMethod = watch('paymentMethod');
	const watchedCardNumber = watch('cardNumber');

	useEffect(() => {
		if (watchedFirstName || watchedLastName || watchedEmail || watchedPhone) {
			saveCheckoutContactDraft({
				firstName: watchedFirstName ?? '',
				lastName: watchedLastName ?? '',
				email: watchedEmail ?? '',
				phone: watchedPhone ?? '',
			});
		}
	}, [watchedEmail, watchedFirstName, watchedLastName, watchedPhone]);

	useEffect(() => {
		if (watchedDeliveryMethod !== DeliveryMethod.COURIER) {
			resetField('deliveryAddress', { defaultValue: '' });
		}
		if (watchedDeliveryMethod !== DeliveryMethod.BRANCH_PICKUP) {
			resetField('branchPickupPoint', { defaultValue: NOVA_POST_BRANCHES[0].value });
		}
	}, [resetField, watchedDeliveryMethod]);

	const shipping = computeShippingAmount(watchedDeliveryMethod, subtotal);
	const total = computeCheckoutTotal(subtotal, shipping, promoDiscount);

	const branchLabel = useMemo(() => {
		const branch = NOVA_POST_BRANCHES.find((item) => item.value === watchedBranchPickupPoint);
		return branch ? t(branch.labelKey) : t('checkout.summary.empty');
	}, [t, watchedBranchPickupPoint]);

	const contactSummary = useMemo(
		() =>
			summarizeContact(
				{
					...form.getValues(),
					firstName: watchedFirstName,
					lastName: watchedLastName,
					email: watchedEmail,
					phone: watchedPhone,
				} as CheckoutForm,
				t
			),
		[form, t, watchedEmail, watchedFirstName, watchedLastName, watchedPhone]
	);

	const deliverySummary = useMemo(() => {
		const deliveryValues = {
			...form.getValues(),
			deliveryMethod: watchedDeliveryMethod,
			deliveryAddress: watchedDeliveryAddress,
			branchPickupPoint: watchedBranchPickupPoint,
		} as CheckoutForm;
		return summarizeDelivery(deliveryValues, t);
	}, [
		branchLabel,
		form,
		t,
		watchedBranchPickupPoint,
		watchedDeliveryAddress,
		watchedDeliveryMethod,
	]);

	const paymentSummary = useMemo(() => {
		const paymentValues = {
			...form.getValues(),
			paymentMethod: watchedPaymentMethod,
			cardNumber: watchedCardNumber,
		} as CheckoutForm;
		return summarizePayment(paymentValues, t);
	}, [form, t, watchedCardNumber, watchedPaymentMethod]);

	const paymentProgressMessage =
		paymentStage === 'validating'
			? t('checkout.payment.processingValidating')
			: paymentStage === 'awaiting'
				? t('checkout.payment.processingAwaiting')
				: paymentStage === 'finalizing'
					? t('checkout.payment.processingFinalizing')
					: '';

	const handleApplyPromo = async () => {
		if (!promoInput.trim()) {
			return;
		}

		setPromoError(null);

		try {
			const { data } = await applyPromo({ variables: { code: promoInput.trim().toUpperCase() } });
			const result = data?.applyPromoCode;
			if (result?.valid) {
				const code = promoInput.trim().toUpperCase();
				setAppliedPromoCode(code);
				setPromoDiscount(result.discount);
				setPromoInput('');
				setPromoCodeInStore(code);
			} else {
				setPromoError(result?.message ? t(result.message) : t('checkout.promo.invalid'));
			}
		} catch {
			setPromoError(t('checkout.promo.invalid'));
		}
	};

	const handleRemovePromo = () => {
		setAppliedPromoCode(null);
		setPromoDiscount(0);
		setPromoInput('');
		setPromoError(null);
		setPromoCodeInStore(null);
	};

	const handleOrderSubmit = async (values: CheckoutForm) => {
		setSubmitError(null);
		setPaymentStage('idle');

		try {
			if (values.paymentMethod === PaymentMethod.CARD) {
				setPaymentStage('validating');
				await wait(2000);
				setPaymentStage('awaiting');
				await wait(2000);
			} else {
				setPaymentStage('finalizing');
				await wait(2000);
			}

			setPaymentStage('finalizing');
			await wait(2000);

			const deliveryAddress =
				values.deliveryMethod === DeliveryMethod.COURIER
					? (values.deliveryAddress ?? '').trim()
					: values.deliveryMethod === DeliveryMethod.BRANCH_PICKUP
						? getBranchLabel(values.branchPickupPoint ?? '', t)
						: undefined;

			const { data } = await createOrder({
				variables: {
					items: cartItems.map((item) => ({
						productId: item.productId,
						variantId: item.variantId ?? null,
						quantity: item.qty,
					})),
					paymentMethod: values.paymentMethod,
					deliveryMethod: values.deliveryMethod,
					deliveryAddress,
					promoCode: appliedPromoCode || undefined,
					notes: (values.notes ?? '').trim() || undefined,
				},
			});

			if (data?.createOrder) {
				clearCart();
				setAppliedPromoCode(null);
				setPromoDiscount(0);
				setPromoInput('');
				setConfirmedOrder(data.createOrder);
			}
		} catch (error: unknown) {
			setSubmitError(error instanceof Error ? error.message : t('checkout.errors.generic'));
		} finally {
			setPaymentStage('idle');
		}
	};

	if (confirmedOrder) {
		return (
			<Box sx={{ maxWidth: 680, mx: 'auto', px: { xs: 2, md: 3 }, py: 4 }}>
				<CheckoutConfirmation order={confirmedOrder} />
			</Box>
		);
	}

	return (
		<Box sx={{ maxWidth: 1320, mx: 'auto', px: { xs: 2, md: 3 }, py: 4 }}>
			<Box sx={{ mb: 4 }}>
				<Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 1 }}>
					{t('checkout.title')}
				</Typography>
				<Typography sx={{ color: tokens.ink3, fontSize: 14, maxWidth: 760 }}>
					{t('checkout.subtitle')}
				</Typography>
			</Box>

			<Box
				component="form"
				id="checkout-form"
				onSubmit={handleSubmit(handleOrderSubmit)}
				noValidate
				sx={{
					display: 'grid',
					gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1fr) 380px' },
					gap: 3,
				}}
			>
				<Stack spacing={2.5}>
					<CheckoutSectionCard
						title={t('checkout.contact.title')}
						subtitle={contactSummary}
						expanded={sections.contact}
						onToggle={() => setSections((state) => ({ ...state, contact: !state.contact }))}
					>
						<Box sx={{ mb: 2 }}>
							<Typography sx={{ fontSize: 13, color: tokens.ink3 }}>
								{t('checkout.contact.autofillHint')}
							</Typography>
						</Box>
						<Box
							sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}
						>
							<AppInput
								label={t('checkout.contact.firstName')}
								placeholder={t('checkout.contact.firstName')}
								autoComplete="given-name"
								{...register('firstName')}
								error={!!errors.firstName}
								helperText={toFieldMessage(errors.firstName?.message, t)}
							/>
							<AppInput
								label={t('checkout.contact.lastName')}
								placeholder={t('checkout.contact.lastName')}
								autoComplete="family-name"
								{...register('lastName')}
								error={!!errors.lastName}
								helperText={toFieldMessage(errors.lastName?.message, t)}
							/>
						</Box>
						<Box
							sx={{
								display: 'grid',
								gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
								gap: 2,
								mt: 2,
							}}
						>
							<AppInput
								label={t('checkout.contact.email')}
								placeholder={t('checkout.contact.email')}
								autoComplete="email"
								type="email"
								{...register('email')}
								error={!!errors.email}
								helperText={toFieldMessage(errors.email?.message, t)}
							/>
							<AppInput
								label={t('checkout.contact.phone')}
								placeholder={t('checkout.contact.phone')}
								autoComplete="tel"
								inputProps={{ inputMode: 'tel' }}
								{...register('phone')}
								error={!!errors.phone}
								helperText={toFieldMessage(errors.phone?.message, t)}
							/>
						</Box>
					</CheckoutSectionCard>

					<CheckoutSectionCard
						title={t('checkout.delivery.title')}
						subtitle={deliverySummary}
						expanded={sections.delivery}
						onToggle={() => setSections((state) => ({ ...state, delivery: !state.delivery }))}
					>
						<Controller
							name="deliveryMethod"
							control={control}
							render={({ field }) => (
								<AppRadio
									{...field}
									sx={{ display: 'grid', gap: 1.25 }}
									options={[
										{
											value: DeliveryMethod.COURIER,
											label: (
												<Box>
													<Typography sx={{ fontSize: 14, fontWeight: 700 }}>
														{t('checkout.delivery.novaCourier')}
													</Typography>
													<Typography sx={{ fontSize: 12, color: tokens.ink3 }}>
														{t('checkout.delivery.courierHint')}
													</Typography>
												</Box>
											),
										},
										{
											value: DeliveryMethod.BRANCH_PICKUP,
											label: (
												<Box>
													<Typography sx={{ fontSize: 14, fontWeight: 700 }}>
														{t('checkout.delivery.novaBranch')}
													</Typography>
													<Typography sx={{ fontSize: 12, color: tokens.ink3 }}>
														{t('checkout.delivery.branchHint')}
													</Typography>
												</Box>
											),
										},
										{
											value: DeliveryMethod.SELF_PICKUP,
											label: (
												<Box>
													<Typography sx={{ fontSize: 14, fontWeight: 700 }}>
														{t('checkout.delivery.selfPickup')}
													</Typography>
													<Typography sx={{ fontSize: 12, color: tokens.ink3 }}>
														{t('checkout.delivery.selfHint')}
													</Typography>
												</Box>
											),
										},
									]}
								/>
							)}
						/>

						{watchedDeliveryMethod === DeliveryMethod.COURIER && (
							<Box sx={{ mt: 2 }}>
								<AppInput
									label={t('checkout.delivery.address')}
									placeholder={t('checkout.delivery.addressPlaceholder')}
									autoComplete="street-address"
									{...register('deliveryAddress')}
									error={!!errors.deliveryAddress}
									helperText={toFieldMessage(errors.deliveryAddress?.message, t)}
								/>
							</Box>
						)}

						{watchedDeliveryMethod === DeliveryMethod.BRANCH_PICKUP && (
							<Box sx={{ mt: 2 }}>
								<Controller
									name="branchPickupPoint"
									control={control}
									render={({ field }) => (
										<AppSelect
											label={t('checkout.delivery.branchSelect')}
											options={NOVA_POST_BRANCHES.map((branch) => ({
												value: branch.value,
												label: t(branch.labelKey),
											}))}
											value={field.value}
											onChange={field.onChange}
											error={!!errors.branchPickupPoint}
											helperText={toFieldMessage(errors.branchPickupPoint?.message, t)}
										/>
									)}
								/>
							</Box>
						)}
					</CheckoutSectionCard>

					<CheckoutSectionCard
						title={t('checkout.payment.title')}
						subtitle={paymentSummary}
						expanded={sections.payment}
						onToggle={() => setSections((state) => ({ ...state, payment: !state.payment }))}
					>
						<Controller
							name="paymentMethod"
							control={control}
							render={({ field }) => (
								<AppRadio
									{...field}
									sx={{ display: 'grid', gap: 1.25 }}
									options={[
										{
											value: PaymentMethod.CARD,
											label: (
												<Box>
													<Typography sx={{ fontSize: 14, fontWeight: 700 }}>
														{t('checkout.payment.card')}
													</Typography>
													<Typography sx={{ fontSize: 12, color: tokens.ink3 }}>
														{t('checkout.payment.cardHint')}
													</Typography>
												</Box>
											),
										},
										{
											value: PaymentMethod.CASH_ON_DELIVERY,
											label: (
												<Box>
													<Typography sx={{ fontSize: 14, fontWeight: 700 }}>
														{t('checkout.payment.cash')}
													</Typography>
													<Typography sx={{ fontSize: 12, color: tokens.ink3 }}>
														{t('checkout.payment.cashHint')}
													</Typography>
												</Box>
											),
										},
									]}
								/>
							)}
						/>

						{watchedPaymentMethod === PaymentMethod.CARD && (
							<Box sx={{ mt: 2, display: 'grid', gap: 2 }}>
								<Typography sx={{ fontSize: 13, color: tokens.ink3 }}>
									{t('checkout.payment.cardMockHint')}
								</Typography>
								<Box
									sx={{
										display: 'grid',
										gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
										gap: 2,
									}}
								>
									<AppInput
										label={t('checkout.payment.cardHolderName')}
										placeholder={t('checkout.payment.cardHolderName')}
										autoComplete="cc-name"
										{...register('cardHolderName')}
										error={!!errors.cardHolderName}
										helperText={toFieldMessage(errors.cardHolderName?.message, t)}
									/>
									<AppInput
										label={t('checkout.payment.cardExpiry')}
										placeholder={t('checkout.payment.cardExpiryPlaceholder')}
										autoComplete="cc-exp"
										{...register('cardExpiry')}
										error={!!errors.cardExpiry}
										helperText={toFieldMessage(errors.cardExpiry?.message, t)}
									/>
								</Box>
								<Box
									sx={{
										display: 'grid',
										gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
										gap: 2,
									}}
								>
									<AppInput
										label={t('checkout.payment.cardNumber')}
										placeholder={t('checkout.payment.cardNumberPlaceholder')}
										autoComplete="cc-number"
										inputProps={{ inputMode: 'numeric' }}
										{...register('cardNumber', { setValueAs: normalizeDigits })}
										error={!!errors.cardNumber}
										helperText={toFieldMessage(errors.cardNumber?.message, t)}
									/>
									<AppInput
										label={t('checkout.payment.cardCvv')}
										placeholder={t('checkout.payment.cardCvvPlaceholder')}
										autoComplete="cc-csc"
										inputProps={{ inputMode: 'numeric' }}
										{...register('cardCvv')}
										error={!!errors.cardCvv}
										helperText={toFieldMessage(errors.cardCvv?.message, t)}
									/>
								</Box>
							</Box>
						)}

						<Box sx={{ mt: 2 }}>
							<AppTextarea
								label={t('checkout.payment.notes')}
								placeholder={t('checkout.payment.notesPlaceholder')}
								rows={3}
								{...register('notes')}
								error={!!errors.notes}
								helperText={toFieldMessage(errors.notes?.message, t)}
							/>
						</Box>
					</CheckoutSectionCard>
				</Stack>

				<AppCard
					title={t('checkout.summary.title')}
					subtitle={t('checkout.summary.items', {
						count: cartItems.reduce((count, item) => count + item.qty, 0),
					})}
					sx={{ position: 'sticky', top: 24, alignSelf: 'start' }}
				>
					{paymentStage !== 'idle' && (
						<Box
							sx={{
								display: 'grid',
								gap: 0.5,
								mb: 2,
								p: 1.5,
								borderRadius: 1.5,
								border: `1px solid ${tokens.line}`,
								bgcolor: tokens.sand,
							}}
						>
							<Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.02em' }}>
								{t('checkout.payment.transactionTitle')}
							</Typography>
							<Typography sx={{ fontSize: 13, color: tokens.ink3 }}>
								{paymentProgressMessage}
							</Typography>
						</Box>
					)}

					<Box sx={{ display: 'grid', gap: 1.25, mb: 2 }}>
						{cartItems.map((item) => (
							<Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
								<Box sx={{ minWidth: 0 }}>
									<Typography sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }} noWrap>
										{item.name}
									</Typography>
									<Typography sx={{ fontSize: 12, color: tokens.ink3 }}>
										{t('checkout.summary.quantityPrice', {
											qty: item.qty,
											price: item.price.toFixed(2),
										})}
									</Typography>
								</Box>
								<Typography sx={{ fontSize: 13, fontWeight: 700 }}>
									${(item.price * item.qty).toFixed(2)}
								</Typography>
							</Box>
						))}
					</Box>

					<Divider sx={{ mb: 2 }} />

					<Box sx={{ display: 'grid', gap: 1 }}>
						<Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
							<Typography sx={{ fontSize: 13, color: tokens.ink3 }}>
								{t('checkout.summary.subtotal')}
							</Typography>
							<Typography sx={{ fontSize: 13, fontWeight: 700 }}>${subtotal.toFixed(2)}</Typography>
						</Box>
						<Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
							<Typography sx={{ fontSize: 13, color: tokens.ink3 }}>
								{t('checkout.summary.shipping')}
							</Typography>
							<Typography sx={{ fontSize: 13, fontWeight: 700 }}>
								{shipping === 0 ? t('checkout.summary.shippingFree') : `$${shipping.toFixed(2)}`}
							</Typography>
						</Box>
						{promoDiscount > 0 && (
							<Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
								<Typography sx={{ fontSize: 13, color: tokens.ink3 }}>
									{appliedPromoCode
										? t('checkout.summary.discountApplied', { code: appliedPromoCode })
										: t('checkout.summary.discount')}
								</Typography>
								<Typography sx={{ fontSize: 13, fontWeight: 700, color: tokens.coralInk }}>
									−${promoDiscount.toFixed(2)}
								</Typography>
							</Box>
						)}
					</Box>

					<Divider sx={{ my: 2 }} />

					<Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 2 }}>
						<Typography sx={{ fontSize: 15, fontWeight: 800 }}>
							{t('checkout.summary.total')}
						</Typography>
						<Typography sx={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em' }}>
							${total.toFixed(2)}
						</Typography>
					</Box>

					{promoError && (
						<Typography sx={{ fontSize: 13, color: tokens.coralInk, mb: 1.5 }}>
							{promoError}
						</Typography>
					)}
					{submitError && (
						<Typography sx={{ fontSize: 13, color: tokens.coralInk, mb: 1.5 }}>
							{submitError}
						</Typography>
					)}

					<Box sx={{ display: 'grid', gap: 1.25 }}>
						<AppInput
							label={t('checkout.promo.label')}
							placeholder={t('checkout.promo.placeholder')}
							value={promoInput}
							onChange={(event) => setPromoInput(event.target.value)}
							error={!!promoError}
							helperText={promoError ?? undefined}
						/>
						{appliedPromoCode ? (
							<AppButton tone="ghost" onClick={handleRemovePromo}>
								{t('checkout.promo.remove')}
							</AppButton>
						) : (
							<AppButton tone="ghost" onClick={handleApplyPromo} loading={promoLoading}>
								{t('checkout.promo.apply')}
							</AppButton>
						)}
						<AppButton
							tone="accent"
							type="submit"
							form="checkout-form"
							loading={submitting}
							endIcon={!submitting ? <FontAwesomeIcon icon={Icons.check} size="xs" /> : undefined}
							disabled={cartItems.length === 0 || paymentStage !== 'idle'}
						>
							{submitting ? t('checkout.processing') : t('checkout.placeOrder')}
						</AppButton>
					</Box>
				</AppCard>
			</Box>
		</Box>
	);
}
