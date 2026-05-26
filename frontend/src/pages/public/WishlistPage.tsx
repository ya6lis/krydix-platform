import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Typography, IconButton, Avatar } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { AppButton, AppImage, EmptyState, AppLoader, useAppToast } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { ROUTES } from '@/constants/routes';
import { tokens } from '@/theme';
import { useCartStore } from '@/store/cartStore';
import {
	MY_WISHLIST_QUERY,
	REMOVE_FROM_WISHLIST_MUTATION,
	type WishlistItemData,
} from '@/graphql/operations/wishlist';

function groupBySeller(items: WishlistItemData[]) {
	return items.reduce<Record<string, WishlistItemData[]>>((acc, item) => {
		if (!acc[item.sellerId]) acc[item.sellerId] = [];
		acc[item.sellerId].push(item);
		return acc;
	}, {});
}

function LineItem({
	item,
	onRemove,
	removing,
}: {
	item: WishlistItemData;
	onRemove: (productId: string) => void;
	removing: boolean;
}) {
	const { t } = useTranslation();
	const { showToast } = useAppToast();
	const addItem = useCartStore((s) => s.addItem);
	const cartItems = useCartStore((s) => s.items);

	const isLowStock = item.inStock && item.totalStock < 5;
	const onSale =
		item.comparePrice !== null && item.comparePrice !== undefined && item.comparePrice > item.price;
	const savings = onSale ? item.comparePrice! - item.price : 0;

	const handleAddToCart = () => {
		if (!item.inStock) {
			showToast(t('cart.errors.outOfStock'), 'error');
			return;
		}
		const existing = cartItems.find((cartItem) => cartItem.productId === item.productId);
		if (existing && existing.qty >= item.totalStock) {
			showToast(t('cart.errors.insufficientStock', { count: item.totalStock }), 'error');
			return;
		}
		addItem({
			id: item.productId,
			productId: item.productId,
			sellerId: item.sellerId,
			sellerName: item.sellerName,
			name: item.productTitle,
			price: item.price,
			qty: 1,
			stock: item.totalStock,
			imageUrl: item.productImage ?? undefined,
		});
		showToast(t('cart.addedToCart', { name: item.productTitle }), 'success');
	};

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
			<Box
				component={RouterLink}
				to={ROUTES.PRODUCT(item.productSlug)}
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
				{item.productImage ? (
					<AppImage
						src={item.productImage}
						alt={item.productTitle}
						sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
					/>
				) : null}
			</Box>

			<Box>
				<Typography
					component={RouterLink}
					to={ROUTES.PRODUCT(item.productSlug)}
					sx={{
						fontWeight: 700,
						fontSize: 15,
						letterSpacing: '-0.01em',
						lineHeight: 1.3,
						mb: '4px',
						color: tokens.ink1,
						textDecoration: 'none',
						display: 'block',
						'&:hover': { color: tokens.accent },
					}}
				>
					{item.productTitle}
				</Typography>
				<Box sx={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
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
							color: !item.inStock
								? tokens.coralInk
								: isLowStock
									? tokens.amberInk
									: tokens.cyanInk,
							'&::before': {
								content: '""',
								width: 5,
								height: 5,
								borderRadius: '50%',
								bgcolor: !item.inStock
									? tokens.coral
									: isLowStock
										? tokens.amber
										: tokens.cyan,
							},
						}}
					>
						{!item.inStock
							? t('catalog.outOfStock')
							: isLowStock
								? t('cart.lowStock', { count: item.totalStock })
								: t('cart.inStock')}
					</Box>
				</Box>
			</Box>

			<AppButton
				tone="accent"
				size="small"
				onClick={handleAddToCart}
				disabled={!item.inStock}
				sx={{ whiteSpace: 'nowrap', px: '14px' }}
			>
				{t('product.addToCart')}
			</AppButton>

			<Box sx={{ textAlign: 'right', minWidth: 80 }}>
				<Typography sx={{ fontSize: 14.5, fontWeight: 700, color: tokens.ink1 }}>
					${item.price.toFixed(2)}
				</Typography>
				{onSale && (
					<Typography
						sx={{
							fontSize: 12,
							color: tokens.ink3,
							textDecoration: 'line-through',
							mt: '2px',
						}}
					>
						${item.comparePrice!.toFixed(2)}
					</Typography>
				)}
			</Box>

			<Box sx={{ textAlign: 'right', minWidth: 90 }}>
				{onSale ? (
					<Typography
						sx={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em', color: tokens.coralInk }}
					>
						−${savings.toFixed(2)}
					</Typography>
				) : (
					<Typography sx={{ fontSize: 14.5, fontWeight: 600, color: tokens.ink3 }}>—</Typography>
				)}
			</Box>

			<IconButton
				size="small"
				onClick={() => onRemove(item.productId)}
				disabled={removing}
				aria-label={t('wishlist.remove')}
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

function SellerGroup({
	sellerId,
	items,
	onRemove,
	removingId,
}: {
	sellerId: string;
	items: WishlistItemData[];
	onRemove: (productId: string) => void;
	removingId: string | null;
}) {
	const { t } = useTranslation();
	const sellerName = items[0]?.sellerName ?? sellerId;
	const initials = sellerName
		.split(' ')
		.map((w) => w[0])
		.join('')
		.slice(0, 2)
		.toUpperCase();
	const groupTotal = items.reduce((sum, item) => sum + item.price, 0);

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
				<Typography sx={{ fontWeight: 700, fontSize: 14, color: tokens.ink1 }}>{sellerName}</Typography>
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

			{items.map((item) => (
				<LineItem
					key={item.id}
					item={item}
					onRemove={onRemove}
					removing={removingId === item.productId}
				/>
			))}

			<Box
				sx={{
					px: '22px',
					py: '14px',
					bgcolor: tokens.bg,
					borderTop: `1px solid ${tokens.line}`,
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
				}}
			>
				<Typography sx={{ fontSize: 13, color: tokens.ink3 }}>
					{t('wishlist.sellerSubtotal_other', { count: items.length })}
				</Typography>
				<Typography sx={{ fontSize: 13, fontWeight: 700, color: tokens.ink1 }}>
					${groupTotal.toFixed(2)}
				</Typography>
			</Box>
		</Box>
	);
}

