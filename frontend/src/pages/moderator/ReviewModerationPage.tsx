import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@apollo/client';
import { Box, Grid, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { Icons } from '@/constants/icons';
import { tokens } from '@/theme';
import {
	AppButton,
	AppCard,
	AppInput,
	AppPagination,
	AppSelect,
	AppTabs,
	EmptyState,
} from '@/components/ui';
import { useAppToast } from '@/components/ui/AppToast';
import {
	ModerationReviewCard,
	ModerationReviewCardSkeleton,
} from '@/components/reviews/ModerationReviewCard';
import {
	MODERATION_REVIEWS_QUERY,
	APPROVE_REVIEW_MUTATION,
	HIDE_REVIEW_MUTATION,
} from '@/graphql/operations/reviewModeration';
import type {
	ModerationReviewItem,
	ModerationReviewsData,
	ModerationReviewsVars,
	ModerationReviewTab,
	ModerationReviewTarget,
} from '@/graphql/operations/reviewModeration';

type ActiveTab = 'pending' | 'flagged' | 'approved' | 'hidden';

const TAB_MAP: Record<ActiveTab, ModerationReviewTab> = {
	pending: 'PENDING',
	flagged: 'FLAGGED',
	approved: 'APPROVED',
	hidden: 'HIDDEN',
};

const PAGE_SIZE = 6;

export default function ReviewModerationPage() {
	const { t } = useTranslation();
	const { showToast } = useAppToast();

	const [activeTab, setActiveTab] = useState<ActiveTab>('pending');
	const [search, setSearch] = useState('');
	const [targetFilter, setTargetFilter] = useState<ModerationReviewTarget>('ALL');
	const [ratingFilter, setRatingFilter] = useState('ALL');
	const [page, setPage] = useState(0);
	const [actionId, setActionId] = useState<string | null>(null);

	const tab = TAB_MAP[activeTab];
	const showActions = activeTab === 'pending' || activeTab === 'flagged';

	const { data, loading, refetch } = useQuery<ModerationReviewsData, ModerationReviewsVars>(
		MODERATION_REVIEWS_QUERY,
		{
			variables: {
				input: {
					tab,
					search: search || undefined,
					target: targetFilter,
					ratingFilter: ratingFilter === 'ALL' ? undefined : ratingFilter,
					page: page + 1,
					pageSize: PAGE_SIZE,
				},
			},
			fetchPolicy: 'cache-and-network',
		},
	);

	const [approveReviewMutation] = useMutation(APPROVE_REVIEW_MUTATION);
	const [hideReviewMutation] = useMutation(HIDE_REVIEW_MUTATION);

	const items = useMemo(() => data?.moderationReviews.items ?? [], [data]);
	const total = data?.moderationReviews.total ?? 0;
	const pendingCount = data?.moderationReviews.pendingCount ?? 0;
	const flaggedCount = data?.moderationReviews.flaggedCount ?? 0;
	const approvedCount = data?.moderationReviews.approvedCount ?? 0;
	const hiddenCount = data?.moderationReviews.hiddenCount ?? 0;

	const tabs = [
		{ value: 'pending', label: t('reviewModeration.tabs.pending'), count: pendingCount },
		{ value: 'flagged', label: t('reviewModeration.tabs.flagged'), count: flaggedCount },
		{ value: 'approved', label: t('reviewModeration.tabs.approved'), count: approvedCount },
		{ value: 'hidden', label: t('reviewModeration.tabs.hidden'), count: hiddenCount },
	];

	const targetOptions = [
		{ value: 'ALL', label: t('reviewModeration.filters.targetAll') },
		{ value: 'PRODUCT', label: t('reviewModeration.filters.targetProduct') },
		{ value: 'SELLER', label: t('reviewModeration.filters.targetSeller') },
		{ value: 'BUYER', label: t('reviewModeration.filters.targetBuyer') },
	];

	const ratingOptions = [
		{ value: 'ALL', label: t('reviewModeration.filters.ratingAll') },
		{ value: '5', label: t('reviewModeration.filters.rating5') },
		{ value: '4', label: t('reviewModeration.filters.rating4') },
		{ value: '3', label: t('reviewModeration.filters.rating3') },
		{ value: '1-2', label: t('reviewModeration.filters.ratingLow') },
	];

	const handleTabChange = (tabValue: string) => {
		setActiveTab(tabValue as ActiveTab);
		setPage(0);
	};

	const handleApprove = useCallback(
		async (id: string) => {
			setActionId(id);
			try {
				await approveReviewMutation({ variables: { id } });
				showToast(t('reviewModeration.toast.approved'), 'success');
				await refetch();
			} catch {
				showToast(t('reviewModeration.toast.approveError'), 'error');
			} finally {
				setActionId(null);
			}
		},
		[approveReviewMutation, showToast, t, refetch],
	);

	const handleHide = useCallback(
		async (id: string) => {
			setActionId(id);
			try {
				await hideReviewMutation({ variables: { id } });
				showToast(t('reviewModeration.toast.hidden'), 'info');
				await refetch();
			} catch {
				showToast(t('reviewModeration.toast.hideError'), 'error');
			} finally {
				setActionId(null);
			}
		},
		[hideReviewMutation, showToast, t, refetch],
	);

	return (
		<Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
			<Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, gap: 2 }}>
				<Box>
					<Typography variant="h5" fontWeight={700} color={tokens.ink1}>
						{t('reviewModeration.pageTitle')}
					</Typography>
					<Typography sx={{ fontSize: 13, color: tokens.ink3, mt: 0.5 }}>
						{t('reviewModeration.pageSubtitle')}
					</Typography>
				</Box>
				<AppButton tone="ghost" size="small" startIcon={<FontAwesomeIcon icon={Icons.download} />}>
					{t('reviewModeration.exportBtn')}
				</AppButton>
			</Box>

			<AppCard disablePadding>
				<Box sx={{ px: 2.5 }}>
					<AppTabs tabs={tabs} value={activeTab} onChange={handleTabChange} />
				</Box>

				<Box
					sx={{
						px: 2.5,
						py: 1.75,
						display: 'flex',
						alignItems: 'center',
						gap: 1.5,
						flexWrap: 'wrap',
						borderTop: `1px solid ${tokens.line2}`,
					}}
				>
					<AppInput
						size="small"
						placeholder={t('reviewModeration.searchPlaceholder')}
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
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
						sx={{ flex: 1, minWidth: 220 }}
					/>
					<AppSelect
						value={targetFilter}
						onChange={(e) => {
							setTargetFilter(e.target.value as ModerationReviewTarget);
							setPage(0);
						}}
						options={targetOptions}
						formControlProps={{ sx: { minWidth: 160 } }}
						fullWidth={false}
					/>
					<AppSelect
						value={ratingFilter}
						onChange={(e) => {
							setRatingFilter(String(e.target.value));
							setPage(0);
						}}
						options={ratingOptions}
						formControlProps={{ sx: { minWidth: 140 } }}
						fullWidth={false}
					/>
				</Box>
			</AppCard>

			<Box sx={{ height: 24 }} />

			{loading && items.length === 0 ? (
				<Grid container spacing={2.5}>
					{Array.from({ length: 4 }).map((_, i) => (
						<Grid item xs={12} md={6} key={i}>
							<ModerationReviewCardSkeleton />
						</Grid>
					))}
				</Grid>
			) : items.length === 0 ? (
				<EmptyState
					icon={Icons.star}
					title={t('reviewModeration.empty.title')}
					description={t('reviewModeration.empty.description')}
				/>
			) : (
				<>
					<Grid container spacing={2.5}>
						{items.map((review: ModerationReviewItem) => (
							<Grid item xs={12} md={6} key={review.id}>
								<ModerationReviewCard
									review={review}
									onApprove={handleApprove}
									onHide={handleHide}
									approving={actionId === review.id}
									hiding={actionId === review.id}
									showActions={showActions}
								/>
							</Grid>
						))}
					</Grid>

					{total > PAGE_SIZE && (
						<Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
							<AppPagination
								page={page}
								pageSize={PAGE_SIZE}
								total={total}
								pageSizeOptions={[6, 12, 24]}
								onChange={(nextPage) => setPage(nextPage)}
							/>
						</Box>
					)}
				</>
			)}
		</Box>
	);
}
