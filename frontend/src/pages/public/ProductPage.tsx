import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Stack, Divider } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
	AppLoader,
	EmptyState,
	AppCard,
	AppTabs,
	StatusBadge,
	AppBreadcrumbs,
} from '@/components/ui';
import { PRODUCT_QUERY } from '@/graphql/operations/catalog';
import { Icons } from '@/constants/icons';
import { ROUTES } from '@/constants/routes';
import { tokens } from '@/theme';
import type { CatalogProduct, CatalogProductVariant } from '@/types/catalog';

function formatPrice(value: number): string {
	return `$${value.toFixed(2)}`;
}

function variantLabel(variant: CatalogProductVariant): string {
	const values = Object.values(variant.options).filter(Boolean);
	return values.length > 0 ? values.join(' · ') : (variant.sku ?? '—');
}

export default function ProductPage() {
	const { t, i18n } = useTranslation();
	const language = i18n.language === 'uk' ? 'UK' : 'EN';
	const { slug = '' } = useParams();

	const [activeImage, setActiveImage] = useState(0);
	const [variantId, setVariantId] = useState<string | null>(null);
	const [tab, setTab] = useState('description');

	const { data, loading } = useQuery<{ product: CatalogProduct | null }>(PRODUCT_QUERY, {
		variables: { slug, language },
	});

	if (loading) return <AppLoader fullPage />;

	const product = data?.product;
	if (!product) {
		return (
			<Box sx={{ maxWidth: 1300, mx: 'auto', px: { xs: 2, md: 4 }, py: 8 }}>
				<EmptyState
					icon={Icons.products}
					title={t('product.notFound.title')}
					description={t('product.notFound.description')}
				/>
			</Box>
		);
	}

	const images = product.media.length > 0 ? product.media : [];
	const selectedVariant =
		product.variants.find((v) => v.id === variantId) ?? product.variants[0] ?? null;
	const price = selectedVariant?.price ?? product.basePrice;
	const stock = selectedVariant ? selectedVariant.stock : product.totalStock;

	const tabs = [
		{ value: 'description', label: t('product.tabs.description') },
		{ value: 'specifications', label: t('product.tabs.specifications') },
		{ value: 'reviews', label: t('product.tabs.reviews'), count: product.reviewCount },
	];

	return (
		<Box sx={{ maxWidth: 1300, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
			<Box sx={{ mb: 2 }}>
				<AppBreadcrumbs
					items={[
						{ label: t('nav.products'), href: ROUTES.PRODUCTS },
						...(product.categories[0]
							? [{ label: product.categories[0].name, href: ROUTES.PRODUCTS }]
							: []),
						{ label: product.title },
					]}
				/>
			</Box>

			<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' }, gap: 4.5 }}>
				{/* Gallery */}
				<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '72px 1fr' }, gap: 1.5 }}>
					<Stack
						spacing={1.25}
						sx={{ order: { xs: 2, sm: 1 } }}
						direction={{ xs: 'row', sm: 'column' }}
					>
						{images.map((media, index) => (
							<Box
								key={media.id}
								component="button"
								type="button"
								onClick={() => setActiveImage(index)}
								sx={{
									p: 0,
									cursor: 'pointer',
									aspectRatio: '1',
									width: 72,
									borderRadius: 2,
									overflow: 'hidden',
									bgcolor: tokens.surface2,
									border: '2px solid',
									borderColor: index === activeImage ? 'text.primary' : 'divider',
								}}
							>
								<Box
									component="img"
									src={media.url}
									alt=""
									sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
								/>
							</Box>
						))}
					</Stack>
					<Box
						sx={{
							order: { xs: 1, sm: 2 },
							aspectRatio: '1',
							borderRadius: 3.5,
							overflow: 'hidden',
							bgcolor: tokens.surface2,
							display: 'grid',
							placeItems: 'center',
						}}
					>
						{images[activeImage] ? (
							<Box
								component="img"
								src={images[activeImage].url}
								alt={product.title}
								sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
							/>
						) : (
							<FontAwesomeIcon icon={Icons.image} style={{ fontSize: 40, color: tokens.ink3 }} />
						)}
					</Box>
				</Box>

				{/* Info */}
				<Box>
					<Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1 }}>
						{product.seller.name}
					</Typography>
					<Typography
						component="h1"
						sx={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15 }}
					>
						{product.title}
					</Typography>

					<Stack
						direction="row"
						alignItems="center"
						spacing={1.5}
						sx={{ mt: 1.5, mb: 2.25, color: 'text.secondary', fontSize: 13 }}
					>
						<Box component="span" sx={{ color: tokens.amber, fontWeight: 700 }}>
							{product.rating.toFixed(1)} ★
						</Box>
						<span>{t('product.reviewCount', { count: product.reviewCount })}</span>
						<span>·</span>
						<Box component="span" sx={{ fontFamily: tokens.fontMono, fontSize: 12.5 }}>
							{product.sku}
						</Box>
					</Stack>

					<Typography sx={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em' }}>
						{formatPrice(price)}
					</Typography>
					<Box sx={{ mt: 1, mb: 3 }}>
						<StatusBadge
							status={stock > 0 ? 'APPROVED' : 'BLOCKED'}
							label={
								stock > 0 ? t('product.inStockCount', { count: stock }) : t('product.outOfStock')
							}
						/>
					</Box>

					{product.variants.length > 0 && (
						<Box sx={{ mb: 3 }}>
							<Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.secondary', mb: 1 }}>
								{t('product.variant')}
							</Typography>
							<Stack direction="row" flexWrap="wrap" gap={1}>
								{product.variants.map((variant) => {
									const active = variant.id === (selectedVariant?.id ?? '');
									return (
										<Box
											key={variant.id}
											component="button"
											type="button"
											onClick={() => setVariantId(variant.id)}
											sx={{
												cursor: 'pointer',
												px: 1.75,
												py: 1,
												borderRadius: 2,
												fontFamily: 'inherit',
												fontSize: 13.5,
												fontWeight: 600,
												border: '1px solid',
												borderColor: active ? 'text.primary' : 'divider',
												bgcolor: active ? 'text.primary' : 'background.paper',
												color: active ? 'background.paper' : 'text.secondary',
											}}
										>
											{variantLabel(variant)}
										</Box>
									);
								})}
							</Stack>
						</Box>
					)}

					<AppCard>
						<Stack spacing={1.5}>
							{[
								{ icon: Icons.shield, text: t('product.trust.verified') },
								{ icon: Icons.truck, text: t('product.trust.delivery') },
								{ icon: Icons.checkCircle, text: t('product.trust.returns') },
							].map((item) => (
								<Stack key={item.text} direction="row" spacing={1.5} alignItems="center">
									<Box sx={{ color: 'primary.main', fontSize: 16, width: 20, textAlign: 'center' }}>
										<FontAwesomeIcon icon={item.icon} />
									</Box>
									<Typography sx={{ fontSize: 13 }}>{item.text}</Typography>
								</Stack>
							))}
						</Stack>
					</AppCard>
				</Box>
			</Box>

			{/* Tabs */}
			<Box sx={{ mt: 6 }}>
				<AppTabs tabs={tabs} value={tab} onChange={setTab} />
				<Box sx={{ mt: 3 }}>
					{tab === 'description' && (
						<AppCard>
							<Typography
								sx={{
									fontSize: 14,
									color: 'text.primary',
									lineHeight: 1.7,
									whiteSpace: 'pre-line',
								}}
							>
								{product.description || t('product.noDescription')}
							</Typography>
						</AppCard>
					)}
					{tab === 'specifications' && (
						<AppCard>
							<Box
								component="dl"
								sx={{ display: 'grid', gridTemplateColumns: '160px 1fr', rowGap: 1.25, m: 0 }}
							>
								{[
									{ k: t('product.specs.brand'), v: product.brand ?? '—' },
									{ k: t('product.specs.sku'), v: product.sku },
									{
										k: t('product.specs.category'),
										v: product.categories.map((c) => c.name).join(', ') || '—',
									},
									{
										k: t('product.specs.availability'),
										v: t('product.inStockCount', { count: product.totalStock }),
									},
								].map((row) => (
									<Box key={row.k} sx={{ display: 'contents' }}>
										<Box component="dt" sx={{ fontSize: 13.5, color: 'text.secondary' }}>
											{row.k}
										</Box>
										<Box component="dd" sx={{ fontSize: 13.5, fontWeight: 500, m: 0 }}>
											{row.v}
										</Box>
									</Box>
								))}
							</Box>
						</AppCard>
					)}
					{tab === 'reviews' && (
						<AppCard>
							<Stack direction="row" spacing={4} alignItems="center">
								<Box textAlign="center">
									<Typography sx={{ fontSize: 48, fontWeight: 800, lineHeight: 1 }}>
										{product.rating.toFixed(1)}
									</Typography>
									<Box sx={{ color: tokens.amber, fontSize: 16, mt: 0.5 }}>★★★★★</Box>
								</Box>
								<Divider orientation="vertical" flexItem />
								<Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>
									{t('product.reviewsSummary', { count: product.reviewCount })}
								</Typography>
							</Stack>
						</AppCard>
					)}
				</Box>
			</Box>
		</Box>
	);
}
