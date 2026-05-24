import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Stack } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { AppLoader, EmptyState, AppCard, AppTabs, AppButton, useAppToast } from '@/components/ui';
import { PRODUCT_QUERY } from '@/graphql/operations/catalog';
import { Icons } from '@/constants/icons';
import { ROUTES } from '@/constants/routes';
import { tokens } from '@/theme';
import { useCartStore } from '@/store/cartStore';
import type { CatalogProduct, CatalogProductVariant } from '@/types/catalog';

// ─── constants ────────────────────────────────────────────────────────────────

const QTY_MIN = 1;

const SWATCH_COLORS: Record<string, string> = {
	Olive: '#38503a',
	Charcoal: '#2a2e35',
	Sand: '#c4a37a',
	Rust: '#8b3a2a',
	Natural: '#d4c5a9',
	Black: '#1a1a1a',
	White: '#f0ede8',
	Navy: '#1e2d5a',
	Grey: '#8a8a8a',
	Gray: '#8a8a8a',
	Brown: '#6b4226',
	Beige: '#d9c5a9',
	Red: '#c0392b',
	Blue: '#2980b9',
	Green: '#27ae60',
};

// ─── helpers ──────────────────────────────────────────────────────────────────

type SelectedOptions = Record<string, string>;
type OptionGroups = Record<string, string[]>;

function formatPrice(value: number): string {
	return `$${value.toFixed(2)}`;
}

function buildOptionGroups(variants: CatalogProductVariant[]): OptionGroups {
	const groups: OptionGroups = {};
	for (const v of variants) {
		for (const [k, val] of Object.entries(v.options)) {
			if (!groups[k]) groups[k] = [];
			const s = String(val);
			if (!groups[k].includes(s)) groups[k].push(s);
		}
	}
	return groups;
}

function getInitialOptions(variants: CatalogProductVariant[]): SelectedOptions {
	const first = variants[0];
	if (!first) return {};
	return Object.fromEntries(Object.entries(first.options).map(([k, v]) => [k, String(v)]));
}

function findVariant(
	variants: CatalogProductVariant[],
	selected: SelectedOptions
): CatalogProductVariant | null {
	return (
		variants.find((v) =>
			Object.entries(selected).every(([k, val]) => String(v.options[k]) === val)
		) ?? null
	);
}

function isOptionAvailable(
	variants: CatalogProductVariant[],
	selected: SelectedOptions,
	key: string,
	value: string
): boolean {
	const test = { ...selected, [key]: value };
	return variants.some((v) =>
		Object.entries(test).every(([k, val]) => String(v.options[k]) === val)
	);
}

function sellerInitials(name: string): string {
	return name
		.split(' ')
		.map((w) => w[0])
		.slice(0, 2)
		.join('')
		.toUpperCase();
}

// ─── sub-components ───────────────────────────────────────────────────────────

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
	return (
		<Box sx={{ display: 'inline-flex', gap: 0.25, color: tokens.amber }}>
			{Array.from({ length: 5 }, (_, i) => {
				const diff = rating - i;
				const icon = diff >= 1 ? Icons.star : diff >= 0.5 ? Icons.starHalf : Icons.starEmpty;
				return <FontAwesomeIcon key={i} icon={icon} style={{ fontSize: size }} />;
			})}
		</Box>
	);
}

// ─── component ────────────────────────────────────────────────────────────────

