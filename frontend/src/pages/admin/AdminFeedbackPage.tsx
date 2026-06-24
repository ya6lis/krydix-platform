import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@apollo/client';
import { Box, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { FeedbackCategory, FeedbackStatus } from '@/constants/enums';
import { Icons } from '@/constants/icons';
import { tokens } from '@/theme';
import { FeedbackDetailModal } from '@/components/feedback/FeedbackDetailModal';
import {
	AppCard,
	AppInput,
	AppPagination,
	AppSelect,
	AppTable,
	AppTableColumn,
	AppTabs,
	useAppToast,
} from '@/components/ui';
import {
	ADMIN_FEEDBACKS_QUERY,
	ADMIN_FEEDBACK_STATS_QUERY,
	type AdminFeedbacksData,
	type AdminFeedbacksVars,
	type FeedbackStats,
	type UserFeedbackItem,
} from '@/graphql/operations/feedback';

type StatusTab =
	| 'all'
	| 'new'
	| 'underReview'
	| 'acknowledged'
	| 'planned'
	| 'resolved'
	| 'dismissed';

const TAB_STATUS_MAP: Record<Exclude<StatusTab, 'all'>, FeedbackStatus> = {
	new: FeedbackStatus.NEW,
	underReview: FeedbackStatus.UNDER_REVIEW,
	acknowledged: FeedbackStatus.ACKNOWLEDGED,
	planned: FeedbackStatus.PLANNED,
	resolved: FeedbackStatus.RESOLVED,
	dismissed: FeedbackStatus.DISMISSED,
};

const PAGE_SIZE = 25;

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString(undefined, {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	});
}

function StatMini({ label, value }: { label: string; value: number }) {
	return (
		<Box
			sx={{
				bgcolor: tokens.surface,
				border: `1px solid ${tokens.line}`,
				borderRadius: '12px',
				p: '16px 18px',
			}}
		>
			<Typography
				sx={{
					fontSize: 11.5,
					color: tokens.ink3,
					fontWeight: 700,
					letterSpacing: '0.06em',
					textTransform: 'uppercase',
				}}
			>
				{label}
			</Typography>
			<Typography
				sx={{
					fontSize: 24,
					fontWeight: 800,
					letterSpacing: '-0.02em',
					mt: 0.75,
					lineHeight: 1,
					color: tokens.ink1,
				}}
			>
				{value.toLocaleString()}
			</Typography>
		</Box>
	);
}

