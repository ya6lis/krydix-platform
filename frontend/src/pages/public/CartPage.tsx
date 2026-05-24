import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Box, Typography, IconButton, Avatar } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { AppButton, AppInput, EmptyState } from '@/components/ui';
import { APPLY_PROMO_CODE_MUTATION } from '@/graphql/operations/cart';
import { useCartStore, type CartItem } from '@/store/cartStore';
import { useAuth } from '@/hooks/useAuth';
import { Icons } from '@/constants/icons';
import { ROUTES } from '@/constants/routes';
import { tokens } from '@/theme';
import type { PromoValidationResult } from '@/types/cart';

// ─── Qty Stepper ─────────────────────────────────────────────────────────────

function QtyStepper({
	qty,
	stock,
	onDecrease,
	onIncrease,
}: {
	qty: number;
	stock: number;
	onDecrease: () => void;
	onIncrease: () => void;
}) {
	return (
		<Box
			sx={{
				display: 'inline-flex',
				alignItems: 'center',
				border: `1px solid ${tokens.line}`,
				borderRadius: '10px',
				bgcolor: tokens.surface,
				userSelect: 'none',
			}}
		>
			<IconButton
				size="small"
				onClick={onDecrease}
				disabled={qty <= 1}
				sx={{ width: 32, height: 36, borderRadius: '9px 0 0 9px', color: tokens.ink2 }}
				aria-label="Decrease quantity"
			>
				<FontAwesomeIcon icon={Icons.minus} size="xs" />
			</IconButton>
			<Typography
				sx={{ width: 36, textAlign: 'center', fontWeight: 700, fontSize: 14, color: tokens.ink1 }}
			>
				{qty}
			</Typography>
			<IconButton
				size="small"
				onClick={onIncrease}
				disabled={qty >= stock}
				sx={{ width: 32, height: 36, borderRadius: '0 9px 9px 0', color: tokens.ink2 }}
				aria-label="Increase quantity"
			>
				<FontAwesomeIcon icon={Icons.add} size="xs" />
			</IconButton>
		</Box>
	);
}

// ─── Line Item ────────────────────────────────────────────────────────────────

function LineItem({ item }: { item: CartItem }) {
	const { t } = useTranslation();
	const updateQty = useCartStore((s) => s.updateQty);
	const removeItem = useCartStore((s) => s.removeItem);

	const isLowStock = item.qty < 5;

	return (
		<Box
			sx={{
				display: 'grid',
				gridTemplateColumns: '88px 1fr auto auto auto 32px',
				gap: '18px',
				alignItems: 'center',
				px: '22px',
				py: '18px',
				borderBottom: `1px solid ${tokens.line2}`,
				'&:last-of-type': { borderBottom: 0 },
			}}
		>
			{/* Thumbnail */}
			<Box
				sx={{
					width: 88,
					height: 88,
					borderRadius: '10px',
					border: `1px solid ${tokens.line}`,
					bgcolor: tokens.surface2,
					overflow: 'hidden',
					flexShrink: 0,
				}}
			>
				{item.imageUrl ? (
					<Box
						component="img"
						src={item.imageUrl}
						alt={item.name}
						sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
					/>
				) : null}
			</Box>

			{/* Product info */}
			<Box>
				<Typography
					sx={{
						fontWeight: 700,
						fontSize: 15,
						letterSpacing: '-0.01em',
						lineHeight: 1.3,
						mb: '4px',
						color: tokens.ink1,
						display: 'block',
					}}
				>
					{item.name}
				</Typography>
				{item.variant && (
					<Typography sx={{ fontSize: 12.5, color: tokens.ink3, mb: '6px' }}>
						{item.variant}
					</Typography>
				)}
				<Box sx={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
					<Typography
						sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: tokens.ink3 }}
					>
						{item.productId}
					</Typography>
					<Box
						sx={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: '4px',
							fontSize: 11.5,
							fontWeight: 700,
							color: isLowStock ? tokens.amberInk : tokens.cyanInk,
							'&::before': {
								content: '""',
								width: 5,
								height: 5,
								borderRadius: '50%',
								bgcolor: isLowStock ? tokens.amber : tokens.cyan,
							},
						}}
					>
						{isLowStock ? t('cart.lowStock', { count: item.qty }) : t('cart.inStock')}
					</Box>
				</Box>
			</Box>

			{/* Qty stepper */}
			<QtyStepper
				qty={item.qty}
				stock={99}
				onDecrease={() => updateQty(item.id, item.qty - 1)}
				onIncrease={() => updateQty(item.id, item.qty + 1)}
			/>

			{/* Unit price */}
			<Box sx={{ textAlign: 'right', minWidth: 80 }}>
				<Typography sx={{ fontSize: 14.5, fontWeight: 700, color: tokens.ink1 }}>
					${item.price.toFixed(2)}
				</Typography>
			</Box>

			{/* Total */}
			<Box sx={{ textAlign: 'right', minWidth: 90 }}>
				<Typography
					sx={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em', color: tokens.ink1 }}
				>
					${(item.price * item.qty).toFixed(2)}
				</Typography>
			</Box>

			{/* Remove */}
			<IconButton
				size="small"
				onClick={() => removeItem(item.id)}
				aria-label={t('cart.remove')}
				sx={{
					width: 32,
					height: 32,
					borderRadius: '8px',
					color: tokens.ink3,
					'&:hover': { bgcolor: tokens.coralSoft, color: tokens.coralInk },
				}}
			>
				<FontAwesomeIcon icon={Icons.delete} size="xs" />
			</IconButton>
		</Box>
	);
}

