import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Icons } from '@/constants/icons';
import { ROUTES } from '@/constants/routes';
import { tokens } from '@/theme';
import { useCartStore } from '@/store/cartStore';
import { useAppToast } from '@/components/ui';
import type { CatalogProduct } from '@/types/catalog';

const NEW_PRODUCT_DAYS = 14;
const LOW_STOCK_THRESHOLD = 5;

export interface ProductCardProps {
	product: CatalogProduct;
}

function formatPrice(value: number): string {
	return `$${value.toFixed(2)}`;
}

/** Hatched placeholder pattern — mirrors .media background in Catalog.html */
const HATCH = `repeating-linear-gradient(135deg, ${tokens.surface2} 0 6px, transparent 6px 12px), ${tokens.surface2}`;

/** Product grid card — matches Catalog.html .product design exactly. */
export function ProductCard({ product }: ProductCardProps) {
	const { t } = useTranslation();
	const [wishlisted, setWishlisted] = useState(false);
	const addItem = useCartStore((s) => s.addItem);
	const cartItems = useCartStore((s) => s.items);
	const { showToast } = useAppToast();

	const handleAddToCart = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		const itemId = product.id;
		const itemStock = product.totalStock;
		const itemPrice = product.basePrice;

		if (itemStock === 0) {
			showToast(t('cart.errors.outOfStock'), 'error');
			return;
		}
		const existing = cartItems.find((i) => i.id === itemId);
		if (existing && existing.qty >= itemStock) {
			showToast(t('cart.errors.insufficientStock', { count: itemStock }), 'error');
			return;
		}
		addItem({
			id: itemId,
			productId: product.id,
			sellerId: product.seller.id,
			sellerName: product.seller.name,
			name: product.title,
			price: itemPrice,
			qty: 1,
			stock: itemStock,
			imageUrl: product.mainImage ?? undefined,
		});
		showToast(t('cart.addedToCart', { name: product.title }), 'success');
	};

	const isNew =
		Date.now() - new Date(product.createdAt).getTime() < NEW_PRODUCT_DAYS * 24 * 60 * 60 * 1000;
	const outOfStock = product.totalStock === 0;
	const lowStock = !outOfStock && product.totalStock < LOW_STOCK_THRESHOLD;

	const onSale =
		product.comparePrice !== null &&
		product.comparePrice !== undefined &&
		product.comparePrice > product.basePrice;
	const discountPct = onSale
		? Math.round(((product.comparePrice! - product.basePrice) / product.comparePrice!) * 100)
		: 0;

	const badge = outOfStock
		? { label: t('catalog.outOfStock'), bg: tokens.ink3, fg: '#fff' }
		: onSale
			? { label: `−${discountPct}%`, bg: tokens.coral, fg: '#fff' }
			: lowStock
				? { label: t('catalog.lowStock'), bg: tokens.amber, fg: tokens.amberInk }
				: isNew
					? { label: t('catalog.new'), bg: tokens.accent, fg: '#fff' }
					: null;

	return (
		<Box
			data-cy="product-card"
			component={RouterLink}
			to={ROUTES.PRODUCT(product.slug)}
			sx={{
				display: 'flex',
				flexDirection: 'column',
				width: '100%',
				maxWidth: 280,
				minHeight: 430,
				margin: '0 auto',
				textDecoration: 'none',
				color: 'inherit',
				background: tokens.surface,
				border: `1px solid ${tokens.line}`,
				borderRadius: `${tokens.radius}px`,
				overflow: 'hidden',
				transition: 'border-color 120ms, transform 120ms, box-shadow 120ms',
				'&:hover': {
					borderColor: tokens.ink3,
					boxShadow: tokens.shadowMd,
					transform: 'translateY(-2px)',
				},
				'& *': { textDecoration: 'none' },
			}}
		>
			{/* ── media ── */}
			<Box
				sx={{
					position: 'relative',
					aspectRatio: '1.1 / 1',
					background: product.mainImage ? tokens.surface2 : HATCH,
					display: 'grid',
					placeItems: 'center',
					color: tokens.ink3,
					fontFamily: tokens.fontMono,
					fontSize: 11,
					overflow: 'hidden',
				}}
			>
				{product.mainImage && (
					<Box
						component="img"
						src={product.mainImage}
						alt={product.title}
						loading="lazy"
						sx={{
							position: 'absolute',
							inset: 0,
							width: '100%',
							height: '100%',
							objectFit: 'cover',
						}}
					/>
				)}

				{/* badge-row: left badge + right wishlist */}
				<Box
					sx={{
						position: 'absolute',
						top: 12,
						left: 12,
						right: 12,
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'flex-start',
						gap: 1,
						zIndex: 1,
					}}
				>
					{badge ? (
						<Box
							sx={{
								background: badge.bg,
								color: badge.fg,
								fontSize: 10.5,
								fontWeight: 700,
								padding: '3px 8px',
								borderRadius: '4px',
								letterSpacing: '0.04em',
							}}
						>
							{badge.label}
						</Box>
					) : (
						<Box />
					)}
					<Box
						component="button"
						onClick={(e: React.MouseEvent) => {
							e.preventDefault();
							e.stopPropagation();
							setWishlisted((w) => !w);
						}}
						aria-label={wishlisted ? t('product.removeFromWishlist') : t('product.addToWishlist')}
						sx={{
							background: tokens.surface,
							color: wishlisted ? tokens.coral : tokens.ink2,
							border: 'none',
							width: 28,
							height: 28,
							borderRadius: '50%',
							display: 'grid',
							placeItems: 'center',
							cursor: 'pointer',
							boxShadow: tokens.shadowSm,
							fontSize: 13,
							flexShrink: 0,
							transition: 'color 120ms',
						}}
					>
						<FontAwesomeIcon icon={wishlisted ? Icons.heart : Icons.heartEmpty} />
					</Box>
				</Box>
			</Box>

			{/* ── body ── */}
			<Box sx={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
				{/* seller + verified icon */}
				<Box
					sx={{
						display: 'flex',
						alignItems: 'center',
						gap: '6px',
						fontSize: 11.5,
						color: tokens.ink3,
					}}
				>
					{product.seller.name}
					<Box component="span" sx={{ color: tokens.cyan, display: 'inline-flex', fontSize: 10 }}>
						<FontAwesomeIcon icon={Icons.checkCircle} />
					</Box>
				</Box>

				{/* product name */}
				<Typography
					sx={{
						fontSize: 14.5,
						fontWeight: 700,
						lineHeight: 1.3,
						color: tokens.ink1,
						display: '-webkit-box',
						WebkitLineClamp: 2,
						WebkitBoxOrient: 'vertical',
						overflow: 'hidden',
						minHeight: '36px',
					}}
				>
					{product.title}
				</Typography>

				{/* rating + stock */}
				<Box
					sx={{
						display: 'flex',
						alignItems: 'center',
						gap: '10px',
						fontSize: 12,
						color: tokens.ink3,
					}}
				>
					<Box
						component="span"
						sx={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: '4px',
							color: tokens.amber,
							fontWeight: 700,
						}}
					>
						{product.rating.toFixed(1)} ★
						<Box component="span" sx={{ color: tokens.ink3, fontWeight: 500 }}>
							({product.reviewCount})
						</Box>
					</Box>
					<span>·</span>
					<span>{t('catalog.inStockCount', { count: product.totalStock })}</span>
				</Box>

				{/* price row */}
				<Box sx={{ display: 'flex', alignItems: 'baseline', gap: '8px', mt: 'auto', pt: '4px' }}>
					<Typography
						sx={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em', color: tokens.ink1 }}
					>
						{formatPrice(product.basePrice)}
					</Typography>
					{onSale && (
						<Typography
							sx={{
								fontSize: 13,
								color: tokens.ink3,
								textDecoration: 'line-through',
							}}
						>
							{formatPrice(product.comparePrice!)}
						</Typography>
					)}
				</Box>

				{/* CTA row */}
				<Box sx={{ display: 'flex', gap: '8px', mt: 'auto', pt: '12px' }}>
					<Box
						sx={{
							flex: 1,
							display: 'grid',
							placeItems: 'center',
							padding: '6px 10px',
							borderRadius: '8px',
							border: `1px solid ${tokens.line}`,
							background: tokens.surface,
							color: tokens.ink1,
							fontSize: 12.5,
							fontWeight: 600,
							textDecoration: 'none',
							transition: 'border-color 120ms',
							'&:hover': { borderColor: tokens.ink3 },
						}}
					>
						{t('catalog.quickView')}
					</Box>
					<Box
						component="button"
						onClick={handleAddToCart}
						sx={{
							flex: 1,
							display: 'grid',
							placeItems: 'center',
							padding: '6px 10px',
							borderRadius: '8px',
							border: 'none',
							background: tokens.accent,
							color: '#fff',
							fontSize: 12.5,
							fontWeight: 600,
							cursor: 'pointer',
							transition: 'opacity 120ms',
							'&:hover': { opacity: 0.88 },
						}}
					>
						{t('product.addToCart')}
					</Box>
				</Box>
			</Box>
		</Box>
	);
}
