import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
	Box,
	Typography,
	Radio,
	RadioGroup,
	FormControlLabel,
	Stepper,
	Step,
	StepLabel,
	Divider,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { AppButton, AppInput, AppTextarea } from '@/components/ui';
import { APPLY_PROMO_CODE_MUTATION, CREATE_ORDER_MUTATION } from '@/graphql/operations/cart';
import { useCartStore } from '@/store/cartStore';
import { Icons } from '@/constants/icons';
import { ROUTES } from '@/constants/routes';
import { tokens } from '@/theme';
import { DeliveryMethod, PaymentMethod } from '@/constants/enums';
import type { OrderOut, PromoValidationResult } from '@/types/cart';

// ─── Step schemas ─────────────────────────────────────────────────────────────

const contactSchema = z.object({
	firstName: z.string().min(1, 'Required'),
	lastName: z.string().min(1, 'Required'),
	email: z.string().email('Invalid email'),
	phone: z.string().min(7, 'Invalid phone'),
});
type ContactForm = z.infer<typeof contactSchema>;

const deliverySchema = z
	.object({
		deliveryMethod: z.nativeEnum(DeliveryMethod),
		deliveryAddress: z.string().optional(),
	})
	.refine(
		(d) =>
			d.deliveryMethod !== DeliveryMethod.COURIER ||
			(!!d.deliveryAddress && d.deliveryAddress.trim().length > 0),
		{ message: 'Delivery address is required', path: ['deliveryAddress'] }
	);
type DeliveryForm = z.infer<typeof deliverySchema>;

const paymentSchema = z.object({
	paymentMethod: z.nativeEnum(PaymentMethod),
	notes: z.string().max(1000).optional(),
});
type PaymentForm = z.infer<typeof paymentSchema>;

// ─── Step 1: Contact ──────────────────────────────────────────────────────────

function ContactStep({
	onNext,
	defaultValues,
}: {
	onNext: (data: ContactForm) => void;
	defaultValues?: ContactForm | null;
}) {
	const { t } = useTranslation();
	const {
		control,
		handleSubmit,
		formState: { errors },
	} = useForm<ContactForm>({
		resolver: zodResolver(contactSchema),
		defaultValues: defaultValues ?? {
			firstName: '',
			lastName: '',
			email: '',
			phone: '',
		},
	});

	return (
		<Box component="form" onSubmit={handleSubmit(onNext)} noValidate>
			<Typography sx={{ fontWeight: 700, fontSize: 16, mb: 3 }}>
				{t('checkout.contact.title')}
			</Typography>
			<Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
				<Controller
					name="firstName"
					control={control}
					render={({ field }) => (
						<AppInput
							{...field}
							label={t('checkout.contact.firstName')}
							error={!!errors.firstName}
							helperText={errors.firstName?.message}
						/>
					)}
				/>
				<Controller
					name="lastName"
					control={control}
					render={({ field }) => (
						<AppInput
							{...field}
							label={t('checkout.contact.lastName')}
							error={!!errors.lastName}
							helperText={errors.lastName?.message}
						/>
					)}
				/>
			</Box>
			<Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
				<Controller
					name="email"
					control={control}
					render={({ field }) => (
						<AppInput
							{...field}
							label={t('checkout.contact.email')}
							type="email"
							error={!!errors.email}
							helperText={errors.email?.message}
						/>
					)}
				/>
				<Controller
					name="phone"
					control={control}
					render={({ field }) => (
						<AppInput
							{...field}
							label={t('checkout.contact.phone')}
							type="tel"
							error={!!errors.phone}
							helperText={errors.phone?.message}
						/>
					)}
				/>
			</Box>
			<AppButton
				tone="primary"
				type="submit"
				endIcon={<FontAwesomeIcon icon={Icons.arrowRight} size="xs" />}
			>
				{t('checkout.next')}
			</AppButton>
		</Box>
	);
}

// ─── Step 2: Delivery ─────────────────────────────────────────────────────────