function WishlistSummary({ items }: { items: WishlistItemData[] }) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { showToast } = useAppToast();
	const addItem = useCartStore((s) => s.addItem);
	const cartItems = useCartStore((s) => s.items);

	const sellerGroups = useMemo(() => groupBySeller(items), [items]);
	const sellerCount = Object.keys(sellerGroups).length;
	const subtotal = items.reduce((sum, item) => sum + item.price, 0);
	const inStockItems = items.filter((item) => item.inStock);
	const outOfStockCount = items.length - inStockItems.length;
	const totalSavings = items.reduce((sum, item) => {
		if (item.comparePrice && item.comparePrice > item.price) {
			return sum + (item.comparePrice - item.price);
		}
		return sum;
	}, 0);

	const handleAddAllToCart = () => {
		if (inStockItems.length === 0) {
			showToast(t('wishlist.summary.noInStock'), 'warning');
			return;
		}

		let added = 0;
		for (const item of inStockItems) {
			const existing = cartItems.find((cartItem) => cartItem.productId === item.productId);
			if (existing && existing.qty >= item.totalStock) continue;

			addItem({
				id: item.productId,
				productId: item.productId,
				sellerId: item.sellerId,
				sellerName: item.sellerName,
				name: item.productTitle,
				price: item.price,
				qty: 1,
				stock: item.totalStock,
				imageUrl: item.productImage ?? undefined,
			});
			added++;
		}

		if (added === 0) {
			showToast(t('cart.errors.insufficientStock', { count: 1 }), 'error');
			return;
		}

		showToast(t('wishlist.summary.addedAll', { count: added }), 'success');
	};

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
			<Box sx={{ px: '22px', py: '18px', borderBottom: `1px solid ${tokens.line}` }}>
				<Typography sx={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.01em' }}>
					{t('wishlist.summary.title')}
				</Typography>
				<Typography sx={{ fontSize: 12.5, color: tokens.ink3, mt: '3px' }}>
					{t('wishlist.summary.subtitle', { count: items.length, sellers: sellerCount })}
				</Typography>
			</Box>

			<Box sx={{ px: '22px', py: '18px' }}>
				<Box sx={{ display: 'flex', justifyContent: 'space-between', py: '7px' }}>
					<Typography sx={{ fontSize: 13.5, color: tokens.ink3 }}>
						{t('wishlist.summary.subtotal')}
					</Typography>
					<Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>${subtotal.toFixed(2)}</Typography>
				</Box>

				{totalSavings > 0 && (
					<Box sx={{ display: 'flex', justifyContent: 'space-between', py: '7px' }}>
						<Typography sx={{ fontSize: 13.5, color: tokens.ink3 }}>
							{t('wishlist.summary.savings')}
						</Typography>
						<Typography sx={{ fontSize: 13.5, fontWeight: 600, color: tokens.coralInk }}>
							−${totalSavings.toFixed(2)}
						</Typography>
					</Box>
				)}

				<Box sx={{ display: 'flex', justifyContent: 'space-between', py: '7px' }}>
					<Typography sx={{ fontSize: 13.5, color: tokens.ink3 }}>
						{t('wishlist.summary.inStock')}
					</Typography>
					<Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{inStockItems.length}</Typography>
				</Box>

				{outOfStockCount > 0 && (
					<Box sx={{ display: 'flex', justifyContent: 'space-between', py: '7px' }}>
						<Typography sx={{ fontSize: 13.5, color: tokens.ink3 }}>
							{t('wishlist.summary.outOfStock')}
						</Typography>
						<Typography sx={{ fontSize: 13.5, fontWeight: 600, color: tokens.coralInk }}>
							{outOfStockCount}
						</Typography>
					</Box>
				)}

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
						{t('wishlist.summary.total')}
					</Typography>
					<Typography
						sx={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: tokens.ink1 }}
					>
						${subtotal.toFixed(2)}
					</Typography>
				</Box>

				<AppButton
					tone="primary"
					fullWidth
					size="large"
					endIcon={<FontAwesomeIcon icon={Icons.cart} size="xs" />}
					onClick={handleAddAllToCart}
					disabled={inStockItems.length === 0}
					sx={{ mt: '18px', py: '14px', fontSize: 14.5, borderRadius: '10px' }}
				>
					{t('wishlist.summary.addAllToCart')}
				</AppButton>

				<AppButton
					tone="ghost"
					fullWidth
					size="large"
					onClick={() => navigate(ROUTES.CART)}
					sx={{ mt: '10px', py: '12px', fontSize: 14, borderRadius: '10px' }}
				>
					{t('shell.cart.viewCart')}
				</AppButton>
			</Box>

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
					{ icon: Icons.heart, label: t('wishlist.trust.saved'), sub: t('wishlist.trust.savedSub') },
					{
						icon: Icons.sync,
						label: t('wishlist.trust.updated'),
						sub: t('wishlist.trust.updatedSub'),
					},
					{
						icon: Icons.shield,
						label: t('wishlist.trust.secure'),
						sub: t('wishlist.trust.secureSub'),
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

export default function WishlistPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { showToast } = useAppToast();

	const { data, loading } = useQuery<{ myWishlist: { items: WishlistItemData[]; count: number } }>(
		MY_WISHLIST_QUERY,
		{ fetchPolicy: 'cache-and-network' },
	);

	const [removeFromWishlist, { loading: removing }] = useMutation(REMOVE_FROM_WISHLIST_MUTATION, {
		refetchQueries: ['MyWishlist', 'MyWishlistProductIds'],
	});

	const items = data?.myWishlist.items ?? [];
	const sellerGroups = useMemo(() => groupBySeller(items), [items]);
	const sellerCount = Object.keys(sellerGroups).length;
	const [removingId, setRemovingId] = useState<string | null>(null);

	const handleRemove = async (productId: string) => {
		const item = items.find((entry) => entry.productId === productId);
		setRemovingId(productId);
		try {
			await removeFromWishlist({ variables: { productId } });
			showToast(t('wishlist.removed', { name: item?.productTitle ?? '' }), 'success');
		} finally {
			setRemovingId(null);
		}
	};

	if (loading && items.length === 0) {
		return <AppLoader fullPage />;
	}

	if (items.length === 0) {
		return (
			<Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 2, md: 3 }, py: 4 }}>
				<EmptyState
					icon={Icons.heartEmpty}
					title={t('wishlist.emptyTitle')}
					description={t('wishlist.emptyDescription')}
					actionLabel={t('wishlist.browseCatalog')}
					onAction={() => navigate(ROUTES.PRODUCTS)}
				/>
			</Box>
		);
	}

	return (
		<Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 2, md: 3 }, py: 4 }}>
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
						{t('wishlist.title')}
					</Typography>
					<Typography sx={{ fontSize: 14, color: tokens.ink3, mt: '4px' }}>
						{sellerCount <= 1 && items.length <= 1
							? t('wishlist.subtitleOne')
							: t('wishlist.subtitle', { count: items.length, sellers: sellerCount })}
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

			<Box
				sx={{
					display: 'grid',
					gridTemplateColumns: { xs: '1fr', lg: '1fr 400px' },
					gap: '28px',
					alignItems: 'start',
				}}
			>
				<Box>
					{Object.entries(sellerGroups).map(([sellerId, groupItems]) => (
						<SellerGroup
							key={sellerId}
							sellerId={sellerId}
							items={groupItems}
							onRemove={(productId) => void handleRemove(productId)}
							removingId={removing ? removingId : null}
						/>
					))}
				</Box>

				<WishlistSummary items={items} />
			</Box>
		</Box>
	);
}