// ─── Seller Group ─────────────────────────────────────────────────────────────

function SellerGroup({ sellerId, items }: { sellerId: string; items: CartItem[] }) {
	const { t } = useTranslation();
	const sellerName = items[0]?.sellerName ?? sellerId;
	const initials = sellerName
		.split(' ')
		.map((w) => w[0])
		.join('')
		.slice(0, 2)
		.toUpperCase();
	const groupTotal = items.reduce((s, i) => s + i.price * i.qty, 0);

	return (
		<Box
			sx={{
				bgcolor: tokens.surface,
				border: `1px solid ${tokens.line}`,
				borderRadius: '12px',
				overflow: 'hidden',
				mb: 2,
			}}
		>
			{/* Seller bar */}
			<Box
				sx={{
					display: 'flex',
					alignItems: 'center',
					gap: '12px',
					px: '22px',
					py: '16px',
					borderBottom: `1px solid ${tokens.line}`,
					bgcolor: tokens.bg,
				}}
			>
				<Avatar
					sx={{
						width: 32,
						height: 32,
						fontSize: '11.5px',
						fontWeight: 700,
						bgcolor: tokens.accentSoft,
						color: tokens.accentInk,
					}}
				>
					{initials}
				</Avatar>
				<Typography sx={{ fontWeight: 700, fontSize: 14, color: tokens.ink1 }}>
					{sellerName}
				</Typography>
				<Box sx={{ ml: 'auto' }}>
					<AppButton
						tone="ghost"
						size="small"
						startIcon={<FontAwesomeIcon icon={Icons.chat} size="xs" />}
					>
						{t('cart.messageSeller')}
					</AppButton>
				</Box>
			</Box>

			{/* Line items */}
			{items.map((item) => (
				<LineItem key={item.id} item={item} />
			))}

			{/* Seller subtotal */}
			<Box
				sx={{
					px: '22px',
					py: '14px',
					bgcolor: tokens.bg,
					borderTop: `1px solid ${tokens.line}`,
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					fontSize: 13,
				}}
			>
				<Typography sx={{ fontSize: 13, color: tokens.ink3 }}>
					{t('cart.sellerSubtotal_other', { count: items.length })}
				</Typography>
				<Typography sx={{ fontSize: 13, fontWeight: 700, color: tokens.ink1 }}>
					${groupTotal.toFixed(2)}
				</Typography>
			</Box>
		</Box>
	);
}

// ─── Order Summary ────────────────────────────────────────────────────────────