function DeliveryStep({
	onNext,
	onBack,
	defaultValues,
}: {
	onNext: (data: DeliveryForm) => void;
	onBack: () => void;
	defaultValues?: DeliveryForm | null;
}) {
	const { t } = useTranslation();
	const {
		control,
		handleSubmit,
		watch,
		formState: { errors },
	} = useForm<DeliveryForm>({
		resolver: zodResolver(deliverySchema),
		defaultValues: defaultValues ?? { deliveryMethod: DeliveryMethod.COURIER, deliveryAddress: '' },
	});
	const method = watch('deliveryMethod');

	return (
		<Box component="form" onSubmit={handleSubmit(onNext)} noValidate>
			<Typography sx={{ fontWeight: 700, fontSize: 16, mb: 3 }}>
				{t('checkout.delivery.title')}
			</Typography>

			<Controller
				name="deliveryMethod"
				control={control}
				render={({ field }) => (
					<RadioGroup
						{...field}
						sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5, mb: 3 }}
					>
						{[
							{
								value: DeliveryMethod.COURIER,
								label: t('checkout.delivery.courier'),
								icon: Icons.truck,
							},
							{
								value: DeliveryMethod.BRANCH_PICKUP,
								label: t('checkout.delivery.branch'),
								icon: Icons.location,
							},
							{
								value: DeliveryMethod.SELF_PICKUP,
								label: t('checkout.delivery.self'),
								icon: Icons.user,
							},
						].map(({ value, label, icon }) => (
							<Box
								key={value}
								onClick={() => field.onChange(value)}
								sx={{
									display: 'flex',
									alignItems: 'center',
									gap: '10px',
									p: '10px 12px',
									border: `1px solid ${field.value === value ? tokens.accent : tokens.line}`,
									borderRadius: '10px',
									cursor: 'pointer',
									bgcolor: field.value === value ? tokens.accentSoft : tokens.surface,
									transition: 'all 100ms',
								}}
							>
								<Radio
									value={value}
									sx={{ p: 0, color: tokens.ink3, '&.Mui-checked': { color: tokens.accent } }}
								/>
								<Box sx={{ color: field.value === value ? tokens.accentInk : tokens.ink3 }}>
									<FontAwesomeIcon icon={icon} size="sm" />
								</Box>
								<Typography
									sx={{
										fontWeight: 700,
										fontSize: 13,
										color: field.value === value ? tokens.accentInk : tokens.ink1,
									}}
								>
									{label}
								</Typography>
							</Box>
						))}
					</RadioGroup>
				)}
			/>

			{method === DeliveryMethod.COURIER && (
				<Controller
					name="deliveryAddress"
					control={control}
					render={({ field }) => (
						<AppInput
							{...field}
							label={t('checkout.delivery.address')}
							placeholder={t('checkout.delivery.addressPlaceholder')}
							error={!!errors.deliveryAddress}
							helperText={errors.deliveryAddress?.message}
							sx={{ mb: 3 }}
						/>
					)}
				/>
			)}

			<Box sx={{ display: 'flex', gap: 1.5 }}>
				<AppButton
					tone="ghost"
					onClick={onBack}
					startIcon={<FontAwesomeIcon icon={Icons.chevronLeft} size="xs" />}
				>
					{t('checkout.back')}
				</AppButton>
				<AppButton
					tone="primary"
					type="submit"
					endIcon={<FontAwesomeIcon icon={Icons.arrowRight} size="xs" />}
				>
					{t('checkout.next')}
				</AppButton>
			</Box>
		</Box>
	);
}

// ─── Step 3: Payment ──────────────────────────────────────────────────────────

