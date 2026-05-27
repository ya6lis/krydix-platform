import { useCallback, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@apollo/client';
import { Box, IconButton, Menu, MenuItem, Stack, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { Icons } from '@/constants/icons';
import { ROUTES } from '@/constants/routes';
import { tokens } from '@/theme';
import { Role } from '@/constants/enums';
import { useAuth } from '@/hooks/useAuth';
import {
	AppAvatar,
	AppCard,
	AppInput,
	AppPagination,
	AppSelect,
	AppTabs,
	AppTable,
	AppTableColumn,
	ConfirmDialog,
	StatusBadge,
	useAppToast,
	AppImage,
} from '@/components/ui';
import {
	ADMIN_REVIEW_STATS_QUERY,
	ALL_REVIEWS_QUERY,
	CHANGE_ADMIN_REVIEW_STATUS_MUTATION,
	ADMIN_DELETE_REVIEW_MUTATION,
} from '@/graphql/operations/adminReviews';
import type {
	AdminReviewItem,
	AdminReviewStatsData,
	AllReviewsData,
	AllReviewsVars,
	AdminReviewStatusFilter,
} from '@/graphql/operations/adminReviews';

type StatusTab = 'all' | 'pending' | 'flagged' | 'approved' | 'blocked' | 'deleted';

const TAB_STATUS_MAP: Record<StatusTab, AdminReviewStatusFilter> = {
	all: 'ALL',
	pending: 'PENDING',
	flagged: 'FLAGGED',
	approved: 'APPROVED',
	blocked: 'BLOCKED',
	deleted: 'DELETED',
};

const ASSIGNABLE_STATUSES = ['PENDING', 'APPROVED', 'BLOCKED'] as const;
const PAGE_SIZE = 25;

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString(undefined, {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	});
}

function excerpt(text: string | null, max = 80): string {
	if (!text?.trim()) return '—';
	return text.length <= max ? text : `${text.slice(0, max)}…`;
}

function StatMini({ label, value, delta }: { label: string; value: number; delta?: string }) {
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
			{delta && (
				<Typography sx={{ fontSize: 11.5, color: tokens.ink3, mt: 0.5 }}>{delta}</Typography>
			)}
		</Box>
	);
}

interface RowMenuProps {
	review: AdminReviewItem;
	isAdmin: boolean;
	onDelete: () => void;
}

function RowMenu({ review, isAdmin, onDelete }: RowMenuProps) {
	const { t } = useTranslation();
	const [anchor, setAnchor] = useState<null | HTMLElement>(null);

	if (!isAdmin || review.isDeleted) return null;

	return (
		<>
			<IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)}>
				<FontAwesomeIcon icon={Icons.more} size="xs" />
			</IconButton>
			<Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
				<MenuItem
					onClick={() => {
						setAnchor(null);
						onDelete();
					}}
					sx={{ fontSize: 13, color: tokens.coralInk }}
				>
					{t('adminReviews.actions.softDelete')}
				</MenuItem>
			</Menu>
		</>
	);
}

