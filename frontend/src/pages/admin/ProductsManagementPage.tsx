import { useCallback, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@apollo/client';
import { Box, IconButton, Menu, MenuItem, Stack, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { Icons } from '@/constants/icons';
import { ROUTES } from '@/constants/routes';
import { tokens } from '@/theme';
import { ProductStatus, Role } from '@/constants/enums';
import { useAuth } from '@/hooks/useAuth';
import {
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
	ADMIN_PRODUCT_STATS_QUERY,
	ALL_PRODUCTS_QUERY,
	CHANGE_ADMIN_PRODUCT_STATUS_MUTATION,
	ADMIN_DELETE_PRODUCT_MUTATION,
} from '@/graphql/operations/adminProducts';
import type {
	AdminProductItem,
	AdminProductStatsData,
	AllProductsData,
	AllProductsVars,
	AdminProductStatusFilter,
	AdminProductAvailabilityFilter,
} from '@/graphql/operations/adminProducts';

type StatusTab =
	| 'all'
	| 'draft'
	| 'pending'
	| 'approved'
	| 'rejected'
	| 'blocked'
	| 'archived'
	| 'deleted';

const TAB_STATUS_MAP: Record<StatusTab, AdminProductStatusFilter> = {
	all: 'ALL',
	draft: 'DRAFT',
	pending: 'PENDING_MODERATION',
	approved: 'APPROVED',
	rejected: 'REJECTED',
	blocked: 'BLOCKED',
	archived: 'ARCHIVED',
	deleted: 'DELETED',
};

const ASSIGNABLE_STATUSES = Object.values(ProductStatus);
const PAGE_SIZE = 25;

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString(undefined, {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	});
}

function formatPrice(value: number): string {
	return new Intl.NumberFormat(undefined, {
		style: 'currency',
		currency: 'UAH',
		maximumFractionDigits: 0,
	}).format(value);
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
	product: AdminProductItem;
	isAdmin: boolean;
	onDelete: () => void;
}

function RowMenu({ product, isAdmin, onDelete }: RowMenuProps) {
	const { t } = useTranslation();
	const [anchor, setAnchor] = useState<null | HTMLElement>(null);

	if (!isAdmin || product.isDeleted) return null;

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
					{t('adminProducts.actions.softDelete')}
				</MenuItem>
			</Menu>
		</>
	);
}

