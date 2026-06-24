import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Popover, Typography, Divider } from '@mui/material';
import { useMutation, useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
	faSearch,
	faBell,
	faTrash,
	faArrowRight,
	faShoppingCart,
	faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { tokens } from '@/theme';
import { useCartStore } from '@/store/cartStore';
import { useWishlist } from '@/hooks/useWishlist';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/constants/routes';
import { CATALOG_SEARCH_QUERY_PARAM } from '@/constants/constants';
import { formatMoney } from '@/utils/formatMoney';
import { canUseBuyerCommerce } from '@/utils/roleAccess';
import { Icons } from '@/constants/icons';
import { NotificationsPanel } from '@/components/notifications/NotificationsPanel';
import { AppImage } from '@/components/ui';
import { type NotificationTabKey } from '@/utils/notificationUtils';
import {
	DELETE_NOTIFICATION_MUTATION,
	MARK_ALL_NOTIFICATIONS_READ_MUTATION,
	MARK_NOTIFICATION_READ_MUTATION,
	MY_NOTIFICATIONS_QUERY,
	UNREAD_NOTIFICATION_COUNT_QUERY,
} from '@/graphql/operations/notifications';
import {
	MY_WISHLIST_QUERY,
	REMOVE_FROM_WISHLIST_MUTATION,
	type WishlistItemData,
} from '@/graphql/operations/wishlist';
import type { AppNotification } from '@/types/notification';
import { notificationRoute } from '@/utils/notificationUtils';

/* ── breadcrumb types ────────────────────────────────────────── */
export interface Breadcrumb {
	label: string;
	href?: string;
}

interface AppNavbarProps {
	breadcrumbs?: Breadcrumb[];
}

/* ── static mock notifications ───────────────────────────────── */

/* ── icon button base sx ─────────────────────────────────────── */
const iconBtnSx = {
	width: 36,
	height: 36,
	borderRadius: '10px',
	background: tokens.surface,
	border: `1px solid ${tokens.line}`,
	display: 'grid',
	placeItems: 'center',
	color: tokens.ink2,
	cursor: 'pointer',
	position: 'relative' as const,
	transition: 'border-color 120ms, color 120ms',
	flexShrink: 0,
	'&:hover': { borderColor: tokens.ink3, color: tokens.ink1 },
};

/* ── component ───────────────────────────────────────────────── */
export default function AppNavbar({ breadcrumbs }: AppNavbarProps) {
	const { t, i18n } = useTranslation();
	const navigate = useNavigate();
	const location = useLocation();
	const [searchParams] = useSearchParams();
	const [searchQuery, setSearchQuery] = useState('');
	const user = useAuthStore((s) => s.user);
	const showCommerceNav = canUseBuyerCommerce(user?.role);
	const cartItems = useCartStore((s) => s.items);
	const removeItem = useCartStore((s) => s.removeItem);
	const subtotal = useCartStore((s) => s.subtotal);
	const sellerGroups = useCartStore((s) => s.sellerGroups);
	const itemCount = useCartStore((s) => s.itemCount);
	const { count: wishlistCount } = useWishlist();

	const [cartAnchor, setCartAnchor] = useState<HTMLElement | null>(null);
	const [wishlistAnchor, setWishlistAnchor] = useState<HTMLElement | null>(null);
	const [notifAnchor, setNotifAnchor] = useState<HTMLElement | null>(null);
	const [notifTab, setNotifTab] = useState<NotificationTabKey>('all');
	const [deletingNotifId, setDeletingNotifId] = useState<string | null>(null);

	const { data: notificationsData, refetch: refetchNotifications } = useQuery<{
		myNotifications: AppNotification[];
	}>(MY_NOTIFICATIONS_QUERY, {
		variables: { limit: 30 },
		skip: !user,
		fetchPolicy: 'cache-and-network',
	});

	const { data: unreadData, refetch: refetchUnreadCount } = useQuery<{
		unreadNotificationCount: number;
	}>(UNREAD_NOTIFICATION_COUNT_QUERY, {
		skip: !user,
		fetchPolicy: 'cache-and-network',
	});

	const [markNotificationRead] = useMutation(MARK_NOTIFICATION_READ_MUTATION);
	const [markAllNotificationsRead, { loading: markingAllRead }] = useMutation(
		MARK_ALL_NOTIFICATIONS_READ_MUTATION
	);
	const [deleteNotification] = useMutation(DELETE_NOTIFICATION_MUTATION);

	const { data: wishlistData, refetch: refetchWishlist } = useQuery<{
		myWishlist: { items: WishlistItemData[]; count: number };
	}>(MY_WISHLIST_QUERY, {
		skip: !user,
		fetchPolicy: 'cache-and-network',
	});

	const [removeFromWishlist] = useMutation(REMOVE_FROM_WISHLIST_MUTATION, {
		refetchQueries: ['MyWishlist', 'MyWishlistProductIds'],
	});

	const cartOpen = Boolean(cartAnchor);
	const wishlistOpen = Boolean(wishlistAnchor);
	const notifOpen = Boolean(notifAnchor);

	const groups = sellerGroups();
	const sellerCount = Object.keys(groups).length;
	const count = itemCount();
	const notifications = notificationsData?.myNotifications ?? [];
	const unreadCount = unreadData?.unreadNotificationCount ?? 0;
	const wishlistItems = wishlistData?.myWishlist.items ?? [];

	useEffect(() => {
		if (location.pathname === ROUTES.PRODUCTS) {
			setSearchQuery(searchParams.get(CATALOG_SEARCH_QUERY_PARAM) ?? '');
		}
	}, [location.pathname, searchParams]);

	const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const trimmed = searchQuery.trim();
		if (!trimmed) {
			navigate(ROUTES.PRODUCTS);
			return;
		}
		navigate(`${ROUTES.PRODUCTS}?${CATALOG_SEARCH_QUERY_PARAM}=${encodeURIComponent(trimmed)}`);
	};

	const refetchNotificationsState = async () => {
		await Promise.all([refetchNotifications(), refetchUnreadCount()]);
	};

	const handleRemoveWishlistItem = async (productId: string) => {
		await removeFromWishlist({ variables: { productId } });
		await refetchWishlist();
	};

	const handleMarkAllRead = async () => {
		await markAllNotificationsRead();
		await refetchNotificationsState();
	};

	const handleDeleteNotification = async (id: string) => {
		setDeletingNotifId(id);
		try {
			await deleteNotification({ variables: { id } });
			await refetchNotificationsState();
		} finally {
			setDeletingNotifId(null);
		}
	};

	const handleNotificationClick = async (notification: AppNotification) => {
		if (!notification.isRead) {
			await markNotificationRead({ variables: { id: notification.id } });
			await refetchNotificationsState();
		}
		setNotifAnchor(null);
		const route = notificationRoute(notification, user?.role);
		if (route) navigate(route);
	};

	return (
		<Box
			component="header"
			sx={{
				position: 'sticky',
				top: 0,
				zIndex: 1100,
				background: `rgba(244,246,248,0.92)`,
				backdropFilter: 'blur(8px)',
				borderBottom: `1px solid ${tokens.line}`,
				padding: '14px 36px',
				display: 'flex',
				alignItems: 'center',
				gap: '14px',
			}}
		>
			{/* ── breadcrumbs ── */}
			<Box
				sx={{
					display: 'flex',
					alignItems: 'center',
					gap: '8px',
					fontSize: 13,
					color: tokens.ink3,
				}}
			>
				<Box component={Link} to="/" sx={{ textDecoration: 'none', color: 'inherit' }}>
					Krydix
				</Box>
				{breadcrumbs?.map((crumb, i) => (
					<Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<Box component="span" sx={{ opacity: 0.5 }}>
							/
						</Box>
						{crumb.href && i < breadcrumbs.length - 1 ? (
							<Box
								component={Link}
								to={crumb.href}
								sx={{ textDecoration: 'none', color: 'inherit' }}
							>
								{crumb.label}
							</Box>
						) : (
							<Box component="span" sx={{ color: tokens.ink1, fontWeight: 600 }}>
								{crumb.label}
							</Box>
						)}
					</Box>
				))}
			</Box>

			{/* ── search ── */}
			<Box
				component="form"
				onSubmit={handleSearchSubmit}
				sx={{
					marginLeft: 'auto',
					flex: 1,
					maxWidth: 520,
					display: 'flex',
					alignItems: 'center',
					gap: '8px',
					background: tokens.surface,
					border: `1px solid ${tokens.line}`,
					borderRadius: '10px',
					padding: '7px 14px',
					color: tokens.ink3,
					fontSize: 13,
					transition: 'border-color 120ms',
					'&:focus-within': { borderColor: tokens.accent },
				}}
			>
				<FontAwesomeIcon icon={faSearch} style={{ width: 14, height: 14 }} />
				<Box
					component="input"
					type="search"
					value={searchQuery}
					onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
						setSearchQuery(event.target.value)
					}
					placeholder={t('shell.search.placeholder')}
					aria-label={t('shell.search.placeholder')}
					sx={{
						flex: 1,
						border: 'none',
						outline: 'none',
						background: 'transparent',
						color: tokens.ink1,
						fontSize: 13,
						fontFamily: 'inherit',
						'&::placeholder': { color: tokens.ink3 },
					}}
				/>
			</Box>

			{showCommerceNav && (
				<Box sx={{ position: 'relative' }}>
					<Box
						component="button"
						onClick={(e) => setWishlistAnchor(e.currentTarget)}
						sx={iconBtnSx}
						aria-label={t('shell.wishlist.title')}
					>
						<FontAwesomeIcon icon={Icons.heartEmpty} style={{ width: 16, height: 16 }} />
						{wishlistCount > 0 && (
							<Box
								sx={{
									position: 'absolute',
									top: -4,
									right: -4,
									background: tokens.coral,
									color: '#fff',
									fontSize: 10,
									fontWeight: 700,
									height: 16,
									minWidth: 16,
									padding: '0 4px',
									borderRadius: 8,
									display: 'grid',
									placeItems: 'center',
								}}
							>
								{wishlistCount}
							</Box>
						)}
					</Box>

					<Popover
						open={wishlistOpen}
						anchorEl={wishlistAnchor}
						onClose={() => setWishlistAnchor(null)}
						anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
						transformOrigin={{ vertical: 'top', horizontal: 'right' }}
						PaperProps={{
							sx: {
								width: 360,
								borderRadius: '14px',
								border: `1px solid ${tokens.line}`,
								boxShadow: tokens.shadowMd,
								mt: '8px',
								overflow: 'hidden',
							},
						}}
					>
						<WishlistDropdown
							isAuthenticated={!!user}
							items={wishlistItems}
							count={wishlistCount}
							onRemove={(productId) => void handleRemoveWishlistItem(productId)}
							onClose={() => setWishlistAnchor(null)}
						/>
					</Popover>
				</Box>
			)}

			{showCommerceNav && (
				<Box sx={{ position: 'relative' }}>
					<Box
						component="button"
						onClick={(e) => setCartAnchor(e.currentTarget)}
						sx={iconBtnSx}
						aria-label={t('shell.cart.title')}
					>
						<FontAwesomeIcon icon={faShoppingCart} style={{ width: 16, height: 16 }} />
						{count > 0 && (
							<Box
								sx={{
									position: 'absolute',
									top: -4,
									right: -4,
									background: tokens.coral,
									color: '#fff',
									fontSize: 10,
									fontWeight: 700,
									height: 16,
									minWidth: 16,
									padding: '0 4px',
									borderRadius: 8,
									display: 'grid',
									placeItems: 'center',
								}}
							>
								{count}
							</Box>
						)}
					</Box>

					<Popover
						open={cartOpen}
						anchorEl={cartAnchor}
						onClose={() => setCartAnchor(null)}
						anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
						transformOrigin={{ vertical: 'top', horizontal: 'right' }}
						PaperProps={{
							sx: {
								width: 360,
								borderRadius: '14px',
								border: `1px solid ${tokens.line}`,
								boxShadow: tokens.shadowMd,
								mt: '8px',
								overflow: 'hidden',
							},
						}}
					>
						<CartDropdown
							items={cartItems}
							groups={groups}
							sellerCount={sellerCount}
							subtotal={subtotal()}
							onRemove={removeItem}
							onClose={() => setCartAnchor(null)}
						/>
					</Popover>
				</Box>
			)}

			{/* ── notifications button ── */}
			<Box sx={{ position: 'relative' }}>
				<Box
					component="button"
					onClick={(e) => setNotifAnchor(e.currentTarget)}
					sx={iconBtnSx}
					aria-label={t('shell.notif.title')}
				>
					<FontAwesomeIcon icon={faBell} style={{ width: 16, height: 16 }} />
					{unreadCount > 0 && (
						<Box
							sx={{
								position: 'absolute',
								top: -4,
								right: -4,
								background: tokens.coral,
								color: '#fff',
								fontSize: 10,
								fontWeight: 700,
								height: 16,
								minWidth: 16,
								padding: '0 4px',
								borderRadius: 8,
								display: 'grid',
								placeItems: 'center',
							}}
						>
							{unreadCount}
						</Box>
					)}
				</Box>

				{/* Notifications popover */}
				<Popover
					open={notifOpen}
					anchorEl={notifAnchor}
					onClose={() => setNotifAnchor(null)}
					anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
					transformOrigin={{ vertical: 'top', horizontal: 'right' }}
					PaperProps={{
						sx: {
							width: 400,
							borderRadius: '14px',
							border: `1px solid ${tokens.line}`,
							boxShadow: tokens.shadowMd,
							mt: '8px',
							overflow: 'hidden',
						},
					}}
				>
					<NotificationsPanel
						notifications={notifications}
						activeTab={notifTab}
						onTabChange={setNotifTab}
						unreadCount={unreadCount}
						locale={i18n.language}
						onMarkAllRead={() => void handleMarkAllRead()}
						markingAllRead={markingAllRead}
						onNotificationClick={(notification) => void handleNotificationClick(notification)}
						onDeleteNotification={(id) => void handleDeleteNotification(id)}
						deletingId={deletingNotifId}
						variant="dropdown"
					/>
				</Popover>
			</Box>
		</Box>
	);
}