function OrderSummary() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { isAuthenticated } = useAuth();

	const items = useCartStore((s) => s.items);
	const promoCode = useCartStore((s) => s.promoCode);
	const setPromoCode = useCartStore((s) => s.setPromoCode);
	const subtotal = useCartStore((s) => s.subtotal)();
	const sellerGroups = useCartStore((s) => s.sellerGroups)();
	const sellerCount = Object.keys(sellerGroups).length;

	const [promoInput, setPromoInput] = useState('');
	const [promoDiscount, setPromoDiscount] = useState(0);
	const [promoError, setPromoError] = useState<string | null>(null);

	const [applyPromo, { loading: promoLoading }] = useMutation<{
		applyPromoCode: PromoValidationResult;
	}>(APPLY_PROMO_CODE_MUTATION);

	const handleApplyPromo = async () => {
		if (!promoInput.trim()) return;
		if (!isAuthenticated) {
			navigate(ROUTES.LOGIN);
			return;
		}
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

	const handleRemovePromo = () => {
		setPromoCode(null);
		setPromoDiscount(0);
		setPromoError(null);
	};

	const total = Math.max(0, subtotal - promoDiscount);

	return (
		<Box
			component="aside"
			sx={{
				position: 'sticky',
				top: 84,
				bgcolor: tokens.surface,
				border: `1px solid ${tokens.line}`,
				borderRadius: '12px',
				overflow: 'hidden',
			}}
		>
			{/* Head */}
			<Box sx={{ px: '22px', py: '18px', borderBottom: `1px solid ${tokens.line}` }}>
				<Typography sx={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.01em' }}>
					{t('cart.summary.title')}
				</Typography>
				<Typography sx={{ fontSize: 12.5, color: tokens.ink3, mt: '3px' }}>
					{t('cart.summary.subtitle', { count: items.length, sellers: sellerCount })}
				</Typography>
			</Box>

			{/* Body */}
			<Box sx={{ px: '22px', py: '18px' }}>
				{/* Subtotal row */}
				<Box sx={{ display: 'flex', justifyContent: 'space-between', py: '7px' }}>
					<Typography sx={{ fontSize: 13.5, color: tokens.ink3 }}>
						{t('cart.summary.subtotal')}
					</Typography>
					<Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>${subtotal.toFixed(2)}</Typography>
				</Box>

				{/* Promo discount row */}
				{promoDiscount > 0 && promoCode && (
					<Box sx={{ display: 'flex', justifyContent: 'space-between', py: '7px' }}>
						<Typography sx={{ fontSize: 13.5, color: tokens.ink3 }}>
							{t('cart.summary.promo')}{' '}
							<Typography component="strong" sx={{ color: tokens.accentInk, fontWeight: 700 }}>
								{promoCode}
							</Typography>
						</Typography>
						<Typography sx={{ fontSize: 13.5, fontWeight: 600, color: tokens.coralInk }}>
							−${promoDiscount.toFixed(2)}
						</Typography>
					</Box>
				)}

				{/* Shipping row */}
				<Box sx={{ display: 'flex', justifyContent: 'space-between', py: '7px' }}>
					<Typography sx={{ fontSize: 13.5, color: tokens.ink3 }}>
						{t('cart.summary.shipping')}
					</Typography>
					<Typography sx={{ fontSize: 13.5, fontWeight: 600, color: tokens.ink3 }}>
						{t('cart.summary.shippingCalc')}
					</Typography>
				</Box>

				{/* Total row */}
				<Box
					sx={{
						display: 'flex',
						justifyContent: 'space-between',
						pt: '14px',
						mt: '6px',
						borderTop: `1px solid ${tokens.line}`,
					}}
				>
					<Typography sx={{ fontSize: 16, fontWeight: 700, color: tokens.ink1 }}>
						{t('cart.summary.total')}
					</Typography>
					<Typography
						sx={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: tokens.ink1 }}
					>
						${total.toFixed(2)}
					</Typography>
				</Box>

				{/* Promo applied badge */}
				{promoCode && promoDiscount > 0 && (
					<Box
						sx={{
							display: 'flex',
							alignItems: 'center',
							gap: '8px',
							bgcolor: tokens.accentSoft,
							color: tokens.accentInk,
							px: '12px',
							py: '8px',
							borderRadius: '10px',
							fontSize: 12.5,
							fontWeight: 700,
							mt: '18px',
						}}
					>
						<FontAwesomeIcon icon={Icons.check} size="xs" />
						<Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'inherit', flex: 1 }}>
							{promoCode} {t('cart.promo.applied', { code: '', percent: '' }).replace('  — ', '')}
						</Typography>
						<IconButton
							size="small"
							onClick={handleRemovePromo}
							aria-label={t('cart.promo.remove')}
							sx={{ color: 'inherit', p: '2px', '&:hover': { bgcolor: 'rgba(118,53,220,0.12)' } }}
						>
							<FontAwesomeIcon icon={Icons.close} size="xs" />
						</IconButton>
					</Box>
				)}

				{/* Promo input */}
				<Box sx={{ display: 'flex', gap: '8px', mt: promoCode ? '8px' : '18px', mb: '6px' }}>
					<AppInput
						size="small"
						value={promoInput}
						onChange={(e) => setPromoInput(e.target.value)}
						placeholder={
							promoCode ? t('cart.promo.anotherPlaceholder') : t('cart.promo.placeholder')
						}
						error={!!promoError}
						helperText={promoError ?? undefined}
						onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
						sx={{ flex: 1 }}
					/>
					<AppButton
						tone="ghost"
						size="small"
						onClick={handleApplyPromo}
						loading={promoLoading}
						sx={{ px: '14px', py: '9px', whiteSpace: 'nowrap' }}
					>
						{t('cart.promo.apply')}
					</AppButton>
				</Box>

				{/* Checkout button */}
				<AppButton
					tone="primary"
					fullWidth
					size="large"
					endIcon={<FontAwesomeIcon icon={Icons.arrowRight} size="xs" />}
					onClick={() => navigate(ROUTES.CHECKOUT)}
					sx={{ mt: '14px', py: '14px', fontSize: 14.5, borderRadius: '10px' }}
				>
					{t('cart.checkout')}
				</AppButton>
			</Box>

			{/* Trust badges */}
			<Box
				sx={{
					display: 'flex',
					flexDirection: 'column',
					gap: '10px',
					px: '22px',
					py: '16px',
					borderTop: `1px solid ${tokens.line}`,
					bgcolor: tokens.bg,
				}}
			>
				{[
					{ icon: Icons.lock, label: t('cart.trust.secure'), sub: t('cart.trust.secureSub') },
					{
						icon: Icons.truck,
						label: t('cart.trust.returns'),
						sub: t('cart.trust.returnsSub'),
					},
					{
						icon: Icons.shield,
						label: t('cart.trust.protection'),
						sub: t('cart.trust.protectionSub'),
					},
				].map(({ icon, label, sub }) => (
					<Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<Box sx={{ color: tokens.accent, flexShrink: 0, width: 16 }}>
							<FontAwesomeIcon icon={icon} size="sm" />
						</Box>
						<Typography sx={{ fontSize: 12, color: tokens.ink2 }}>
							<strong>{label}</strong> · {sub}
						</Typography>
					</Box>
				))}
			</Box>
		</Box>
	);
}