export default function ProductsManagementPage() {
	const { t } = useTranslation();
	const { showToast } = useAppToast();
	const { hasRole } = useAuth();
	const isAdmin = hasRole(Role.ADMIN);

	const [activeTab, setActiveTab] = useState<StatusTab>('all');
	const [search, setSearch] = useState('');
	const [availabilityFilter, setAvailabilityFilter] =
		useState<AdminProductAvailabilityFilter>('ALL');
	const [page, setPage] = useState(0);
	const [deleteTarget, setDeleteTarget] = useState<AdminProductItem | null>(null);

	const { data: statsData } = useQuery<AdminProductStatsData>(ADMIN_PRODUCT_STATS_QUERY);
	const { data, loading, refetch } = useQuery<AllProductsData, AllProductsVars>(
		ALL_PRODUCTS_QUERY,
		{
			variables: {
				input: {
					statusFilter: TAB_STATUS_MAP[activeTab],
					availabilityFilter: availabilityFilter === 'ALL' ? undefined : availabilityFilter,
					search: search || undefined,
					page: page + 1,
					pageSize: PAGE_SIZE,
				},
			},
			fetchPolicy: 'cache-and-network',
		}
	);

	const [changeStatus] = useMutation(CHANGE_ADMIN_PRODUCT_STATUS_MUTATION);
	const [deleteProduct] = useMutation(ADMIN_DELETE_PRODUCT_MUTATION);

	const stats = statsData?.adminProductStats;
	const list = data?.allProducts;
	const items = list?.items ?? [];
	const total = list?.total ?? 0;
	const tabCounts = list?.tabCounts;

	const tabs = useMemo(
		() => [
			{ value: 'all', label: t('adminProducts.tabs.all'), count: tabCounts?.all },
			{ value: 'draft', label: t('adminProducts.tabs.draft'), count: tabCounts?.draft },
			{ value: 'pending', label: t('adminProducts.tabs.pending'), count: tabCounts?.pending },
			{ value: 'approved', label: t('adminProducts.tabs.approved'), count: tabCounts?.approved },
			{ value: 'rejected', label: t('adminProducts.tabs.rejected'), count: tabCounts?.rejected },
			{ value: 'blocked', label: t('adminProducts.tabs.blocked'), count: tabCounts?.blocked },
			{ value: 'archived', label: t('adminProducts.tabs.archived'), count: tabCounts?.archived },
			{ value: 'deleted', label: t('adminProducts.tabs.deleted'), count: tabCounts?.deleted },
		],
		[t, tabCounts]
	);

	const availabilityOptions = [
		{ value: 'ALL', label: t('adminProducts.filters.availabilityAll') },
		{ value: 'AVAILABLE', label: t('adminProducts.filters.availabilityAvailable') },
		{ value: 'UNAVAILABLE', label: t('adminProducts.filters.availabilityUnavailable') },
	];

	const handleStatusChange = useCallback(
		async (productId: string, status: string) => {
			try {
				await changeStatus({ variables: { id: productId, status } });
				showToast(t('adminProducts.toast.statusChanged'), 'success');
				await refetch();
			} catch {
				showToast(t('adminProducts.toast.statusChangeError'), 'error');
			}
		},
		[changeStatus, showToast, t, refetch]
	);

	const handleDelete = useCallback(async () => {
		if (!deleteTarget) return;
		try {
			await deleteProduct({ variables: { id: deleteTarget.id } });
			showToast(t('adminProducts.toast.deleted'), 'info');
			setDeleteTarget(null);
			await refetch();
		} catch {
			showToast(t('adminProducts.toast.deleteError'), 'error');
		}
	}, [deleteTarget, deleteProduct, showToast, t, refetch]);

	const sellerProfileHref = (sellerId: string) => ROUTES.SELLER_PUBLIC(sellerId);

	const columns: AppTableColumn<AdminProductItem>[] = [
		{
			key: 'product',
			label: t('adminProducts.table.product'),
			render: (row) => (
				<Box
					component={RouterLink}
					to={ROUTES.PRODUCT(row.slug)}
					sx={{
						display: 'flex',
						alignItems: 'center',
						gap: 1.5,
						textDecoration: 'none',
						color: 'inherit',
						'&:hover .product-title': { color: tokens.ink1 },
					}}
				>
					<Box
						sx={{
							width: 48,
							height: 48,
							borderRadius: '10px',
							border: `1px solid ${tokens.line}`,
							overflow: 'hidden',
							flexShrink: 0,
							bgcolor: tokens.surface2,
						}}
					>
						{row.imageUrl ? (
							<AppImage
								src={row.imageUrl}
								alt={row.title}
								sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
							/>
						) : (
							<Box
								sx={{
									width: '100%',
									height: '100%',
									display: 'grid',
									placeItems: 'center',
									color: tokens.ink3,
								}}
							>
								<FontAwesomeIcon icon={Icons.products} />
							</Box>
						)}
					</Box>
					<Box>
						<Typography className="product-title" sx={{ fontWeight: 700, fontSize: 14 }}>
							{row.title}
						</Typography>
						<Typography sx={{ fontSize: 12, color: tokens.ink3 }}>
							{row.sku} · {row.productRef}
						</Typography>
					</Box>
				</Box>
			),
		},
		{
			key: 'seller',
			label: t('adminProducts.table.seller'),
			render: (row) => (
				<Box
					component={RouterLink}
					to={sellerProfileHref(row.sellerId)}
					sx={{ textDecoration: 'none', color: 'inherit' }}
				>
					<Typography sx={{ fontSize: 13, fontWeight: 600 }}>{row.sellerName}</Typography>
					<Typography sx={{ fontSize: 12, color: tokens.ink3 }}>{row.sellerEmail}</Typography>
				</Box>
			),
		},
		{
			key: 'price',
			label: t('adminProducts.table.price'),
			render: (row) => (
				<Typography sx={{ fontSize: 13, fontWeight: 600 }}>{formatPrice(row.basePrice)}</Typography>
			),
		},
		{
			key: 'stock',
			label: t('adminProducts.table.stock'),
			render: (row) => (
				<Typography sx={{ fontSize: 13, color: tokens.ink2 }}>{row.totalStock}</Typography>
			),
		},
		{
			key: 'category',
			label: t('adminProducts.table.category'),
			render: (row) => row.categoryPath ?? '—',
		},
		{
			key: 'updated',
			label: t('adminProducts.table.updated'),
			render: (row) => (
				<Typography sx={{ fontSize: 13, color: tokens.ink2 }}>
					{formatDate(row.updatedAt)}
				</Typography>
			),
		},
		{
			key: 'status',
			label: t('adminProducts.table.status'),
			render: (row) =>
				row.isDeleted ? (
					<StatusBadge status="DELETED" label={t('adminProducts.status.deleted')} />
				) : (
					<AppSelect
						value={row.status}
						onChange={(e) => handleStatusChange(row.id, String(e.target.value))}
						options={ASSIGNABLE_STATUSES.map((s) => ({
							value: s,
							label: t(`adminProducts.status.${s.toLowerCase()}`, { defaultValue: s }),
						}))}
						size="small"
						fullWidth={false}
						formControlProps={{ sx: { minWidth: 160 } }}
					/>
				),
		},
		{
			key: 'availability',
			label: t('adminProducts.table.availability'),
			render: (row) => (
				<StatusBadge
					status={row.isAvailable ? 'ENABLED' : 'DISABLED'}
					label={
						row.isAvailable
							? t('adminProducts.availability.available')
							: t('adminProducts.availability.unavailable')
					}
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
					<RowMenu product={row} isAdmin={isAdmin} onDelete={() => setDeleteTarget(row)} />
				) : null,
		},
	];

	return (
		<Box>
			<Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3} gap={2}>
				<Box>
					<Typography variant="h5" fontWeight={700}>
						{t('adminProducts.pageTitle')}
					</Typography>
					<Typography sx={{ fontSize: 13, color: tokens.ink3, mt: 0.5 }}>
						{isAdmin
							? t('adminProducts.pageSubtitle', { count: stats?.total ?? 0 })
							: t('adminProducts.pageSubtitleModerator', { count: stats?.total ?? 0 })}
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
					label={t('adminProducts.stats.all')}
					value={stats?.total ?? 0}
					delta={t('adminProducts.stats.newThisMonth', { count: stats?.newThisMonth ?? 0 })}
				/>
				<StatMini label={t('adminProducts.stats.approved')} value={stats?.approved ?? 0} />
				<StatMini label={t('adminProducts.stats.pending')} value={stats?.pending ?? 0} />
				<StatMini label={t('adminProducts.stats.draft')} value={stats?.draft ?? 0} />
				<StatMini label={t('adminProducts.stats.blocked')} value={stats?.blocked ?? 0} />
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
						placeholder={t('adminProducts.searchPlaceholder')}
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
						value={availabilityFilter}
						onChange={(e) => {
							setAvailabilityFilter(e.target.value as AdminProductAvailabilityFilter);
							setPage(0);
						}}
						options={availabilityOptions}
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
						emptyTitle={t('adminProducts.empty.title')}
						emptyDescription={t('adminProducts.empty.description')}
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
				title={t('adminProducts.delete.title')}
				message={t('adminProducts.delete.message', { name: deleteTarget?.title ?? '' })}
				confirmLabel={t('adminProducts.delete.confirm')}
				cancelLabel={t('adminProducts.delete.cancel')}
				onConfirm={handleDelete}
				onClose={() => setDeleteTarget(null)}
				confirmColor="error"
			/>
		</Box>
	);
}
