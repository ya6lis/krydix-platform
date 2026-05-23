import { Box, Card, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Icons } from '@/constants/icons';
import { ROUTES } from '@/constants/routes';
import { tokens } from '@/theme';
import type { CatalogProduct } from '@/types/catalog';

const NEW_PRODUCT_DAYS = 14;
const LOW_STOCK_THRESHOLD = 5;

export interface ProductCardProps {
	product: CatalogProduct;
}

function formatPrice(value: number): string {
	return `$${value.toFixed(2)}`;
}

/** Product grid card — links to the product detail page (Catalog.html → .product). */
export function ProductCard({ product }: ProductCardProps) {
	const { t } = useTranslation();

	const isNew =
		Date.now() - new Date(product.createdAt).getTime() < NEW_PRODUCT_DAYS * 24 * 60 * 60 * 1000;
	const outOfStock = product.totalStock === 0;
	const lowStock = !outOfStock && product.totalStock < LOW_STOCK_THRESHOLD;

	const badge = outOfStock
		? { label: t('catalog.outOfStock'), bg: tokens.coral, fg: '#fff' }
		: lowStock
			? { label: t('catalog.lowStock'), bg: tokens.amber, fg: tokens.amberInk }
			: isNew
				? { label: t('catalog.new'), bg: tokens.accent, fg: '#fff' }
				: null;

	return (
		<Card
			data-cy="product-card"
			component={RouterLink}
			to={ROUTES.PRODUCT(product.slug)}
			sx={{
				display: 'flex',
				flexDirection: 'column',
				textDecoration: 'none',
				color: 'inherit',
				overflow: 'hidden',
				transition: 'border-color 120ms, transform 120ms, box-shadow 120ms',
				'&:hover': { borderColor: 'text.disabled', boxShadow: 2, transform: 'translateY(-2px)' },
			}}
		>
			<Box
				sx={{
					position: 'relative',
					aspectRatio: '1.1 / 1',
					bgcolor: tokens.surface2,
					display: 'grid',
					placeItems: 'center',
				}}
			>
				{product.mainImage ? (
					<Box
						component="img"
						src={product.mainImage}
						alt={product.title}
						loading="lazy"
						sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
					/>
				) : (
					<FontAwesomeIcon icon={Icons.image} style={{ fontSize: 28, color: tokens.ink3 }} />
				)}
				{badge && (
					<Box
						sx={{
							position: 'absolute',
							top: 12,
							left: 12,
							fontSize: 10.5,
							fontWeight: 700,
							letterSpacing: '0.04em',
							px: 1,
							py: 0.375,
							borderRadius: '4px',
							bgcolor: badge.bg,
							color: badge.fg,
						}}
					>
						{badge.label}
					</Box>
				)}
			</Box>

			<Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
				<Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
					{product.seller.name}
				</Typography>
				<Typography sx={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.3 }}>
					{product.title}
				</Typography>
				<Box
					sx={{
						display: 'flex',
						alignItems: 'center',
						gap: 1,
						fontSize: 12,
						color: 'text.secondary',
					}}
				>
					<Box
						component="span"
						sx={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: 0.5,
							color: tokens.amber,
							fontWeight: 700,
						}}
					>
						{product.rating.toFixed(1)}
						<FontAwesomeIcon icon={Icons.star} style={{ fontSize: 11 }} />
						<Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>
							({product.reviewCount})
						</Box>
					</Box>
					<span>·</span>
					<span>{t('catalog.inStockCount', { count: product.totalStock })}</span>
				</Box>
				<Typography
					sx={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em', mt: 'auto', pt: 1 }}
				>
					{formatPrice(product.basePrice)}
				</Typography>
			</Box>
		</Card>
	);
}