export default function ReviewsManagementPage() {
	const { t } = useTranslation();
	const { showToast } = useAppToast();
	const { hasRole } = useAuth();
	const isAdmin = hasRole(Role.ADMIN);

	const [activeTab, setActiveTab] = useState<StatusTab>('all');
	const [search, setSearch] = useState('');
	const [ratingFilter, setRatingFilter] = useState('ALL');
	const [page, setPage] = useState(0);
	const [deleteTarget, setDeleteTarget] = useState<AdminReviewItem | null>(null);

	const { data: statsData } = useQuery<AdminReviewStatsData>(ADMIN_REVIEW_STATS_QUERY);
	const { data, loading, refetch } = useQuery<AllReviewsData, AllReviewsVars>(ALL_REVIEWS_QUERY, {
		variables: {
			input: {
				statusFilter: TAB_STATUS_MAP[activeTab],
				ratingFilter: ratingFilter === 'ALL' ? undefined : ratingFilter,
				search: search || undefined,
				page: page + 1,
				pageSize: PAGE_SIZE,
			},
		},
		fetchPolicy: 'cache-and-network',
	});

	const [changeStatus] = useMutation(CHANGE_ADMIN_REVIEW_STATUS_MUTATION);
	const [deleteReview] = useMutation(ADMIN_DELETE_REVIEW_MUTATION);

	const stats = statsData?.adminReviewStats;
	const list = data?.allReviews;
	const items = list?.items ?? [];
	const total = list?.total ?? 0;
	const tabCounts = list?.tabCounts;

	const userProfileHref = (userId: string) =>
		ROUTES.USER(userId);

	const tabs = useMemo(
		() => [
			{ value: 'all', label: t('adminReviews.tabs.all'), count: tabCounts?.all },
			{ value: 'pending', label: t('adminReviews.tabs.pending'), count: tabCounts?.pending },
			{ value: 'flagged', label: t('adminReviews.tabs.flagged'), count: tabCounts?.flagged },
			{ value: 'approved', label: t('adminReviews.tabs.approved'), count: tabCounts?.approved },
			{ value: 'blocked', label: t('adminReviews.tabs.blocked'), count: tabCounts?.blocked },
			{ value: 'deleted', label: t('adminReviews.tabs.deleted'), count: tabCounts?.deleted },
		],
		[t, tabCounts],
	);

	const ratingOptions = [
		{ value: 'ALL', label: t('adminReviews.filters.ratingAll') },
		{ value: '5', label: t('adminReviews.filters.rating5') },
		{ value: '4', label: t('adminReviews.filters.rating4') },
		{ value: '3', label: t('adminReviews.filters.rating3') },
		{ value: '1-2', label: t('adminReviews.filters.ratingLow') },
	];

	const handleStatusChange = useCallback(
		async (reviewId: string, status: string) => {
			try {
				await changeStatus({ variables: { id: reviewId, status } });
				showToast(t('adminReviews.toast.statusChanged'), 'success');
				await refetch();
			} catch {
				showToast(t('adminReviews.toast.statusChangeError'), 'error');
			}
		},
		[changeStatus, showToast, t, refetch],
	);

	const handleDelete = useCallback(async () => {
		if (!deleteTarget) return;
		try {
			await deleteReview({ variables: { id: deleteTarget.id } });
			showToast(t('adminReviews.toast.deleted'), 'info');
			setDeleteTarget(null);
			await refetch();
		} catch {
			showToast(t('adminReviews.toast.deleteError'), 'error');
		}
	}, [deleteTarget, deleteReview, showToast, t, refetch]);

	const columns: AppTableColumn<AdminReviewItem>[] = [
		{
			key: 'review',
			label: t('adminReviews.table.review'),
			render: (row) => (
				<Box
					component={RouterLink}
					to={userProfileHref(row.reviewerId)}
					sx={{
						display: 'flex',
						alignItems: 'flex-start',
						gap: 1.5,
						textDecoration: 'none',
						color: 'inherit',
					}}
				>
					<AppAvatar
						name={row.reviewerName}
						size="sm"
						src={row.reviewerAvatarUrl ?? undefined}
					/>
					<Box>
						<Typography sx={{ fontWeight: 700, fontSize: 14 }}>{row.reviewerName}</Typography>
						<Typography sx={{ fontSize: 12, color: tokens.ink3, mb: 0.5 }}>
							{row.reviewRef} · {row.reviewerEmail}
						</Typography>
						<Typography sx={{ fontSize: 13, color: tokens.ink2, lineHeight: 1.45 }}>
							{excerpt(row.text)}
						</Typography>
					</Box>
				</Box>
			),
		},
		{
			key: 'product',
			label: t('adminReviews.table.product'),
			render: (row) => (
				<Box
					component={RouterLink}
					to={ROUTES.PRODUCT(row.productSlug)}
					sx={{
						display: 'flex',
						alignItems: 'center',
						gap: 1.25,
						textDecoration: 'none',
						color: 'inherit',
					}}
				>
					<Box
						sx={{
							width: 40,
							height: 40,
							borderRadius: '8px',
							border: `1px solid ${tokens.line}`,
							overflow: 'hidden',
							flexShrink: 0,
							bgcolor: tokens.surface2,
						}}
					>
						{row.productImageUrl ? (
							<AppImage
								src={row.productImageUrl}
								alt={row.productTitle}
								sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
							/>
						) : null}
					</Box>
					<Box>
						<Typography sx={{ fontSize: 13, fontWeight: 600 }}>{row.productTitle}</Typography>
						<Typography sx={{ fontSize: 12, color: tokens.ink3 }}>{row.productSku}</Typography>
					</Box>
				</Box>
			),
		},
		{
			key: 'rating',
			label: t('adminReviews.table.rating'),
			render: (row) => (
				<Stack direction="row" spacing={0.5} alignItems="center">
					<FontAwesomeIcon icon={Icons.star} color={tokens.amberInk} style={{ fontSize: 12 }} />
					<Typography sx={{ fontSize: 13, fontWeight: 700 }}>{row.rating.toFixed(1)}</Typography>
				</Stack>
			),
		},
		{
			key: 'submitted',
			label: t('adminReviews.table.submitted'),
			render: (row) => (
				<Typography sx={{ fontSize: 13, color: tokens.ink2 }}>{formatDate(row.createdAt)}</Typography>
			),
		},
		{
			key: 'flag',
			label: t('adminReviews.table.flag'),
			render: (row) =>
				row.isFlagged ? (
					<StatusBadge
						status="NEW"
						label={t('adminReviews.flagged')}
					/>
				) : (
					<Typography sx={{ fontSize: 13, color: tokens.ink3 }}>—</Typography>
				),
		},
		{
			key: 'status',
			label: t('adminReviews.table.status'),
			render: (row) =>
				row.isDeleted ? (
					<StatusBadge status="DELETED" label={t('adminReviews.status.deleted')} />
				) : (
					<AppSelect
						value={row.status}
						onChange={(e) => handleStatusChange(row.id, String(e.target.value))}
						options={ASSIGNABLE_STATUSES.map((s) => ({
							value: s,
							label: t(`adminReviews.status.${s.toLowerCase()}`, { defaultValue: s }),
						}))}
						size="small"
						fullWidth={false}
						formControlProps={{ sx: { minWidth: 140 } }}
					/>
				),
		},
		{
			key: 'actions',
			label: '',
			width: 48,
			align: 'right',
			render: (row) =>
				isAdmin ? (
					<RowMenu review={row} isAdmin={isAdmin} onDelete={() => setDeleteTarget(row)} />
				) : null,
		},
	];

	return (
		<Box>
			<Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3} gap={2}>
				<Box>
					<Typography variant="h5" fontWeight={700}>
						{t('adminReviews.pageTitle')}
					</Typography>
					<Typography sx={{ fontSize: 13, color: tokens.ink3, mt: 0.5 }}>
						{isAdmin
							? t('adminReviews.pageSubtitle', { count: stats?.total ?? 0 })
							: t('adminReviews.pageSubtitleModerator', { count: stats?.total ?? 0 })}
					</Typography>
				</Box>
			</Stack>

			<Box
				sx={{
					display: 'grid',
					gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr)' },
					gap: 2,
					mb: 3,
				}}
			>
				<StatMini
					label={t('adminReviews.stats.all')}
					value={stats?.total ?? 0}
					delta={t('adminReviews.stats.newThisMonth', { count: stats?.newThisMonth ?? 0 })}
				/>
				<StatMini label={t('adminReviews.stats.approved')} value={stats?.approved ?? 0} />
				<StatMini label={t('adminReviews.stats.pending')} value={stats?.pending ?? 0} />
				<StatMini label={t('adminReviews.stats.flagged')} value={stats?.flagged ?? 0} />
				<StatMini label={t('adminReviews.stats.blocked')} value={stats?.blocked ?? 0} />
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
						display: 'flex',
						gap: 1.5,
						flexWrap: 'wrap',
						borderTop: `1px solid ${tokens.line2}`,
					}}
				>
					<AppInput
						size="small"
						placeholder={t('adminReviews.searchPlaceholder')}
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
						value={ratingFilter}
						onChange={(e) => {
							setRatingFilter(String(e.target.value));
							setPage(0);
						}}
						options={ratingOptions}
						formControlProps={{ sx: { minWidth: 160 } }}
						fullWidth={false}
					/>
				</Box>

				<Box sx={{ px: 0 }}>
					<AppTable
						columns={columns}
						rows={items}
						loading={loading}
						rowKey={(row) => row.id}
						emptyTitle={t('adminReviews.empty.title')}
						emptyDescription={t('adminReviews.empty.description')}
					/>
				</Box>

				{total > PAGE_SIZE && (
					<AppPagination
						page={page}
						pageSize={PAGE_SIZE}
						total={total}
						pageSizeOptions={[10, 25, 50, 100]}
						onChange={(nextPage) => setPage(nextPage)}
					/>
				)}
			</AppCard>

			<ConfirmDialog
				open={Boolean(deleteTarget)}
				title={t('adminReviews.delete.title')}
				message={t('adminReviews.delete.message', { name: deleteTarget?.reviewerName ?? '' })}
				confirmLabel={t('adminReviews.delete.confirm')}
				cancelLabel={t('adminReviews.delete.cancel')}
				onConfirm={handleDelete}
				onClose={() => setDeleteTarget(null)}
				confirmColor="error"
			/>
		</Box>
	);
}