function PaymentStep({
	onSubmit,
	onBack,
	submitting,
	error,
}: {
	onSubmit: (data: PaymentForm, promoCode: string | null) => void;
	onBack: () => void;
	submitting: boolean;
	error: string | null;
}) {
	const { t } = useTranslation();
	const { control, handleSubmit } = useForm<PaymentForm>({
		resolver: zodResolver(paymentSchema),
		defaultValues: { paymentMethod: PaymentMethod.CARD },
	});

	const subtotal = useCartStore((s) => s.subtotal)();
	const storePromo = useCartStore((s) => s.promoCode);

	const [promoInput, setPromoInput] = useState('');
	const [promoCode, setPromoCode] = useState<string | null>(storePromo);
	const [promoDiscount, setPromoDiscount] = useState(0);
	const [promoError, setPromoError] = useState<string | null>(null);
	const [applyPromo, { loading: promoLoading }] = useMutation<{
		applyPromoCode: PromoValidationResult;
	}>(APPLY_PROMO_CODE_MUTATION);

	const handleApplyPromo = async () => {
		if (!promoInput.trim()) return;
		setPromoError(null);
		try {
			const { data } = await applyPromo({ variables: { code: promoInput.trim().toUpperCase() } });
			const result = data?.applyPromoCode;
			if (result?.valid) {
				setPromoCode(promoInput.trim().toUpperCase());
				setPromoDiscount(result.discount);
				setPromoInput('');
			} else {
				setPromoError(result?.message ?? t('cart.promo.invalid'));
			}
		} catch {
			setPromoError(t('cart.promo.invalid'));
		}
	};

	const total = Math.max(0, subtotal - promoDiscount);

	return (
		<Box component="form" onSubmit={handleSubmit((d) => onSubmit(d, promoCode))} noValidate>
			<Typography sx={{ fontWeight: 700, fontSize: 16, mb: 2 }}>
				{t('checkout.payment.title')}
			</Typography>

			<Controller
				name="paymentMethod"
				control={control}
				render={({ field }) => (
					<RadioGroup {...field} sx={{ mb: 3 }}>
						{[
							{ value: PaymentMethod.CARD, label: t('checkout.payment.card') },
							{ value: PaymentMethod.CASH_ON_DELIVERY, label: t('checkout.payment.cod') },
							{ value: PaymentMethod.BANK_TRANSFER, label: t('checkout.payment.bank') },
						].map(({ value, label }) => (
							<FormControlLabel
								key={value}
								value={value}
								control={
									<Radio sx={{ color: tokens.ink3, '&.Mui-checked': { color: tokens.accent } }} />
								}
								label={<Typography sx={{ fontSize: 14, fontWeight: 600 }}>{label}</Typography>}
								sx={{
									border: `1px solid ${field.value === value ? tokens.accent : tokens.line}`,
									borderRadius: '10px',
									mx: 0,
									mb: 1,
									px: 1.5,
									py: 0.5,
									bgcolor: field.value === value ? tokens.accentSoft : tokens.surface,
								}}
							/>
						))}
					</RadioGroup>
				)}
			/>

			{/* Promo code */}
			<Box sx={{ mb: 3 }}>
				<Typography
					sx={{
						fontSize: 12,
						fontWeight: 700,
						letterSpacing: '0.08em',
						textTransform: 'uppercase',
						color: tokens.ink3,
						mb: 1,
					}}
				>
					{t('checkout.promo.label')}
				</Typography>
				{promoCode ? (
					<Box
						sx={{
							display: 'flex',
							alignItems: 'center',
							gap: 1,
							bgcolor: tokens.accentSoft,
							px: 2,
							py: 1.5,
							borderRadius: '10px',
						}}
					>
						<FontAwesomeIcon icon={Icons.check} size="sm" color={tokens.accentInk} />
						<Typography sx={{ fontSize: 13, fontWeight: 700, color: tokens.accentInk, flex: 1 }}>
							{t('checkout.promo.applied', { code: promoCode })}
						</Typography>
						<AppButton
							tone="ghost"
							size="small"
							onClick={() => {
								setPromoCode(null);
								setPromoDiscount(0);
							}}
							sx={{ minWidth: 'auto', fontSize: 12 }}
						>
							{t('checkout.promo.remove')}
						</AppButton>
					</Box>
				) : (
					<Box sx={{ display: 'flex', gap: 1 }}>
						<AppInput
							size="small"
							value={promoInput}
							onChange={(e) => setPromoInput(e.target.value)}
							placeholder={t('checkout.promo.placeholder')}
							error={!!promoError}
							helperText={promoError ?? undefined}
							onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleApplyPromo())}
							fullWidth={false}
							sx={{ flex: 1 }}
						/>
						<AppButton
							tone="ghost"
							size="small"
							onClick={handleApplyPromo}
							loading={promoLoading}
							sx={{ px: 2, whiteSpace: 'nowrap' }}
						>
							{t('checkout.promo.apply')}
						</AppButton>
					</Box>
				)}
			</Box>

			{/* Notes */}
			<Controller
				name="notes"
				control={control}
				defaultValue=""
				render={({ field }) => (
					<AppTextarea
						{...field}
						label={t('checkout.payment.notes')}
						placeholder={t('checkout.payment.notesPlaceholder')}
						rows={3}
						sx={{ mb: 3 }}
					/>
				)}
			/>

			{/* Mini summary */}
			<Box
				sx={{
					bgcolor: tokens.bg,
					border: `1px solid ${tokens.line}`,
					borderRadius: '10px',
					p: 2,
					mb: 3,
				}}
			>
				<Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1.5 }}>
					{t('checkout.summary.title')}
				</Typography>
				<Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
					<Typography sx={{ fontSize: 13, color: tokens.ink3 }}>
						{t('checkout.summary.subtotal')}
					</Typography>
					<Typography sx={{ fontSize: 13, fontWeight: 600 }}>${subtotal.toFixed(2)}</Typography>
				</Box>
				{promoDiscount > 0 && (
					<Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
						<Typography sx={{ fontSize: 13, color: tokens.ink3 }}>
							{t('checkout.summary.discount')}
						</Typography>
						<Typography sx={{ fontSize: 13, fontWeight: 600, color: tokens.coralInk }}>
							−${promoDiscount.toFixed(2)}
						</Typography>
					</Box>
				)}
				<Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
					<Typography sx={{ fontSize: 13, color: tokens.ink3 }}>
						{t('checkout.summary.shipping')}
					</Typography>
					<Typography sx={{ fontSize: 13, color: tokens.ink3 }}>
						{t('checkout.summary.shippingCalc')}
					</Typography>
				</Box>
				<Divider sx={{ my: 1 }} />
				<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
					<Typography sx={{ fontSize: 15, fontWeight: 700 }}>
						{t('checkout.summary.total')}
					</Typography>
					<Typography sx={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>
						${total.toFixed(2)}
					</Typography>
				</Box>
			</Box>

			{error && (
				<Typography sx={{ fontSize: 13, color: tokens.coralInk, mb: 2 }}>{error}</Typography>
			)}

			<Box sx={{ display: 'flex', gap: 1.5 }}>
				<AppButton
					tone="ghost"
					onClick={onBack}
					startIcon={<FontAwesomeIcon icon={Icons.chevronLeft} size="xs" />}
				>
					{t('checkout.back')}
				</AppButton>
				<AppButton
					tone="accent"
					type="submit"
					loading={submitting}
					endIcon={!submitting ? <FontAwesomeIcon icon={Icons.check} size="xs" /> : undefined}
				>
					{submitting ? t('checkout.processing') : t('checkout.placeOrder')}
				</AppButton>
			</Box>
		</Box>
	);
}

