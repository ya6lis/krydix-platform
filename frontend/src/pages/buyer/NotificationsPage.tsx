import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Box, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { AppButton, AppLoader, EmptyState } from '@/components/ui';
import { NotificationsPanel } from '@/components/notifications/NotificationsPanel';
import { Icons } from '@/constants/icons';
import { ROUTES } from '@/constants/routes';
import { tokens } from '@/theme';
import { useAuthStore } from '@/store/authStore';
import {
	DELETE_NOTIFICATION_MUTATION,
	DELETE_READ_NOTIFICATIONS_MUTATION,
	MARK_ALL_NOTIFICATIONS_READ_MUTATION,
	MARK_NOTIFICATION_READ_MUTATION,
	MY_NOTIFICATIONS_QUERY,
	UNREAD_NOTIFICATION_COUNT_QUERY,
} from '@/graphql/operations/notifications';
import {
	notificationRoute,
	notificationTabCounts,
	type NotificationTabKey,
} from '@/utils/notificationUtils';
import type { AppNotification } from '@/types/notification';

function NotificationsSummary({
	notifications,
	unreadCount,
	onMarkAllRead,
	markingAllRead,
	onDeleteRead,
	deletingRead,
}: {
	notifications: AppNotification[];
	unreadCount: number;
	onMarkAllRead: () => void;
	markingAllRead: boolean;
	onDeleteRead: () => void;
	deletingRead: boolean;
}) {
	const { t } = useTranslation();
	const counts = notificationTabCounts(notifications);
	const readCount = notifications.length - unreadCount;

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
					{t('notificationsPage.summary.title')}
				</Typography>
				<Typography sx={{ fontSize: 12.5, color: tokens.ink3, mt: '3px' }}>
					{t('notificationsPage.summary.subtitle', { count: notifications.length })}
				</Typography>
			</Box>

			<Box sx={{ px: '22px', py: '18px' }}>
				{[
					{ label: t('shell.notif.tab.unread'), value: counts.unread },
					{ label: t('shell.notif.tab.orders'), value: counts.orders },
					{ label: t('shell.notif.tab.system'), value: counts.system },
					{ label: t('notificationsPage.summary.read'), value: readCount },
				].map(({ label, value }) => (
					<Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: '7px' }}>
						<Typography sx={{ fontSize: 13.5, color: tokens.ink3 }}>{label}</Typography>
						<Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{value}</Typography>
					</Box>
				))}

				<Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px', mt: '14px' }}>
					<AppButton
						fullWidth
						onClick={onMarkAllRead}
						loading={markingAllRead}
						disabled={unreadCount === 0}
						startIcon={<FontAwesomeIcon icon={Icons.check} size="xs" />}
					>
						{t('shell.notif.markAllRead')}
					</AppButton>
					<AppButton
						fullWidth
						tone="ghost"
						onClick={onDeleteRead}
						loading={deletingRead}
						disabled={readCount === 0}
						startIcon={<FontAwesomeIcon icon={Icons.delete} size="xs" />}
					>
						{t('notificationsPage.deleteRead')}
					</AppButton>
				</Box>
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
					{
						icon: Icons.bell,
						label: t('notificationsPage.trust.realtime'),
						sub: t('notificationsPage.trust.realtimeSub'),
					},
					{
						icon: Icons.order,
						label: t('notificationsPage.trust.orders'),
						sub: t('notificationsPage.trust.ordersSub'),
					},
					{
						icon: Icons.shield,
						label: t('notificationsPage.trust.control'),
						sub: t('notificationsPage.trust.controlSub'),
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

export default function NotificationsPage() {
	const { t, i18n } = useTranslation();
	const navigate = useNavigate();
	const user = useAuthStore((s) => s.user);
	const [activeTab, setActiveTab] = useState<NotificationTabKey>('all');
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const { data, loading, refetch: refetchNotifications } = useQuery<{
		myNotifications: AppNotification[];
	}>(MY_NOTIFICATIONS_QUERY, {
		variables: { limit: 100 },
		fetchPolicy: 'cache-and-network',
	});

	const { data: unreadData, refetch: refetchUnreadCount } = useQuery<{
		unreadNotificationCount: number;
	}>(UNREAD_NOTIFICATION_COUNT_QUERY, {
		fetchPolicy: 'cache-and-network',
	});

	const [markNotificationRead] = useMutation(MARK_NOTIFICATION_READ_MUTATION);
	const [markAllNotificationsRead, { loading: markingAllRead }] = useMutation(
		MARK_ALL_NOTIFICATIONS_READ_MUTATION,
	);
	const [deleteNotification] = useMutation(DELETE_NOTIFICATION_MUTATION);
	const [deleteReadNotifications, { loading: deletingRead }] = useMutation(
		DELETE_READ_NOTIFICATIONS_MUTATION,
	);

	const notifications = data?.myNotifications ?? [];
	const unreadCount = unreadData?.unreadNotificationCount ?? 0;

	const refetchAll = async () => {
		await Promise.all([refetchNotifications(), refetchUnreadCount()]);
	};

	const handleMarkAllRead = async () => {
		await markAllNotificationsRead();
		await refetchAll();
	};

	const handleDeleteRead = async () => {
		await deleteReadNotifications();
		await refetchAll();
	};

	const handleDeleteNotification = async (id: string) => {
		setDeletingId(id);
		try {
			await deleteNotification({ variables: { id } });
			await refetchAll();
		} finally {
			setDeletingId(null);
		}
	};

	const handleNotificationClick = async (notification: AppNotification) => {
		if (!notification.isRead) {
			await markNotificationRead({ variables: { id: notification.id } });
			await refetchAll();
		}
		const route = notificationRoute(notification, user?.role);
		if (route && route !== ROUTES.ACCOUNT_NOTIFICATIONS) {
			navigate(route);
		}
	};

	if (loading && notifications.length === 0) {
		return <AppLoader fullPage />;
	}

	if (notifications.length === 0) {
		return (
			<Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 2, md: 3 }, py: 4 }}>
				<EmptyState
					icon={Icons.bell}
					title={t('notificationsPage.emptyTitle')}
					description={t('notificationsPage.emptyDescription')}
					actionLabel={t('cart.continueShopping')}
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
						{t('notificationsPage.title')}
					</Typography>
					<Typography sx={{ fontSize: 14, color: tokens.ink3, mt: '4px' }}>
						{t('notificationsPage.subtitle', { count: notifications.length, unread: unreadCount })}
					</Typography>
				</Box>
				<AppButton
					tone="ghost"
					onClick={() => navigate(ROUTES.ACCOUNT_ORDERS)}
					startIcon={<FontAwesomeIcon icon={Icons.chevronLeft} size="xs" />}
				>
					{t('notificationsPage.backToAccount')}
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
				<Box
					sx={{
						bgcolor: tokens.surface,
						border: `1px solid ${tokens.line}`,
						borderRadius: '12px',
						overflow: 'hidden',
					}}
				>
					<NotificationsPanel
						notifications={notifications}
						activeTab={activeTab}
						onTabChange={setActiveTab}
						unreadCount={unreadCount}
						locale={i18n.language}
						onMarkAllRead={() => void handleMarkAllRead()}
						markingAllRead={markingAllRead}
						onNotificationClick={(notification) => void handleNotificationClick(notification)}
						onDeleteNotification={(id) => void handleDeleteNotification(id)}
						deletingId={deletingId}
						variant="page"
						showFooter={false}
						maxHeight="none"
					/>
				</Box>

				<NotificationsSummary
					notifications={notifications}
					unreadCount={unreadCount}
					onMarkAllRead={() => void handleMarkAllRead()}
					markingAllRead={markingAllRead}
					onDeleteRead={() => void handleDeleteRead()}
					deletingRead={deletingRead}
				/>
			</Box>
		</Box>
	);
}