export default function ProductPage() {
	const { t, i18n } = useTranslation();
	const language = i18n.language === 'uk' ? 'UK' : 'EN';
	const { slug = '' } = useParams();
	const navigate = useNavigate();
	const addItem = useCartStore((s) => s.addItem);
	const cartItems = useCartStore((s) => s.items);
	const { showToast } = useAppToast();

	const [activeImage, setActiveImage] = useState(0);
	const [tab, setTab] = useState('description');
	const [qty, setQty] = useState(1);
	const [wishlisted, setWishlisted] = useState(false);
	const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>({});
	const initializedRef = useRef(false);

	const { data, loading } = useQuery<{ product: CatalogProduct | null }>(PRODUCT_QUERY, {
		variables: { slug, language },
	});

	useEffect(() => {
		const variants = data?.product?.variants;
		if (variants && variants.length > 0 && !initializedRef.current) {
			setSelectedOptions(getInitialOptions(variants));
			initializedRef.current = true;
		}
	}, [data]);

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

	const images = product.media;
	const optionGroups = buildOptionGroups(product.variants);
	const selectedVariant = findVariant(product.variants, selectedOptions);
	const price = selectedVariant?.price ?? product.basePrice;
	const stock = selectedVariant?.stock ?? product.totalStock;

	const selectOption = (key: string, value: string) =>
		setSelectedOptions((prev) => ({ ...prev, [key]: value }));

	const prevImage = () =>
		setActiveImage((i) => (i - 1 + Math.max(images.length, 1)) % Math.max(images.length, 1));
	const nextImage = () => setActiveImage((i) => (i + 1) % Math.max(images.length, 1));

	const handleAddToCart = () => {
		if (!product) return;
		if (stock === 0) {
			showToast(t('cart.errors.outOfStock'), 'error');
			return;
		}
		const itemId = selectedVariant?.id ?? product.id;
		const existing = cartItems.find((i) => i.id === itemId);
		const existingQty = existing?.qty ?? 0;
		if (existingQty + qty > stock) {
			showToast(t('cart.errors.insufficientStock', { count: stock - existingQty }), 'error');
			return;
		}
		const variantLabel =
			Object.keys(selectedOptions).length > 0
				? Object.entries(selectedOptions)
						.map(([, v]) => v)
						.join(' / ')
				: undefined;
		addItem({
			id: itemId,
			productId: product.id,
			variantId: selectedVariant?.id,
			sellerId: product.seller.id,
			sellerName: product.seller.name,
			name: product.title,
			variant: variantLabel,
			price,
			qty,
			stock,
			imageUrl: images[activeImage]?.url ?? product.mainImage ?? undefined,
		});
		showToast(t('cart.addedToCart', { name: product.title }), 'success');
	};

	const tabs = [
		{ value: 'description', label: t('product.tabs.description') },
		{ value: 'specifications', label: t('product.tabs.specifications') },
		{ value: 'reviews', label: t('product.tabs.reviews'), count: product.reviewCount },
		{ value: 'qa', label: t('product.tabs.qa') },
		{ value: 'shipping', label: t('product.tabs.shipping') },
	];

	const trustItems = [
		{
			icon: Icons.shield,
			title: t('product.trust.verifiedTitle'),
			sub: t('product.trust.verifiedSub'),
		},
		{
			icon: Icons.truck,
			title: t('product.trust.deliveryTitle'),
			sub: t('product.trust.deliverySub'),
		},
		{
			icon: Icons.checkCircle,
			title: t('product.trust.returnsTitle'),
			sub: t('product.trust.returnsSub'),
		},
	];

	const specRows = [
		{ k: t('product.specs.brand'), v: product.brand ?? '—' },
		{ k: t('product.specs.sku'), v: product.sku },
		{ k: t('product.specs.category'), v: product.categories.map((c) => c.name).join(', ') || '—' },
		{
			k: t('product.specs.availability'),
			v: stock > 0 ? t('product.inStockCount', { count: stock }) : t('product.outOfStock'),
		},
	];
	const half = Math.ceil(specRows.length / 2);
	const specCols = [specRows.slice(0, half), specRows.slice(half)];

	return (
		<Box sx={{ maxWidth: 1300, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
			{/* ── product top ──────────────────────────────────────────────── */}
			<Box
				sx={{
					display: 'grid',
					gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' },
					gap: 4.5,
					alignItems: 'start',
				}}
			>
				{/* GALLERY */}
				<Box
					sx={{
						display: 'grid',
						gridTemplateColumns: { xs: '1fr', sm: '72px 1fr' },
						gap: 1.5,
					}}
				>
					{/* Thumbnails */}
					<Stack
						spacing={1.25}
						sx={{ order: { xs: 2, sm: 1 } }}
						direction={{ xs: 'row', sm: 'column' }}
					>
						{images.length > 0 ? (
							images.map((media, index) => (
								<Box
									key={media.id}
									component="button"
									type="button"
									onClick={() => setActiveImage(index)}
									sx={{
										p: 0,
										cursor: 'pointer',
										flexShrink: 0,
										aspectRatio: '1',
										width: 72,
										borderRadius: 2.5,
										overflow: 'hidden',
										bgcolor: tokens.surface2,
										border: '2px solid',
										borderColor: index === activeImage ? tokens.ink1 : tokens.line,
									}}
								>
									<Box
										component="img"
										src={media.url}
										alt=""
										sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
									/>
								</Box>
							))
						) : (
							<Box
								sx={{
									width: 72,
									aspectRatio: '1',
									borderRadius: 2.5,
									bgcolor: tokens.surface2,
									border: `1px solid ${tokens.line}`,
									display: 'grid',
									placeItems: 'center',
								}}
							>
								<FontAwesomeIcon icon={Icons.image} style={{ fontSize: 18, color: tokens.ink3 }} />
							</Box>
						)}
					</Stack>

					{/* Main image */}
					<Box
						sx={{
							order: { xs: 1, sm: 2 },
							position: 'relative',
							aspectRatio: '1',
							borderRadius: `${tokens.radius}px`,
							overflow: 'hidden',
							bgcolor: tokens.surface2,
							border: `1px solid ${tokens.line}`,
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
						{images.length > 1 && (
							<>
								<Box
									component="button"
									type="button"
									aria-label="Previous"
									onClick={prevImage}
									sx={{
										position: 'absolute',
										left: 14,
										top: '50%',
										transform: 'translateY(-50%)',
										width: 36,
										height: 36,
										borderRadius: '50%',
										bgcolor: tokens.surface,
										border: `1px solid ${tokens.line}`,
										color: tokens.ink2,
										display: 'grid',
										placeItems: 'center',
										cursor: 'pointer',
										boxShadow: tokens.shadowSm,
										'&:hover': { borderColor: tokens.ink3, color: tokens.ink1 },
									}}
								>
									<FontAwesomeIcon icon={Icons.chevronLeft} style={{ fontSize: 14 }} />
								</Box>
								<Box
									component="button"
									type="button"
									aria-label="Next"
									onClick={nextImage}
									sx={{
										position: 'absolute',
										right: 14,
										top: '50%',
										transform: 'translateY(-50%)',
										width: 36,
										height: 36,
										borderRadius: '50%',
										bgcolor: tokens.surface,
										border: `1px solid ${tokens.line}`,
										color: tokens.ink2,
										display: 'grid',
										placeItems: 'center',
										cursor: 'pointer',
										boxShadow: tokens.shadowSm,
										'&:hover': { borderColor: tokens.ink3, color: tokens.ink1 },
									}}
								>
									<FontAwesomeIcon icon={Icons.chevronRight} style={{ fontSize: 14 }} />
								</Box>
							</>
						)}
					</Box>
				</Box>

				{/* INFO */}
				<Box>
					{/* Mini breadcrumbs */}
					<Box
						sx={{
							fontSize: 12.5,
							color: 'text.secondary',
							mb: 1.75,
							display: 'flex',
							alignItems: 'center',
							flexWrap: 'wrap',
							gap: 0.5,
						}}
					>
						<Box
							component={RouterLink}
							to={ROUTES.PRODUCTS}
							sx={{
								color: tokens.ink2,
								textDecoration: 'none',
								'&:hover': { textDecoration: 'underline' },
							}}
						>
							{t('nav.products')}
						</Box>
						{product.categories.map((cat) => (
							<Box key={cat.id} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
								<Box component="span" sx={{ opacity: 0.5, mx: 0.25 }}>
									/
								</Box>
								<Box
									component={RouterLink}
									to={ROUTES.PRODUCTS}
									sx={{
										color: tokens.ink2,
										textDecoration: 'none',
										'&:hover': { textDecoration: 'underline' },
									}}
								>
									{cat.name}
								</Box>
							</Box>
						))}
						<Box component="span" sx={{ opacity: 0.5, mx: 0.25 }}>
							/
						</Box>
						<Box component="span" sx={{ color: tokens.ink1 }}>
							{product.title}
						</Box>
					</Box>

					{/* Seller row */}
					<Box
						sx={{
							display: 'flex',
							alignItems: 'center',
							gap: 1.25,
							px: 1.75,
							py: 1.25,
							bgcolor: tokens.bg,
							border: `1px solid ${tokens.line}`,
							borderRadius: 2.5,
							mb: 2,
						}}
					>
						<Box
							sx={{
								width: 28,
								height: 28,
								borderRadius: '50%',
								bgcolor: tokens.accentSoft,
								color: tokens.accentInk,
								display: 'grid',
								placeItems: 'center',
								fontSize: 10,
								fontWeight: 700,
								flexShrink: 0,
								fontFamily: 'inherit',
							}}
						>
							{sellerInitials(product.seller.name)}
						</Box>
						<Box sx={{ flex: 1, minWidth: 0 }}>
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.625 }}>
								<Box
									component={RouterLink}
									to={ROUTES.SELLER_PUBLIC(product.seller.id)}
									sx={{
										fontWeight: 700,
										fontSize: 13,
										color: tokens.ink1,
										textDecoration: 'none',
										'&:hover': { color: 'primary.main' },
									}}
								>
									{product.seller.name}
								</Box>
								<Box sx={{ color: tokens.cyan, fontSize: 12, display: 'inline-flex' }}>
									<FontAwesomeIcon icon={Icons.checkCircle} />
								</Box>
							</Box>
							<Box sx={{ color: 'text.secondary', fontSize: 12 }}>
								{t('product.verifiedSeller')}
							</Box>
						</Box>
						<AppButton
							variant="outlined"
							size="small"
							startIcon={<FontAwesomeIcon icon={Icons.chat} />}
							onClick={() => navigate(ROUTES.SELLER_PUBLIC(product.seller.id))}
							sx={{ flexShrink: 0 }}
						>
							{t('product.message')}
						</AppButton>
					</Box>

					{/* Title */}
					<Typography
						component="h1"
						sx={{
							fontSize: 28,
							fontWeight: 700,
							letterSpacing: '-0.02em',
							lineHeight: 1.15,
							mb: 1.25,
						}}
					>
						{product.title}
					</Typography>

					{/* Meta row */}
					<Box
						sx={{
							display: 'flex',
							alignItems: 'center',
							gap: 1.75,
							fontSize: 13,
							color: 'text.secondary',
							mb: 2.25,
							flexWrap: 'wrap',
						}}
					>
						<Box
							sx={{
								color: tokens.amber,
								fontWeight: 700,
								display: 'inline-flex',
								alignItems: 'center',
								gap: 0.5,
							}}
						>
							{product.rating.toFixed(1)} ★
						</Box>
						<Box component="span">({t('product.reviewCount', { count: product.reviewCount })})</Box>
						<Box
							sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: tokens.ink3, flexShrink: 0 }}
						/>
						<Box component="span" sx={{ fontFamily: tokens.fontMono, fontSize: 12 }}>
							{t('product.skuLabel')}: {product.sku}
						</Box>
					</Box>

					{/* Price */}
					<Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mb: 0.5 }}>
						<Typography sx={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em' }}>
							{formatPrice(price)}
						</Typography>
					</Box>

					{/* Stock */}
					<Box
						sx={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: 0.75,
							color: stock > 0 ? tokens.cyanInk : tokens.coralInk,
							fontSize: 13,
							mb: 3,
						}}
					>
						<Box
							sx={{
								width: 6,
								height: 6,
								borderRadius: '50%',
								bgcolor: stock > 0 ? tokens.cyan : tokens.coral,
								flexShrink: 0,
							}}
						/>
						{stock > 0 ? t('product.inStockCount', { count: stock }) : t('product.outOfStock')}
					</Box>

					{/* Option groups */}
					{Object.entries(optionGroups).map(([key, values]) => {
						const isColor = key.toLowerCase() === 'color';
						const selected = selectedOptions[key];
						return (
							<Box key={key} sx={{ mb: 2.25 }}>
								<Box
									sx={{
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'space-between',
										fontSize: 12.5,
										fontWeight: 700,
										color: tokens.ink2,
										mb: 1,
									}}
								>
									<span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
									{selected && (
										<Box component="span" sx={{ fontWeight: 500, color: 'text.secondary' }}>
											{selected}
										</Box>
									)}
								</Box>
								<Stack direction="row" flexWrap="wrap" gap={1}>
									{values.map((v) => {
										const available = isOptionAvailable(product.variants, selectedOptions, key, v);
										const active = selected === v;
										if (isColor) {
											const hex = SWATCH_COLORS[v];
											return (
												<Box
													key={v}
													component="button"
													type="button"
													aria-label={v}
													onClick={() => available && selectOption(key, v)}
													sx={{
														width: 32,
														height: 32,
														borderRadius: '50%',
														p: 0,
														bgcolor: hex ?? tokens.surface2,
														border: '2px solid',
														borderColor: active ? tokens.ink1 : 'transparent',
														outline: '1px solid',
														outlineColor: active ? tokens.ink1 : tokens.line,
														cursor: available ? 'pointer' : 'not-allowed',
														opacity: available ? 1 : 0.35,
													}}
												/>
											);
										}
										return (
											<Box
												key={v}
												component="button"
												type="button"
												onClick={() => available && selectOption(key, v)}
												sx={{
													minWidth: 52,
													px: 1.75,
													py: 1,
													border: '1px solid',
													borderColor: active ? tokens.ink1 : tokens.line,
													borderRadius: 2,
													fontFamily: 'inherit',
													fontSize: 13.5,
													fontWeight: 600,
													bgcolor: active ? tokens.ink1 : tokens.surface,
													color: active ? tokens.surface : tokens.ink2,
													cursor: available ? 'pointer' : 'not-allowed',
													opacity: available ? 1 : 1,
													position: 'relative',
													...(!available && {
														color: tokens.ink3,
														'&::after': {
															content: '""',
															position: 'absolute',
															left: 8,
															right: 8,
															top: '50%',
															height: '1px',
															bgcolor: tokens.ink3,
															transform: 'rotate(-12deg)',
														},
													}),
												}}
											>
												{v}
											</Box>
										);
									})}
								</Stack>
							</Box>
						);
					})}

					{/* Buy row */}
					<Stack direction="row" alignItems="center" gap={1.25} sx={{ mt: 1, mb: 2.75 }}>
						{/* Qty control */}
						<Box
							sx={{
								display: 'inline-flex',
								alignItems: 'center',
								border: `1px solid ${tokens.line}`,
								borderRadius: 2.5,
								bgcolor: tokens.surface,
							}}
						>
							<Box
								component="button"
								type="button"
								data-cy="qty-decrement"
								onClick={() => setQty((q) => Math.max(QTY_MIN, q - 1))}
								disabled={qty <= QTY_MIN}
								sx={{
									width: 36,
									height: 38,
									border: 'none',
									bgcolor: 'transparent',
									cursor: qty <= QTY_MIN ? 'default' : 'pointer',
									color: qty <= QTY_MIN ? tokens.ink3 : tokens.ink2,
									fontSize: 16,
									display: 'grid',
									placeItems: 'center',
									'&:hover:not(:disabled)': { color: tokens.ink1 },
								}}
							>
								−
							</Box>
							<Box
								component="input"
								type="text"
								readOnly
								data-cy="qty-value"
								value={qty}
								sx={{
									width: 44,
									textAlign: 'center',
									border: 'none',
									bgcolor: 'transparent',
									fontFamily: 'inherit',
									fontWeight: 700,
									fontSize: 14,
									outline: 'none',
									color: tokens.ink1,
								}}
							/>
							<Box
								component="button"
								type="button"
								data-cy="qty-increment"
								onClick={() => setQty((q) => Math.min(stock, q + 1))}
								disabled={qty >= stock || stock === 0}
								sx={{
									width: 36,
									height: 38,
									border: 'none',
									bgcolor: 'transparent',
									cursor: qty >= stock || stock === 0 ? 'default' : 'pointer',
									color: qty >= stock || stock === 0 ? tokens.ink3 : tokens.ink2,
									fontSize: 16,
									display: 'grid',
									placeItems: 'center',
									'&:hover:not(:disabled)': { color: tokens.ink1 },
								}}
							>
								+
							</Box>
						</Box>

						{/* Add to cart */}
						<AppButton
							variant="contained"
							disabled={stock === 0}
							onClick={handleAddToCart}
							startIcon={<FontAwesomeIcon icon={Icons.cart} />}
							sx={{ flex: 2, justifyContent: 'center', py: 1.75, fontSize: 14 }}
						>
							{t('product.addToCart')} — {formatPrice(price)}
						</AppButton>

						{/* Wishlist */}
						<AppButton
							variant="outlined"
							aria-label={t(wishlisted ? 'product.removeFromWishlist' : 'product.addToWishlist')}
							onClick={() => setWishlisted((w) => !w)}
							sx={{
								minWidth: 0,
								px: 1.625,
								py: 1.625,
								color: wishlisted ? tokens.coral : 'text.secondary',
								borderColor: wishlisted ? tokens.coral : 'divider',
								'&:hover': {
									borderColor: wishlisted ? tokens.coral : tokens.ink3,
									bgcolor: wishlisted ? tokens.coralSoft : tokens.surface2,
								},
							}}
						>
							<FontAwesomeIcon
								icon={wishlisted ? Icons.heart : Icons.heartEmpty}
								style={{ fontSize: 16 }}
							/>
						</AppButton>
					</Stack>

					{/* Trust — 3-column grid */}
					<Box
						sx={{
							display: 'grid',
							gridTemplateColumns: 'repeat(3, 1fr)',
							gap: 1.75,
							p: 2,
							bgcolor: tokens.bg,
							border: `1px solid ${tokens.line}`,
							borderRadius: `${tokens.radius}px`,
							fontSize: 12.5,
						}}
					>
						{trustItems.map((item) => (
							<Box key={item.title} sx={{ display: 'flex', gap: 1.25, alignItems: 'start' }}>
								<Box sx={{ color: 'primary.main', flexShrink: 0, mt: '1px', fontSize: 18 }}>
									<FontAwesomeIcon icon={item.icon} />
								</Box>
								<Box>
									<Box sx={{ fontWeight: 700, color: tokens.ink1, fontSize: 12.5 }}>
										{item.title}
									</Box>
									<Box sx={{ color: 'text.secondary', fontSize: 11.5, lineHeight: 1.4, mt: 0.25 }}>
										{item.sub}
									</Box>
								</Box>
							</Box>
						))}
					</Box>
				</Box>
			</Box>

			{/* ── tabs ─────────────────────────────────────────────────────── */}
			<Box sx={{ mt: 6 }}>
				<AppTabs tabs={tabs} value={tab} onChange={setTab} />
				<Box sx={{ mt: 3 }}>
					{tab === 'description' && (
						<AppCard>
							<Typography
								sx={{ fontSize: 14, color: tokens.ink2, lineHeight: 1.7, whiteSpace: 'pre-line' }}
							>
								{product.description || t('product.noDescription')}
							</Typography>
						</AppCard>
					)}

					{tab === 'specifications' && (
						<AppCard title={t('product.tabs.specifications')}>
							<Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 36px' }}>
								{specCols.map((col, ci) => (
									<Box key={ci}>
										{col.map((row) => (
											<Box
												key={row.k}
												sx={{
													display: 'flex',
													py: 1.25,
													borderBottom: `1px solid ${tokens.line2}`,
													fontSize: 13.5,
												}}
											>
												<Box sx={{ width: 160, color: 'text.secondary', flexShrink: 0 }}>
													{row.k}
												</Box>
												<Box sx={{ fontWeight: 500, color: tokens.ink1 }}>{row.v}</Box>
											</Box>
										))}
									</Box>
								))}
							</Box>
						</AppCard>
					)}

					{tab === 'reviews' && (
						<AppCard title={t('product.reviewsTitle')}>
							{product.reviewCount > 0 ? (
								<Box
									sx={{
										display: 'grid',
										gridTemplateColumns: '220px 1fr',
										gap: 4,
										alignItems: 'center',
										py: 2.5,
									}}
								>
									<Box>
										<Typography
											sx={{
												fontSize: 56,
												fontWeight: 800,
												letterSpacing: '-0.03em',
												lineHeight: 1,
											}}
										>
											{product.rating.toFixed(1)}
										</Typography>
										<Box sx={{ mt: 0.5 }}>
											<StarRating rating={product.rating} size={18} />
										</Box>
										<Box sx={{ color: 'text.secondary', fontSize: 13, mt: 0.5 }}>
											{t('product.reviewsSummary', { count: product.reviewCount })}
										</Box>
									</Box>
									<EmptyState icon={Icons.star} title={t('product.noReviews')} description="" />
								</Box>
							) : (
								<EmptyState
									icon={Icons.starEmpty}
									title={t('product.noReviews')}
									description={t('product.noReviewsDesc')}
								/>
							)}
						</AppCard>
					)}

					{tab === 'qa' && (
						<AppCard>
							<EmptyState
								icon={Icons.question}
								title={t('product.noQa')}
								description={t('product.noQaDesc')}
							/>
						</AppCard>
					)}

					{tab === 'shipping' && (
						<AppCard title={t('product.tabs.shipping')}>
							<Stack spacing={1.75}>
								{(
									[
										{ icon: Icons.truck, text: t('product.shippingDelivery') },
										{ icon: Icons.checkCircle, text: t('product.shippingReturns') },
									] as const
								).map((item) => (
									<Box
										key={item.text}
										sx={{
											display: 'flex',
											gap: 1.5,
											alignItems: 'start',
											fontSize: 14,
											color: tokens.ink2,
											lineHeight: 1.6,
										}}
									>
										<Box sx={{ color: 'primary.main', mt: '2px', flexShrink: 0 }}>
											<FontAwesomeIcon icon={item.icon} />
										</Box>
										<span>{item.text}</span>
									</Box>
								))}
							</Stack>
						</AppCard>
					)}
				</Box>
			</Box>
		</Box>
	);
}