export default function AdminFeedbackPage() {
	const { t } = useTranslation();
	const { showToast } = useAppToast();
	const [activeTab, setActiveTab] = useState<StatusTab>('all');
	const [search, setSearch] = useState('');
	const [categoryFilter, setCategoryFilter] = useState('ALL');
	const [page, setPage] = useState(0);
	const [selectedFeedback, setSelectedFeedback] = useState<UserFeedbackItem | null>(null);

	const { data: statsData, refetch: refetchStats } = useQuery<{
		adminFeedbackStats: FeedbackStats;
	}>(ADMIN_FEEDBACK_STATS_QUERY);

	const queryInput = useMemo(
		() => ({
			page,
			pageSize: PAGE_SIZE,
			search: search.trim() || undefined,
			category: categoryFilter === 'ALL' ? undefined : (categoryFilter as FeedbackCategory),
			status: activeTab === 'all' ? undefined : TAB_STATUS_MAP[activeTab],
		}),
		[activeTab, categoryFilter, page, search]
	);

	const { data, loading, refetch } = useQuery<AdminFeedbacksData, AdminFeedbacksVars>(
		ADMIN_FEEDBACKS_QUERY,
		{
			variables: { input: queryInput },
			fetchPolicy: 'cache-and-network',
		}
	);

	const stats = statsData?.adminFeedbackStats;
	const list = data?.adminFeedbacks;
	const items = list?.items ?? [];
	const total = list?.total ?? 0;

	const tabs = useMemo(
		() => [
			{ value: 'all', label: t('adminFeedback.tabs.all'), count: stats?.total },
			{ value: 'new', label: t('adminFeedback.tabs.new'), count: stats?.newCount },
			{
				value: 'underReview',
				label: t('adminFeedback.tabs.underReview'),
				count: stats?.underReviewCount,
			},
			{
				value: 'acknowledged',
				label: t('adminFeedback.tabs.acknowledged'),
				count: stats?.acknowledgedCount,
			},
			{ value: 'planned', label: t('adminFeedback.tabs.planned'), count: stats?.plannedCount },
			{ value: 'resolved', label: t('adminFeedback.tabs.resolved'), count: stats?.resolvedCount },
			{
				value: 'dismissed',
				label: t('adminFeedback.tabs.dismissed'),
				count: stats?.dismissedCount,
			},
		],
		[stats, t]
	);

	const columns: AppTableColumn<UserFeedbackItem>[] = [
		{
			key: 'createdAt',
			label: t('adminFeedback.table.date'),
			render: (row) => formatDate(row.createdAt),
		},
		{
			key: 'author',
			label: t('adminFeedback.table.user'),
			render: (row) => (
				<Box>
					<Typography sx={{ fontSize: 13, fontWeight: 700, color: tokens.ink1 }}>
						{row.authorName}
					</Typography>
					<Typography sx={{ fontSize: 12, color: tokens.ink3 }}>{row.authorEmail}</Typography>
				</Box>
			),
		},
		{
			key: 'category',
			label: t('adminFeedback.table.category'),
			render: (row) => t(`feedback.category.${row.category}`),
		},
		{
			key: 'subject',
			label: t('adminFeedback.table.subject'),
			render: (row) => (
				<Typography sx={{ fontSize: 13, fontWeight: 600, color: tokens.ink1 }}>
					{row.subject}
				</Typography>
			),
		},
		{
			key: 'status',
			label: t('adminFeedback.table.status'),
			render: (row) => t(`adminFeedback.status.${row.status}`),
		},
		{
			key: 'attachments',
			label: t('adminFeedback.table.attachments'),
			render: (row) => row.attachments.length,
		},
	];

	const handleRefresh = async () => {
		try {
			await Promise.all([refetch(), refetchStats()]);
		} catch {
			showToast(t('common.error'), 'error');
		}
	};

	return (
		<Box sx={{ p: { xs: 2, md: 3 } }}>
			<Box sx={{ mb: 3 }}>
				<Typography
					sx={{ fontSize: 24, fontWeight: 800, color: tokens.ink1, letterSpacing: '-0.02em' }}
				>
					{t('adminFeedback.pageTitle')}
				</Typography>
				<Typography sx={{ fontSize: 14, color: tokens.ink3, mt: 0.5 }}>
					{t('adminFeedback.pageSubtitle')}
				</Typography>
			</Box>

			<Box
				sx={{
					display: 'grid',
					gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(6, minmax(0, 1fr))' },
					gap: 1.5,
					mb: 2.5,
				}}
			>
				<StatMini label={t('adminFeedback.stats.total')} value={stats?.total ?? 0} />
				<StatMini label={t('adminFeedback.stats.new')} value={stats?.newCount ?? 0} />
				<StatMini
					label={t('adminFeedback.stats.underReview')}
					value={stats?.underReviewCount ?? 0}
				/>
				<StatMini
					label={t('adminFeedback.stats.acknowledged')}
					value={stats?.acknowledgedCount ?? 0}
				/>
				<StatMini label={t('adminFeedback.stats.planned')} value={stats?.plannedCount ?? 0} />
				<StatMini label={t('adminFeedback.stats.resolved')} value={stats?.resolvedCount ?? 0} />
			</Box>

			<AppCard disablePadding>
				<Box sx={{ px: 2.5 }}>
					<AppTabs
						tabs={tabs}
						value={activeTab}
						onChange={(tab) => {
							setActiveTab(tab as StatusTab);
							setPage(0);
						}}
					/>
				</Box>

				<Box
					sx={{
						px: 2.5,
						py: 1.75,
						display: 'grid',
						gridTemplateColumns: { xs: '1fr', md: '1fr 220px' },
						gap: 1.5,
						borderTop: `1px solid ${tokens.line2}`,
					}}
				>
					<AppInput
						size="small"
						placeholder={t('adminFeedback.filters.searchPlaceholder')}
						value={search}
						onChange={(event) => {
							setSearch(event.target.value);
							setPage(0);
						}}
						InputProps={{
							startAdornment: (
								<FontAwesomeIcon
									icon={Icons.search}
									color={tokens.ink3}
									style={{ marginRight: 8, fontSize: 12 }}
								/>
							),
						}}
					/>
					<AppSelect
						size="small"
						label={t('adminFeedback.filters.category')}
						value={categoryFilter}
						onChange={(event) => {
							setCategoryFilter(String(event.target.value));
							setPage(0);
						}}
						options={[
							{ value: 'ALL', label: t('common.all') },
							...Object.values(FeedbackCategory).map((value) => ({
								value,
								label: t(`feedback.category.${value}`),
							})),
						]}
						formControlProps={{ sx: { minWidth: 180 } }}
						fullWidth={false}
					/>
				</Box>

				<AppTable
					columns={columns}
					rows={items}
					loading={loading}
					rowKey={(row) => row.id}
					onRowClick={setSelectedFeedback}
					emptyTitle={t('adminFeedback.empty.title')}
					emptyDescription={t('adminFeedback.empty.description')}
				/>

				{total > PAGE_SIZE ? (
					<AppPagination
						page={page}
						pageSize={PAGE_SIZE}
						total={total}
						onChange={(nextPage) => setPage(nextPage)}
					/>
				) : null}
			</AppCard>

			<FeedbackDetailModal
				open={Boolean(selectedFeedback)}
				feedback={selectedFeedback}
				onClose={() => setSelectedFeedback(null)}
				onUpdated={() => void handleRefresh()}
			/>
		</Box>
	);
}
