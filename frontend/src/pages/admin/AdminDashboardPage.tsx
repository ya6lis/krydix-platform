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
import { ADMIN_STATS_QUERY } from '@/graphql/operations/adminUsers';
import { ADMIN_PRODUCT_STATS_QUERY } from '@/graphql/operations/adminProducts';
import { ADMIN_REVIEW_STATS_QUERY } from '@/graphql/operations/adminReviews';
import { PLATFORM_OVERVIEW_QUERY } from '@/graphql/operations/adminPlatform';
import { ADMIN_FEEDBACK_STATS_QUERY } from '@/graphql/operations/feedback';
import { AUDIT_LOGS_QUERY, type AuditLogItem } from '@/graphql/operations/adminAudit';

function formatMoney(value: number) {
	return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatAuditTime(iso: string) {
	return new Date(iso).toLocaleString(undefined, {
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit',
	});
}

export default function AdminDashboardPage() {
	const { t } = useTranslation();
	const { user } = useAuth();

	const { data: userStatsData } = useQuery(ADMIN_STATS_QUERY);
	const { data: productStatsData } = useQuery(ADMIN_PRODUCT_STATS_QUERY);
	const { data: reviewStatsData } = useQuery(ADMIN_REVIEW_STATS_QUERY);
	const { data: platformData } = useQuery(PLATFORM_OVERVIEW_QUERY);
	const { data: feedbackStatsData } = useQuery(ADMIN_FEEDBACK_STATS_QUERY);
	const { data: auditData } = useQuery(AUDIT_LOGS_QUERY, {
		variables: { input: { page: 1, pageSize: 5, datePreset: 'LAST_7_DAYS' } },
	});

	const userStats = userStatsData?.adminStats;
	const productStats = productStatsData?.adminProductStats;
	const reviewStats = reviewStatsData?.adminReviewStats;
	const platform = platformData?.platformOverview;
	const feedbackStats = feedbackStatsData?.adminFeedbackStats;
	const auditItems = (auditData?.auditLogs?.items ?? []) as AuditLogItem[];

	const criticalFeedback = (feedbackStats?.newCount ?? 0) + (feedbackStats?.underReviewCount ?? 0);

	const alerts = useMemo(() => {
		const items = [];
		if (criticalFeedback > 0) {
			items.push({
				id: 'feedback',
				messageKey: 'adminDashboard.alerts.feedback',
				messageParams: { count: criticalFeedback },
				href: ROUTES.FEEDBACK,
				tone: 'warning' as const,
				icon: Icons.chat,
			});
		}
		if ((productStats?.blocked ?? 0) > 0) {
			items.push({
				id: 'blockedProducts',
				messageKey: 'adminDashboard.alerts.blockedProducts',
				messageParams: { count: productStats!.blocked },
				href: ROUTES.MANAGE_PRODUCTS,
				tone: 'danger' as const,
				icon: Icons.warning,
			});
		}
		if ((userStats?.blocked ?? 0) > 0) {
			items.push({
				id: 'blockedUsers',
				messageKey: 'adminDashboard.alerts.blockedUsers',
				messageParams: { count: userStats!.blocked },
				href: ROUTES.USERS,
				tone: 'danger' as const,
				icon: Icons.users,
			});
		}
		return items;
	}, [criticalFeedback, productStats, userStats]);

	return (
		<Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
			<DashboardWelcomeHeader
				name={user?.profile?.firstName}
				role={Role.ADMIN}
				subtitleKey="adminDashboard.subtitle"
			/>

			<DashboardAlertBanner alerts={alerts} />

			<Grid container spacing={2.5} sx={{ mb: 2.5 }}>
				<Grid item xs={6} md={3}>
					<StatCard
						icon={Icons.users}
						label={t('adminDashboard.stats.totalUsers')}
						value={userStats?.total ?? '—'}
						tone="accent"
					/>
				</Grid>
				<Grid item xs={6} md={3}>
					<StatCard
						icon={Icons.store}
						label={t('adminDashboard.stats.sellers')}
						value={userStats?.sellers ?? '—'}
						tone="cyan"
					/>
				</Grid>
				<Grid item xs={6} md={3}>
					<StatCard
						icon={Icons.products}
						label={t('adminDashboard.stats.products')}
						value={productStats?.total ?? '—'}
						tone="amber"
					/>
				</Grid>
				<Grid item xs={6} md={3}>
					<StatCard
						icon={Icons.wallet}
						label={t('adminDashboard.stats.revenue30d')}
						value={platform ? formatMoney(platform.platformRevenue30d) : '—'}
						tone="coral"
					/>
				</Grid>
			</Grid>

			<Grid container spacing={2.5} sx={{ mb: 2.5 }}>
				<Grid item xs={12} md={6}>
					<DashboardSectionCard
						titleKey="adminDashboard.platform.title"
						subtitleKey="adminDashboard.platform.subtitle"
						actionLabelKey="dashboard.common.openSettings"
						actionHref={ROUTES.SETTINGS}
					>
						<Stack spacing={1.25}>
							<MetricRow
								label={t('adminDashboard.platform.gmv')}
								value={platform ? formatMoney(platform.grossMerchandiseValue30d) : '—'}
							/>
							<MetricRow
								label={t('adminDashboard.platform.newUsers')}
								value={userStats?.newThisMonth ?? 0}
							/>
							<MetricRow
								label={t('adminDashboard.platform.newSellers')}
								value={platform?.newSellersThisMonth ?? 0}
							/>
							<MetricRow
								label={t('adminDashboard.platform.newProducts')}
								value={productStats?.newThisMonth ?? 0}
							/>
							<MetricRow
								label={t('adminDashboard.platform.activeSellers')}
								value={platform?.activeSellers ?? 0}
							/>
						</Stack>
					</DashboardSectionCard>
				</Grid>

				<Grid item xs={12} md={6}>
					<DashboardSectionCard
						titleKey="adminDashboard.critical.title"
						subtitleKey="adminDashboard.critical.subtitle"
					>
						<Stack spacing={1.25}>
							<CriticalRow
								label={t('adminDashboard.critical.feedback')}
								count={criticalFeedback}
								href={ROUTES.FEEDBACK}
							/>
							<CriticalRow
								label={t('adminDashboard.critical.blockedUsers')}
								count={userStats?.blocked ?? 0}
								href={ROUTES.USERS}
							/>
							<CriticalRow
								label={t('adminDashboard.critical.rejectedProducts')}
								count={productStats?.rejected ?? 0}
								href={ROUTES.MANAGE_PRODUCTS}
							/>
							<CriticalRow
								label={t('adminDashboard.critical.pendingReviews')}
								count={reviewStats?.pending ?? 0}
								href={ROUTES.MANAGE_REVIEWS}
							/>
							<CriticalRow
								label={t('adminDashboard.critical.flaggedReviews')}
								count={reviewStats?.flagged ?? 0}
								href={ROUTES.MANAGE_REVIEWS}
							/>
						</Stack>
					</DashboardSectionCard>
				</Grid>
			</Grid>

			<DashboardSectionCard
				titleKey="adminDashboard.audit.title"
				subtitleKey="adminDashboard.audit.subtitle"
				actionLabelKey="dashboard.common.viewAll"
				actionHref={ROUTES.AUDIT}
			>
				{auditItems.length === 0 ? (
					<EmptyState
						icon={Icons.file}
						title={t('adminDashboard.audit.empty')}
						description={t('adminDashboard.audit.emptyDesc')}
					/>
				) : (
					<Stack spacing={1.25}>
						{auditItems.map((item) => (
							<Box
								key={item.id}
								sx={{
									display: 'flex',
									alignItems: 'flex-start',
									justifyContent: 'space-between',
									gap: 2,
									p: 1.5,
									borderRadius: 1.5,
									border: `1px solid ${tokens.line}`,
								}}
							>
								<Box>
									<Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>
										{item.actor.displayName} {item.description}
									</Typography>
									<Typography sx={{ fontSize: 12, color: tokens.ink3, mt: 0.25 }}>
										{item.targetLabel}
									</Typography>
								</Box>
								<Typography sx={{ fontSize: 11, color: tokens.ink3, flexShrink: 0 }}>
									{formatAuditTime(item.createdAt)}
								</Typography>
							</Box>
						))}
					</Stack>
				)}
			</DashboardSectionCard>

			<Box sx={{ mt: 2.5 }}>
				<DashboardQuickActions
					titleKey="adminDashboard.quickActions.title"
					actions={[
						{
							id: 'categories',
							labelKey: 'adminDashboard.quickActions.categories',
							href: ROUTES.CATEGORIES,
							icon: Icons.category,
						},
						{
							id: 'users',
							labelKey: 'adminDashboard.quickActions.users',
							href: ROUTES.USERS,
							icon: Icons.users,
							tone: 'cyan',
						},
						{
							id: 'products',
							labelKey: 'adminDashboard.quickActions.products',
							href: ROUTES.MANAGE_PRODUCTS,
							icon: Icons.products,
							tone: 'amber',
						},
						{
							id: 'settings',
							labelKey: 'adminDashboard.quickActions.settings',
							href: ROUTES.SETTINGS,
							icon: Icons.settings,
							tone: 'coral',
						},
					]}
				/>
			</Box>
		</Box>
	);
}

function MetricRow({ label, value }: { label: string; value: string | number }) {
	return (
		<Box
			sx={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				p: 1.25,
				borderRadius: 1.5,
				bgcolor: tokens.surface2,
			}}
		>
			<Typography sx={{ fontSize: 13, color: tokens.ink2 }}>{label}</Typography>
			<Typography sx={{ fontSize: 14, fontWeight: 700 }}>{value}</Typography>
		</Box>
	);
}

function CriticalRow({ label, count, href }: { label: string; count: number; href: string }) {
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
				color: tokens.ink1,
				'&:hover': { borderColor: tokens.accent },
			}}
		>
			<Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{label}</Typography>
			<Typography
				sx={{
					fontSize: 13,
					fontWeight: 700,
					color: count > 0 ? tokens.coralInk : tokens.ink3,
				}}
			>
				{count}
			</Typography>
		</Link>
	);
}