// ─── CartPage ─────────────────────────────────────────────────────────────────

export default function CartPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const items = useCartStore((s) => s.items);
	const sellerGroups = useCartStore((s) => s.sellerGroups)();
	const sellerCount = Object.keys(sellerGroups).length;

	if (items.length === 0) {
		return (
			<Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 2, md: 3 }, py: 4 }}>
				<EmptyState
					icon={Icons.cart}
					title={t('cart.empty')}
					description={t('cart.emptyDesc')}
					actionLabel={t('cart.browseProducts')}
					onAction={() => navigate(ROUTES.PRODUCTS)}
				/>
			</Box>
		);
	}

	return (
		<Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 2, md: 3 }, py: 4 }}>
			{/* Page header */}
			<Box
				sx={{
					display: 'flex',
					alignItems: 'flex-start',
					justifyContent: 'space-between',
					mb: 3,
					flexWrap: 'wrap',
					gap: 1,
				}}
			>
				<Box>
					<Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
						{t('cart.title')}
					</Typography>
					<Typography sx={{ fontSize: 14, color: tokens.ink3, mt: '4px' }}>
						{t('cart.subtitle', { count: items.length, sellers: sellerCount })}
					</Typography>
				</Box>
				<AppButton
					tone="ghost"
					onClick={() => navigate(ROUTES.PRODUCTS)}
					startIcon={<FontAwesomeIcon icon={Icons.chevronLeft} size="xs" />}
				>
					{t('cart.continueShopping')}
				</AppButton>
			</Box>

			{/* Grid: items | summary */}
			<Box
				sx={{
					display: 'grid',
					gridTemplateColumns: { xs: '1fr', lg: '1fr 400px' },
					gap: '28px',
					alignItems: 'start',
				}}
			>
				{/* Left: seller groups */}
				<Box>
					{Object.entries(sellerGroups).map(([sid, grpItems]) => (
						<SellerGroup key={sid} sellerId={sid} items={grpItems} />
					))}
				</Box>

				{/* Right: summary */}
				<OrderSummary />
			</Box>
		</Box>
	);
}
