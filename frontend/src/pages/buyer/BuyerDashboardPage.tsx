import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@apollo/client';
import { Box, Grid, Stack, Typography, Link } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import {
	DashboardWelcomeHeader,
	DashboardSectionCard,
	DashboardQuickActions,
} from '@/components/dashboard';
import { AppButton, AppImage, EmptyState, StatCard, StatusBadge } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { tokens } from '@/theme';
import { ROUTES } from '@/constants/routes';
import { Role } from '@/constants/enums';
import { useAuth } from '@/hooks/useAuth';
import { MY_ORDERS_QUERY, MY_ORDER_STATS_QUERY } from '@/graphql/operations/orders';
import { MY_WISHLIST_QUERY, type WishlistItemData } from '@/graphql/operations/wishlist';
import {
	MY_NOTIFICATIONS_QUERY,
	UNREAD_NOTIFICATION_COUNT_QUERY,
} from '@/graphql/operations/notifications';
import { UNREAD_MESSAGE_COUNT_QUERY } from '@/graphql/operations/chat';
import type { Order, OrderStats } from '@/types/orders';
import type { AppNotification } from '@/types/notification';
import {
	formatNotificationTime,
	notificationDisplayText,
	notificationRoute,
} from '@/utils/notificationUtils';

function formatOrderDate(iso: string) {
	return new Date(iso).toLocaleDateString(undefined, {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	});
}

function activeOrderCount(stats?: OrderStats) {
	if (!stats) return 0;
	return stats.pending + stats.confirmed + stats.shipped;
}

