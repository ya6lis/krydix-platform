import { Link as RouterLink } from 'react-router-dom';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@apollo/client';
import { Box, Grid, Stack, Typography, Link } from '@mui/material';

import {
	DashboardWelcomeHeader,
	DashboardAlertBanner,
	DashboardSectionCard,
	DashboardQuickActions,
} from '@/components/dashboard';
import { EmptyState, StatCard } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { tokens } from '@/theme';
import { ROUTES } from '@/constants/routes';
import { Role } from '@/constants/enums';
import { useAuth } from '@/hooks/useAuth';
import { MODERATION_QUEUE_QUERY } from '@/graphql/operations/moderation';
import { MODERATION_REVIEWS_QUERY } from '@/graphql/operations/reviewModeration';
import { SUPPORT_QUEUE_QUERY, UNREAD_MESSAGE_COUNT_QUERY } from '@/graphql/operations/chat';
import {
	MY_NOTIFICATIONS_QUERY,
	UNREAD_NOTIFICATION_COUNT_QUERY,
} from '@/graphql/operations/notifications';
import { MY_AUDIT_LOGS_QUERY, type AuditLogItem } from '@/graphql/operations/adminAudit';
import type { AppNotification } from '@/types/notification';
import {
	formatNotificationTime,
	notificationDisplayText,
	notificationRoute,
} from '@/utils/notificationUtils';

function formatAuditTime(iso: string) {
	return new Date(iso).toLocaleString(undefined, {
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit',
	});
}