// ─── Step 4: Confirmation ─────────────────────────────────────────────────────

function ConfirmationStep({ order }: { order: OrderOut }) {
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

// ─── CheckoutPage ─────────────────────────────────────────────────────────────

type StepData = {
	contact: ContactForm | null;
	delivery: DeliveryForm | null;
};

export default function CheckoutPage() {
	const { t } = useTranslation();
	const [activeStep, setActiveStep] = useState(0);
	const [stepData, setStepData] = useState<StepData>({ contact: null, delivery: null });
	const [confirmedOrder, setConfirmedOrder] = useState<OrderOut | null>(null);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const cartItems = useCartStore((s) => s.items);
	const clearCart = useCartStore((s) => s.clearCart);

	const [createOrder, { loading: submitting }] = useMutation<{ createOrder: OrderOut }>(
		CREATE_ORDER_MUTATION
	);

	const steps = [
		t('checkout.step.contact'),
		t('checkout.step.delivery'),
		t('checkout.step.payment'),
	];

	const handleContact = (data: ContactForm) => {
		setStepData((p) => ({ ...p, contact: data }));
		setActiveStep(1);
	};

	const handleDelivery = (data: DeliveryForm) => {
		setStepData((p) => ({ ...p, delivery: data }));
		setActiveStep(2);
	};

	const handlePayment = async (data: PaymentForm, promoCode: string | null) => {
		setSubmitError(null);
		try {
			const { data: resp } = await createOrder({
				variables: {
					items: cartItems.map((item) => ({
						productId: item.productId,
						variantId: item.variantId ?? null,
						quantity: item.qty,
					})),
					paymentMethod: data.paymentMethod,
					deliveryMethod: stepData.delivery?.deliveryMethod ?? DeliveryMethod.COURIER,
					deliveryAddress: stepData.delivery?.deliveryAddress || undefined,
					promoCode: promoCode || undefined,
					notes: data.notes || undefined,
				},
			});
			if (resp?.createOrder) {
				clearCart();
				setConfirmedOrder(resp.createOrder);
				setActiveStep(3);
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : t('checkout.errors.generic');
			setSubmitError(msg);
		}
	};

	if (confirmedOrder) {
		return (
			<Box sx={{ maxWidth: 680, mx: 'auto', px: { xs: 2, md: 3 }, py: 4 }}>
				<ConfirmationStep order={confirmedOrder} />
			</Box>
		);
	}

	return (
		<Box sx={{ maxWidth: 800, mx: 'auto', px: { xs: 2, md: 3 }, py: 4 }}>
			<Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 4 }}>
				{t('checkout.title')}
			</Typography>

			{/* Stepper */}
			<Stepper activeStep={activeStep} sx={{ mb: 5 }}>
				{steps.map((label) => (
					<Step key={label}>
						<StepLabel>{label}</StepLabel>
					</Step>
				))}
			</Stepper>

			{/* Step content */}
			<Box
				sx={{
					bgcolor: tokens.surface,
					border: `1px solid ${tokens.line}`,
					borderRadius: '12px',
					p: 4,
				}}
			>
				{activeStep === 0 && (
					<ContactStep onNext={handleContact} defaultValues={stepData.contact} />
				)}
				{activeStep === 1 && (
					<DeliveryStep
						onNext={handleDelivery}
						onBack={() => setActiveStep(0)}
						defaultValues={stepData.delivery}
					/>
				)}
				{activeStep === 2 && (
					<PaymentStep
						onSubmit={handlePayment}
						onBack={() => setActiveStep(1)}
						submitting={submitting}
						error={submitError}
					/>
				)}
			</Box>
		</Box>
	);
}