export default function BuyerDashboardPage() {
	const { t, i18n } = useTranslation();
	const navigate = useNavigate();
	const { user } = useAuth();

	const { data: statsData } = useQuery<{ myOrderStats: OrderStats }>(MY_ORDER_STATS_QUERY);
	const { data: ordersData, loading: ordersLoading } = useQuery<{
		myOrders: { items: Order[] };
	}>(MY_ORDERS_QUERY, {
		variables: { filter: { page: 1, pageSize: 5 } },
	});
	const { data: wishlistData } = useQuery(MY_WISHLIST_QUERY);
	const { data: notifData } = useQuery<{ myNotifications: AppNotification[] }>(
		MY_NOTIFICATIONS_QUERY,
		{ variables: { limit: 5 } },
	);
	const { data: unreadNotifData } = useQuery(UNREAD_NOTIFICATION_COUNT_QUERY);
	const { data: unreadMsgData } = useQuery(UNREAD_MESSAGE_COUNT_QUERY);

	const stats = statsData?.myOrderStats;
	const recentOrders = ordersData?.myOrders.items ?? [];
	const wishlistItems = (wishlistData?.myWishlist?.items as WishlistItemData[] | undefined)?.slice(
		0,
		6,
	) ?? [];
	const notifications = notifData?.myNotifications ?? [];
	const unreadNotifications = unreadNotifData?.unreadNotificationCount ?? 0;
	const unreadMessages = unreadMsgData?.unreadMessageCount ?? 0;
	const activeOrders = activeOrderCount(stats);

	const wishlistPriceDrops = wishlistItems.filter(
		(item) => item.comparePrice != null && item.comparePrice > item.price,
	).length;

	return (
		<Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
			<DashboardWelcomeHeader
				name={user?.profile?.firstName}
				role={Role.BUYER}
				subtitleKey="buyerDashboard.subtitle"
			/>

			<Grid container spacing={2.5} sx={{ mb: 2.5 }}>
				<Grid item xs={6} md={3}>
					<StatCard
						icon={Icons.order}
						label={t('buyerDashboard.stats.activeOrders')}
						value={activeOrders}
						tone="accent"
					/>
				</Grid>
				<Grid item xs={6} md={3}>
					<StatCard
						icon={Icons.chats}
						label={t('buyerDashboard.stats.unreadMessages')}
						value={unreadMessages}
						tone="cyan"
					/>
				</Grid>
				<Grid item xs={6} md={3}>
					<StatCard
						icon={Icons.bell}
						label={t('buyerDashboard.stats.unreadNotifications')}
						value={unreadNotifications}
						tone="amber"
					/>
				</Grid>
				<Grid item xs={6} md={3}>
					<StatCard
						icon={Icons.heart}
						label={t('buyerDashboard.stats.wishlist')}
						value={wishlistData?.myWishlist?.count ?? 0}
						tone="coral"
					/>
				</Grid>
			</Grid>

			<Grid container spacing={2.5} sx={{ mb: 2.5 }}>
				<Grid item xs={12} md={7}>
					<DashboardSectionCard
						titleKey="buyerDashboard.recentOrders.title"
						subtitleKey="buyerDashboard.recentOrders.subtitle"
						actionLabelKey="dashboard.common.viewAll"
						actionHref={ROUTES.ORDERS}
					>
						{recentOrders.length === 0 && !ordersLoading ? (
							<EmptyState
								icon={Icons.order}
								title={t('buyerDashboard.recentOrders.empty')}
								description={t('buyerDashboard.recentOrders.emptyDesc')}
								actionLabel={t('buyerDashboard.quickActions.catalog')}
								onAction={() => navigate(ROUTES.PRODUCTS)}
							/>
						) : (
							<Stack spacing={1.25}>
								{recentOrders.map((order) => (
									<Box
										key={order.id}
										sx={{
											display: 'flex',
											alignItems: 'center',
											gap: 1.5,
											p: 1.5,
											borderRadius: 1.5,
											border: `1px solid ${tokens.line}`,
										}}
									>
										<Box sx={{ flex: 1, minWidth: 0 }}>
											<Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>
												#{order.id.slice(-6).toUpperCase()}
											</Typography>
											<Typography sx={{ fontSize: 12, color: tokens.ink3 }}>
												{formatOrderDate(order.createdAt)} · ${order.totalAmount.toFixed(2)}
											</Typography>
										</Box>
										<StatusBadge
											status={order.status}
											label={t(`status.order.${order.status}`)}
										/>
										<AppButton
											variant="outlined"
											size="small"
											onClick={() => navigate(ROUTES.ORDER(order.id))}
										>
											{t('dashboard.common.details')}
										</AppButton>
									</Box>
								))}
							</Stack>
						)}
					</DashboardSectionCard>
				</Grid>

				<Grid item xs={12} md={5}>
					<Stack spacing={2.5} sx={{ height: '100%' }}>
						<DashboardSectionCard
							titleKey="buyerDashboard.wishlist.title"
							subtitleKey={
								wishlistPriceDrops > 0
									? 'buyerDashboard.wishlist.priceDropHint'
									: 'buyerDashboard.wishlist.subtitle'
							}
							actionLabelKey="dashboard.common.viewAll"
							actionHref={ROUTES.WISHLIST}
						>
							{wishlistItems.length === 0 ? (
								<EmptyState
									icon={Icons.heart}
									title={t('buyerDashboard.wishlist.empty')}
									description={t('buyerDashboard.wishlist.emptyDesc')}
								/>
							) : (
								<Box sx={{ display: 'flex', gap: 1.25, overflowX: 'auto', pb: 0.5 }}>
									{wishlistItems.map((item) => {
										const hasDrop =
											item.comparePrice != null && item.comparePrice > item.price;
										return (
											<Box
												key={item.id}
												component={RouterLink}
												to={ROUTES.PRODUCT(item.productSlug)}
												sx={{
													flexShrink: 0,
													width: 88,
													textDecoration: 'none',
													color: tokens.ink1,
												}}
											>
												<Box
													sx={{
														width: 88,
														height: 88,
														borderRadius: 1.5,
														overflow: 'hidden',
														bgcolor: tokens.surface2,
														border: hasDrop
															? `2px solid ${tokens.coral}`
															: `1px solid ${tokens.line}`,
														position: 'relative',
													}}
												>
													{item.productImage ? (
														<AppImage
															src={item.productImage}
															alt={item.productTitle}
															sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
														/>
													) : (
														<Box
															sx={{
																width: '100%',
																height: '100%',
																display: 'grid',
																placeItems: 'center',
															}}
														>
															<FontAwesomeIcon icon={Icons.image} color={tokens.ink3} />
														</Box>
													)}
													{hasDrop && (
														<Box
															sx={{
																position: 'absolute',
																top: 4,
																right: 4,
																width: 8,
																height: 8,
																borderRadius: '50%',
																bgcolor: tokens.coral,
															}}
														/>
													)}
												</Box>
												<Typography
													sx={{
														fontSize: 11,
														mt: 0.75,
														fontWeight: 600,
														overflow: 'hidden',
														textOverflow: 'ellipsis',
														whiteSpace: 'nowrap',
													}}
												>
													${item.price.toFixed(0)}
												</Typography>
											</Box>
										);
									})}
								</Box>
							)}
						</DashboardSectionCard>

						<DashboardSectionCard
							titleKey="buyerDashboard.notifications.title"
							actionLabelKey="dashboard.common.viewAll"
							actionHref={ROUTES.NOTIFICATIONS}
						>
							{notifications.length === 0 ? (
								<EmptyState
									icon={Icons.bell}
									title={t('buyerDashboard.notifications.empty')}
									description={t('buyerDashboard.notifications.emptyDesc')}
								/>
							) : (
								<Stack spacing={1.25}>
									{notifications.map((notification) => {
										const display = notificationDisplayText(notification, t);
										const href =
											notificationRoute(notification, Role.BUYER) ??
											ROUTES.NOTIFICATIONS;
										return (
											<Link
												key={notification.id}
												component={RouterLink}
												to={href}
												underline="none"
												sx={{
													display: 'block',
													p: 1.25,
													borderRadius: 1.5,
													border: `1px solid ${tokens.line}`,
													color: tokens.ink1,
													'&:hover': { borderColor: tokens.accent },
												}}
											>
												<Typography sx={{ fontSize: 13, fontWeight: 600 }}>
													{display.title}
												</Typography>
												<Typography sx={{ fontSize: 12, color: tokens.ink3, mt: 0.25 }}>
													{display.body}
												</Typography>
												<Typography sx={{ fontSize: 11, color: tokens.ink3, mt: 0.5 }}>
													{formatNotificationTime(notification.createdAt, i18n.language)}
												</Typography>
											</Link>
										);
									})}
								</Stack>
							)}
						</DashboardSectionCard>
					</Stack>
				</Grid>
			</Grid>

			<DashboardQuickActions
				titleKey="buyerDashboard.quickActions.title"
				actions={[
					{
						id: 'catalog',
						labelKey: 'buyerDashboard.quickActions.catalog',
						href: ROUTES.PRODUCTS,
						icon: Icons.products,
						tone: 'cyan',
					},
					{
						id: 'orders',
						labelKey: 'buyerDashboard.quickActions.orders',
						href: ROUTES.ORDERS,
						icon: Icons.order,
						tone: 'accent',
					},
					{
						id: 'profile',
						labelKey: 'buyerDashboard.quickActions.profile',
						href: ROUTES.SETTINGS,
						icon: Icons.user,
						tone: 'amber',
					},
					{
						id: 'seller',
						labelKey: 'buyerDashboard.quickActions.becomeSeller',
						href: ROUTES.SELLER_VERIFICATION,
						icon: Icons.store,
						tone: 'coral',
					},
				]}
			/>
		</Box>
	);
}