export default function ModeratorDashboardPage() {
	const { t, i18n } = useTranslation();
	const { user } = useAuth();

	const { data: productQueueData } = useQuery(MODERATION_QUEUE_QUERY, {
		variables: { input: { filterType: 'PENDING', page: 1, pageSize: 1 } },
	});
	const { data: reviewData } = useQuery(MODERATION_REVIEWS_QUERY, {
		variables: { input: { page: 1, pageSize: 1 } },
	});
	const { data: supportData } = useQuery(SUPPORT_QUEUE_QUERY, {
		variables: { filter: { status: 'OPEN', page: 1, pageSize: 1 } },
	});
	const { data: supportProgressData } = useQuery(SUPPORT_QUEUE_QUERY, {
		variables: { filter: { status: 'IN_PROGRESS', page: 1, pageSize: 1 } },
	});
	const { data: auditData } = useQuery(MY_AUDIT_LOGS_QUERY, { variables: { limit: 5 } });
	const { data: notifData } = useQuery<{ myNotifications: AppNotification[] }>(
		MY_NOTIFICATIONS_QUERY,
		{ variables: { limit: 5 } },
	);
	const { data: unreadNotifData } = useQuery(UNREAD_NOTIFICATION_COUNT_QUERY);
	const { data: unreadMsgData } = useQuery(UNREAD_MESSAGE_COUNT_QUERY);

	const pendingProducts = productQueueData?.moderationQueue?.pendingCount ?? 0;
	const pendingReviews = reviewData?.moderationReviews?.pendingCount ?? 0;
	const flaggedReviews = reviewData?.moderationReviews?.flaggedCount ?? 0;
	const openSupport = supportData?.supportQueue?.total ?? 0;
	const inProgressSupport = supportProgressData?.supportQueue?.total ?? 0;
	const recentActions = (auditData?.myAuditLogs?.items ?? []) as AuditLogItem[];
	const notifications = notifData?.myNotifications ?? [];

	const alerts = useMemo(() => {
		const items = [];
		if (pendingProducts > 0) {
			items.push({
				id: 'products',
				messageKey: 'moderatorDashboard.alerts.pendingProducts',
				messageParams: { count: pendingProducts },
				href: ROUTES.MODERATOR_PRODUCT_MODERATION,
				tone: 'warning' as const,
				icon: Icons.clipboardCheck,
			});
		}
		if (flaggedReviews > 0) {
			items.push({
				id: 'reviews',
				messageKey: 'moderatorDashboard.alerts.flaggedReviews',
				messageParams: { count: flaggedReviews },
				href: ROUTES.MODERATOR_REVIEW_MODERATION,
				tone: 'danger' as const,
				icon: Icons.star,
			});
		}
		if (openSupport > 0) {
			items.push({
				id: 'support',
				messageKey: 'moderatorDashboard.alerts.openSupport',
				messageParams: { count: openSupport },
				href: ROUTES.MODERATOR_SUPPORT,
				tone: 'warning' as const,
				icon: Icons.chat,
			});
		}
		return items;
	}, [pendingProducts, flaggedReviews, openSupport]);

	return (
		<Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
			<DashboardWelcomeHeader
				name={user?.profile?.firstName}
				role={Role.MODERATOR}
				subtitleKey="moderatorDashboard.subtitle"
			/>

			<DashboardAlertBanner alerts={alerts} />

			<Grid container spacing={2.5} sx={{ mb: 2.5 }}>
				<Grid item xs={6} md={3}>
					<StatCard
						icon={Icons.clipboardCheck}
						label={t('moderatorDashboard.stats.pendingProducts')}
						value={pendingProducts}
						tone="accent"
					/>
				</Grid>
				<Grid item xs={6} md={3}>
					<StatCard
						icon={Icons.star}
						label={t('moderatorDashboard.stats.pendingReviews')}
						value={pendingReviews}
						tone="amber"
					/>
				</Grid>
				<Grid item xs={6} md={3}>
					<StatCard
						icon={Icons.chat}
						label={t('moderatorDashboard.stats.supportOpen')}
						value={openSupport + inProgressSupport}
						tone="cyan"
					/>
				</Grid>
				<Grid item xs={6} md={3}>
					<StatCard
						icon={Icons.bell}
						label={t('moderatorDashboard.stats.systemAlerts')}
						value={unreadNotifData?.unreadNotificationCount ?? 0}
						tone="coral"
					/>
				</Grid>
			</Grid>

			<Grid container spacing={2.5} sx={{ mb: 2.5 }}>
				<Grid item xs={12} md={6}>
					<DashboardSectionCard
						titleKey="moderatorDashboard.queue.title"
						subtitleKey="moderatorDashboard.queue.subtitle"
						actionLabelKey="dashboard.common.openQueue"
						actionHref={ROUTES.MODERATOR_PRODUCT_MODERATION}
					>
						<Stack spacing={1.25}>
							<QueueRow
								label={t('moderatorDashboard.queue.products')}
								count={pendingProducts}
								href={ROUTES.MODERATOR_PRODUCT_MODERATION}
							/>
							<QueueRow
								label={t('moderatorDashboard.queue.reviews')}
								count={pendingReviews}
								href={ROUTES.MODERATOR_REVIEW_MODERATION}
							/>
							<QueueRow
								label={t('moderatorDashboard.queue.flaggedReviews')}
								count={flaggedReviews}
								href={ROUTES.MODERATOR_REVIEW_MODERATION}
							/>
							<QueueRow
								label={t('moderatorDashboard.queue.support')}
								count={openSupport + inProgressSupport}
								href={ROUTES.MODERATOR_SUPPORT}
							/>
							<QueueRow
								label={t('moderatorDashboard.queue.verifications')}
								count={0}
								href={ROUTES.MODERATOR_VERIFICATION}
								muted
							/>
							<QueueRow
								label={t('moderatorDashboard.queue.complaints')}
								count={0}
								href={ROUTES.MODERATOR_COMPLAINTS}
								muted
							/>
						</Stack>
					</DashboardSectionCard>
				</Grid>

				<Grid item xs={12} md={6}>
					<DashboardSectionCard
						titleKey="moderatorDashboard.recentActions.title"
						subtitleKey="moderatorDashboard.recentActions.subtitle"
					>
						{recentActions.length === 0 ? (
							<EmptyState
								icon={Icons.file}
								title={t('moderatorDashboard.recentActions.empty')}
								description={t('moderatorDashboard.recentActions.emptyDesc')}
							/>
						) : (
							<Stack spacing={1.25}>
								{recentActions.map((item) => (
									<Box
										key={item.id}
										sx={{
											p: 1.5,
											borderRadius: 1.5,
											border: `1px solid ${tokens.line}`,
										}}
									>
										<Typography sx={{ fontSize: 13, fontWeight: 600 }}>
											{item.description} · {item.targetLabel}
										</Typography>
										<Typography sx={{ fontSize: 12, color: tokens.ink3, mt: 0.25 }}>
											{formatAuditTime(item.createdAt)}
										</Typography>
									</Box>
								))}
							</Stack>
						)}
					</DashboardSectionCard>
				</Grid>
			</Grid>

			<Grid container spacing={2.5} sx={{ mb: 2.5 }}>
				<Grid item xs={12} md={6}>
					<DashboardSectionCard
						titleKey="moderatorDashboard.messages.title"
						actionLabelKey="dashboard.common.open"
						actionHref={ROUTES.MODERATOR_SUPPORT}
					>
						<StatCard
							icon={Icons.chats}
							label={t('moderatorDashboard.messages.unread')}
							value={unreadMsgData?.unreadMessageCount ?? 0}
							tone="cyan"
						/>
					</DashboardSectionCard>
				</Grid>
				<Grid item xs={12} md={6}>
					<DashboardSectionCard
						titleKey="moderatorDashboard.notifications.title"
						actionLabelKey="dashboard.common.viewAll"
						actionHref={ROUTES.ACCOUNT_NOTIFICATIONS}
					>
						{notifications.length === 0 ? (
							<EmptyState
								icon={Icons.bell}
								title={t('moderatorDashboard.notifications.empty')}
								description={t('moderatorDashboard.notifications.emptyDesc')}
							/>
						) : (
							<Stack spacing={1.25}>
								{notifications.map((notification) => {
									const display = notificationDisplayText(notification, t);
									const href =
										notificationRoute(notification, Role.MODERATOR) ??
										ROUTES.ACCOUNT_NOTIFICATIONS;
									return (
										<Link
											key={notification.id}
											component={RouterLink}
											to={href}
											sx={{
												display: 'block',
												p: 1.25,
												borderRadius: 1.5,
												border: `1px solid ${tokens.line}`,
												color: tokens.ink1,
											}}
										>
											<Typography sx={{ fontSize: 13, fontWeight: 600 }}>
												{display.title}
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
				</Grid>
			</Grid>

			<DashboardQuickActions
				titleKey="moderatorDashboard.quickActions.title"
				actions={[
					{
						id: 'products',
						labelKey: 'moderatorDashboard.quickActions.products',
						href: ROUTES.MODERATOR_PRODUCT_MODERATION,
						icon: Icons.clipboardCheck,
					},
					{
						id: 'reviews',
						labelKey: 'moderatorDashboard.quickActions.reviews',
						href: ROUTES.MODERATOR_REVIEW_MODERATION,
						icon: Icons.star,
					},
					{
						id: 'support',
						labelKey: 'moderatorDashboard.quickActions.support',
						href: ROUTES.MODERATOR_SUPPORT,
						icon: Icons.chat,
						tone: 'cyan',
					},
					{
						id: 'users',
						labelKey: 'moderatorDashboard.quickActions.users',
						href: ROUTES.MODERATOR_USERS,
						icon: Icons.users,
						tone: 'amber',
					},
				]}
			/>
		</Box>
	);
}

function QueueRow({
	label,
	count,
	href,
	muted,
}: {
	label: string;
	count: number;
	href: string;
	muted?: boolean;
}) {
	return (
		<Link
			component={RouterLink}
			to={href}
			underline="none"
			sx={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				p: 1.5,
				borderRadius: 1.5,
				border: `1px solid ${tokens.line}`,
				color: muted ? tokens.ink3 : tokens.ink1,
				'&:hover': { borderColor: tokens.accent },
			}}
		>
			<Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{label}</Typography>
			<Typography
				sx={{
					fontSize: 13,
					fontWeight: 700,
					color: count > 0 && !muted ? tokens.accent : tokens.ink3,
				}}
			>
				{count}
			</Typography>
		</Link>
	);
}