/* ── CartDropdown ────────────────────────────────────────────── */
import type { CartItem } from '@/store/cartStore';

function CartDropdown({
	items,
	groups,
	sellerCount,
	subtotal,
	onRemove,
	onClose,
}: {
	items: CartItem[];
	groups: Record<string, CartItem[]>;
	sellerCount: number;
	subtotal: number;
	onRemove: (id: string) => void;
	onClose: () => void;
}) {
	const { t } = useTranslation();

	return (
		<Box>
			{/* head */}
			<Box
				sx={{
					padding: '16px 18px',
					display: 'flex',
					alignItems: 'flex-start',
					justifyContent: 'space-between',
				}}
			>
				<Box>
					<Typography sx={{ fontWeight: 700, fontSize: 15 }}>{t('shell.cart.title')}</Typography>
					<Typography sx={{ fontSize: 12, color: tokens.ink3, mt: '2px' }}>
						{items.length === 0
							? t('shell.cart.empty')
							: t('shell.cart.itemsFrom', {
									count: items.reduce((a, i) => a + i.qty, 0),
									sellers: sellerCount,
								})}
					</Typography>
				</Box>
				<Box
					component="button"
					onClick={onClose}
					sx={{
						...iconBtnSx,
						width: 28,
						height: 28,
						borderRadius: 7,
						fontSize: 12,
					}}
					aria-label="Close"
				>
					<FontAwesomeIcon icon={faTimes} />
				</Box>
			</Box>

			<Divider sx={{ borderColor: tokens.line }} />

			{/* body */}
			<Box sx={{ maxHeight: 340, overflowY: 'auto', padding: '6px 0' }}>
				{items.length === 0 ? (
					<Box sx={{ padding: '32px 18px', textAlign: 'center', color: tokens.ink3, fontSize: 13 }}>
						{t('shell.cart.empty')}
					</Box>
				) : (
					Object.entries(groups).map(([sellerId, sellerItems]) => (
						<Box key={sellerId}>
							<Typography
								sx={{
									fontSize: '11px',
									fontWeight: 700,
									letterSpacing: '0.06em',
									textTransform: 'uppercase',
									color: tokens.ink3,
									padding: '6px 18px 4px',
								}}
							>
								{sellerItems[0].sellerName}
							</Typography>
							{sellerItems.map((item) => (
								<Box
									key={item.id}
									sx={{
										display: 'flex',
										alignItems: 'flex-start',
										gap: '12px',
										padding: '8px 18px',
										transition: 'background 80ms',
										'&:hover': { background: tokens.bg },
									}}
								>
									{/* thumb */}
									<Box
										sx={{
											width: 44,
											height: 44,
											borderRadius: 8,
											background: tokens.surface2,
											flexShrink: 0,
											overflow: 'hidden',
										}}
									>
										{item.imageUrl && (
											<AppImage
												src={item.imageUrl}
												alt={item.name}
												sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
											/>
										)}
									</Box>
									{/* info */}
									<Box sx={{ flex: 1, minWidth: 0 }}>
										<Typography
											sx={{
												fontWeight: 600,
												fontSize: 13,
												lineHeight: 1.3,
												color: tokens.ink1,
												overflow: 'hidden',
												textOverflow: 'ellipsis',
												whiteSpace: 'nowrap',
											}}
										>
											{item.name}
											{item.variant ? ` — ${item.variant}` : ''}
										</Typography>
										<Typography sx={{ fontSize: '11.5px', color: tokens.ink3, mt: '2px' }}>
											Qty {item.qty} · {formatMoney(item.price * item.qty)}
										</Typography>
									</Box>
									{/* remove */}
									<Box
										component="button"
										onClick={() => onRemove(item.id)}
										sx={{
											width: 28,
											height: 28,
											borderRadius: 6,
											border: 'none',
											background: 'transparent',
											color: tokens.ink3,
											cursor: 'pointer',
											display: 'grid',
											placeItems: 'center',
											fontSize: 12,
											transition: 'background 120ms, color 120ms',
											'&:hover': {
												background: tokens.coralSoft,
												color: tokens.coralInk,
											},
										}}
										aria-label={t('shell.cart.remove')}
									>
										<FontAwesomeIcon icon={faTrash} />
									</Box>
								</Box>
							))}
						</Box>
					))
				)}
			</Box>

			{items.length > 0 && (
				<>
					<Divider sx={{ borderColor: tokens.line }} />
					{/* footer */}
					<Box sx={{ padding: '14px 18px' }}>
						<Box sx={{ mb: '12px' }}>
							<Box
								sx={{
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center',
									fontSize: 13,
									color: tokens.ink1,
								}}
							>
								<span>{t('shell.cart.subtotal')}</span>
								<Typography component="strong" sx={{ fontSize: 15, fontWeight: 800 }}>
									{formatMoney(subtotal)}
								</Typography>
							</Box>
							<Box
								sx={{
									display: 'flex',
									justifyContent: 'space-between',
									fontSize: 12,
									color: tokens.ink3,
									mt: '4px',
								}}
							>
								<span>{t('shell.cart.shipping')}</span>
								<span>{t('shell.cart.shippingCalc')}</span>
							</Box>
						</Box>
						<Box sx={{ display: 'flex', gap: '8px' }}>
							<Box
								component={Link}
								to="/cart"
								onClick={onClose}
								sx={{
									flex: 1,
									display: 'grid',
									placeItems: 'center',
									padding: '9px 16px',
									borderRadius: 10,
									border: `1px solid ${tokens.line}`,
									background: tokens.surface,
									color: tokens.ink1,
									fontSize: 13,
									fontWeight: 600,
									textDecoration: 'none',
									transition: 'border-color 120ms',
									'&:hover': { borderColor: tokens.ink3 },
								}}
							>
								{t('shell.cart.viewCart')}
							</Box>
							<Box
								component={Link}
								to="/checkout"
								onClick={onClose}
								sx={{
									flex: 1,
									display: 'grid',
									placeItems: 'center',
									padding: '9px 16px',
									borderRadius: 10,
									background: tokens.accent,
									color: '#fff',
									fontSize: 13,
									fontWeight: 600,
									textDecoration: 'none',
									transition: 'opacity 120ms',
									'&:hover': { opacity: 0.88 },
								}}
							>
								{t('shell.cart.checkout')}
							</Box>
						</Box>
					</Box>
				</>
			)}
		</Box>
	);
}

/* ── WishlistDropdown ────────────────────────────────────────── */
function WishlistDropdown({
	isAuthenticated,
	items,
	count,
	onRemove,
	onClose,
}: {
	isAuthenticated: boolean;
	items: WishlistItemData[];
	count: number;
	onRemove: (productId: string) => void;
	onClose: () => void;
}) {
	const { t } = useTranslation();

	return (
		<Box>
			<Box
				sx={{
					padding: '16px 18px',
					display: 'flex',
					alignItems: 'flex-start',
					justifyContent: 'space-between',
				}}
			>
				<Box>
					<Typography sx={{ fontWeight: 700, fontSize: 15 }}>
						{t('shell.wishlist.title')}
					</Typography>
					<Typography sx={{ fontSize: 12, color: tokens.ink3, mt: '2px' }}>
						{!isAuthenticated
							? t('shell.wishlist.signInHint')
							: count === 0
								? t('shell.wishlist.empty')
								: t('shell.wishlist.itemsCount', { count })}
					</Typography>
				</Box>
				<Box
					component="button"
					onClick={onClose}
					sx={{
						...iconBtnSx,
						width: 28,
						height: 28,
						borderRadius: 7,
						fontSize: 12,
					}}
					aria-label="Close"
				>
					<FontAwesomeIcon icon={faTimes} />
				</Box>
			</Box>

			<Divider sx={{ borderColor: tokens.line }} />

			<Box sx={{ maxHeight: 340, overflowY: 'auto', padding: '6px 0' }}>
				{!isAuthenticated ? (
					<Box sx={{ padding: '32px 18px', textAlign: 'center' }}>
						<Typography sx={{ fontSize: 13, color: tokens.ink3, mb: 2 }}>
							{t('shell.wishlist.signInHint')}
						</Typography>
						<Box
							component={Link}
							to={ROUTES.LOGIN}
							onClick={onClose}
							sx={{
								display: 'inline-grid',
								placeItems: 'center',
								padding: '9px 16px',
								borderRadius: 10,
								background: tokens.accent,
								color: '#fff',
								fontSize: 13,
								fontWeight: 600,
								textDecoration: 'none',
								transition: 'opacity 120ms',
								'&:hover': { opacity: 0.88 },
							}}
						>
							{t('shell.guest.signIn')}
						</Box>
					</Box>
				) : items.length === 0 ? (
					<Box sx={{ padding: '32px 18px', textAlign: 'center', color: tokens.ink3, fontSize: 13 }}>
						{t('shell.wishlist.empty')}
					</Box>
				) : (
					items.map((item) => (
						<Box
							key={item.id}
							sx={{
								display: 'flex',
								alignItems: 'flex-start',
								gap: '12px',
								padding: '8px 18px',
								transition: 'background 80ms',
								'&:hover': { background: tokens.bg },
							}}
						>
							<Box
								component={Link}
								to={ROUTES.PRODUCT(item.productSlug)}
								onClick={onClose}
								sx={{
									width: 44,
									height: 44,
									borderRadius: 8,
									background: tokens.surface2,
									flexShrink: 0,
									overflow: 'hidden',
								}}
							>
								{item.productImage && (
									<AppImage
										src={item.productImage}
										alt={item.productTitle}
										sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
									/>
								)}
							</Box>
							<Box sx={{ flex: 1, minWidth: 0 }}>
								<Typography
									component={Link}
									to={ROUTES.PRODUCT(item.productSlug)}
									onClick={onClose}
									sx={{
										fontWeight: 600,
										fontSize: 13,
										lineHeight: 1.3,
										color: tokens.ink1,
										textDecoration: 'none',
										overflow: 'hidden',
										textOverflow: 'ellipsis',
										whiteSpace: 'nowrap',
										display: 'block',
										'&:hover': { color: tokens.accent },
									}}
								>
									{item.productTitle}
								</Typography>
								<Typography sx={{ fontSize: '11.5px', color: tokens.ink3, mt: '2px' }}>
									{formatMoney(item.price)}
									{!item.inStock ? ` · ${t('catalog.outOfStock')}` : ''}
								</Typography>
							</Box>
							<Box
								component="button"
								onClick={() => onRemove(item.productId)}
								sx={{
									width: 28,
									height: 28,
									borderRadius: 6,
									border: 'none',
									background: 'transparent',
									color: tokens.ink3,
									cursor: 'pointer',
									display: 'grid',
									placeItems: 'center',
									fontSize: 12,
									transition: 'background 120ms, color 120ms',
									'&:hover': {
										background: tokens.coralSoft,
										color: tokens.coralInk,
									},
								}}
								aria-label={t('shell.wishlist.remove')}
							>
								<FontAwesomeIcon icon={faTrash} />
							</Box>
						</Box>
					))
				)}
			</Box>

			{isAuthenticated && (
				<>
					<Divider sx={{ borderColor: tokens.line }} />
					<Box sx={{ padding: '12px 18px' }}>
						<Box
							component={Link}
							to={ROUTES.WISHLIST}
							onClick={onClose}
							sx={{
								display: 'inline-flex',
								alignItems: 'center',
								gap: '6px',
								fontSize: 13,
								fontWeight: 600,
								color: tokens.accent,
								textDecoration: 'none',
								'&:hover': { textDecoration: 'underline' },
							}}
						>
							{t('shell.wishlist.viewAll')}
							<FontAwesomeIcon icon={faArrowRight} style={{ width: 13 }} />
						</Box>
					</Box>
				</>
			)}
		</Box>
	);
}
