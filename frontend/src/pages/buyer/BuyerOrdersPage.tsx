import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Grid, Typography, Link, InputBase } from '@mui/material';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
	AppTabs,
	AppTable,
	AppPagination,
	StatCard,
	StatusBadge,
	EmptyState,
	AppLoader,
} from '@/components/ui';
import type { AppTableColumn } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { tokens } from '@/theme';
import { ROUTES } from '@/constants/routes';
import { MY_ORDERS_QUERY, MY_ORDER_STATS_QUERY } from '@/graphql/operations/orders';
import type { Order, OrderStatus, PaginatedOrders, OrderStats } from '@/types/orders';

const PAGE_SIZE = 8;

type TabValue = 'ALL' | OrderStatus;

const TABS: Array<{ value: TabValue; labelKey: string }> = [
	{ value: 'ALL', labelKey: 'orders.tabs.all' },
	{ value: 'PENDING', labelKey: 'orders.tabs.pending' },
	{ value: 'CONFIRMED', labelKey: 'orders.tabs.confirmed' },
	{ value: 'SHIPPED', labelKey: 'orders.tabs.shipped' },
	{ value: 'DELIVERED', labelKey: 'orders.tabs.delivered' },
	{ value: 'CANCELLED', labelKey: 'orders.tabs.cancelled' },
	{ value: 'REFUNDED', labelKey: 'orders.tabs.refunded' },
];

function formatDate(iso: string) {
	return new Date(iso).toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	});
}

function formatTime(iso: string) {
	return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatAmount(n: number) {
	return `$${n.toFixed(2)}`;
}

export default function BuyerOrdersPage() {
	const { t } = useTranslation();
	const [tab, setTab] = useState<TabValue>('ALL');
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(PAGE_SIZE);
	const [search, setSearch] = useState('');

	const filter = {
		...(tab !== 'ALL' ? { status: tab as OrderStatus } : {}),
		...(search ? { search } : {}),
		page,
		pageSize,
	};

	const { data, loading } = useQuery<{ myOrders: PaginatedOrders }>(MY_ORDERS_QUERY, {
		variables: { filter },
	});

	const { data: statsData } = useQuery<{ myOrderStats: OrderStats }>(MY_ORDER_STATS_QUERY);

	const orders = data?.myOrders.items ?? [];
	const total = data?.myOrders.total ?? 0;
	const stats = statsData?.myOrderStats;

	const handleTabChange = (val: string) => {
		setTab(val as TabValue);
		setPage(1);
	};

	const columns: AppTableColumn<Order>[] = [
		{
			key: 'id',
			label: t('orders.table.order'),
			render: (row) => (
				<Link
					component={RouterLink}
					to={ROUTES.ACCOUNT_ORDER(row.id)}
					sx={{
						fontFamily: 'JetBrains Mono, monospace',
						fontSize: 13,
						fontWeight: 600,
						color: tokens.accentInk,
						textDecoration: 'none',
						'&:hover': { textDecoration: 'underline' },
					}}
				>
					#{row.id.slice(-6).toUpperCase()}
				</Link>
			),
		},
		{
			key: 'seller',
			label: t('orders.table.seller'),
			render: (row) => (
				<Typography sx={{ fontSize: 13, color: tokens.ink2 }}>
					{row.items[0]?.productTitle ?? '—'}
				</Typography>
			),
		},
		{
			key: 'date',
			label: t('orders.table.date'),
			render: (row) => (
				<Box>
					<Typography sx={{ fontSize: 13, color: tokens.ink1 }}>
						{formatDate(row.createdAt)}
					</Typography>
					<Typography sx={{ fontSize: 11.5, color: tokens.ink3 }}>
						{formatTime(row.createdAt)}
					</Typography>
				</Box>
			),
		},
		{
			key: 'items',
			label: t('orders.table.items'),
			align: 'center',
			render: (row) => (
				<Typography sx={{ fontSize: 13, color: tokens.ink2 }}>{row.items.length}</Typography>
			),
		},
		{
			key: 'amount',
			label: t('orders.table.amount'),
			align: 'right',
			render: (row) => (
				<Typography sx={{ fontSize: 13, fontWeight: 700, color: tokens.ink1 }}>
					{formatAmount(row.totalAmount)}
				</Typography>
			),
		},
		{
			key: 'payment',
			label: t('orders.table.payment'),
			render: (row) =>
				row.payment ? (
					<StatusBadge
						status={row.payment.status}
						label={t(`status.payment.${row.payment.status}`)}
					/>
				) : (
					<Typography sx={{ fontSize: 12, color: tokens.ink3 }}>—</Typography>
				),
		},
		{
			key: 'status',
			label: t('orders.table.status'),
			render: (row) => <StatusBadge status={row.status} label={t(`status.order.${row.status}`)} />,
		},
	];

	const tabItems = TABS.map((tab) => ({
		value: tab.value,
		label: t(tab.labelKey),
	}));

	return (
		<Box sx={{ maxWidth: 1200 }}>
			{/* ── page head ── */}
			<Box sx={{ mb: 3 }}>
				<Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
					{t('orders.title')}
				</Typography>
				<Typography sx={{ color: tokens.ink3, mt: 0.5, fontSize: 14 }}>
					{t('orders.subtitle')}
				</Typography>
			</Box>

			{/* ── stat mini row ── */}
			<Grid container spacing={2} sx={{ mb: 3 }}>
				<Grid item xs={12} sm={6} md={3}>
					<StatCard
						icon={Icons.cart}
						label={t('orders.stats.all')}
						value={stats?.all ?? 0}
						tone="accent"
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<StatCard
						icon={Icons.clock}
						label={t('orders.stats.pending')}
						value={stats?.pending ?? 0}
						tone="amber"
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<StatCard
						icon={Icons.check}
						label={t('orders.stats.completed')}
						value={stats?.completed ?? 0}
						tone="cyan"
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<StatCard
						icon={Icons.sync}
						label={t('orders.stats.refunded')}
						value={stats?.refunded ?? 0}
						tone="coral"
					/>
				</Grid>
			</Grid>

			{/* ── table card ── */}
			<Box
				sx={{
					background: tokens.surface,
					border: `1px solid ${tokens.line}`,
					borderRadius: 2,
					overflow: 'hidden',
				}}
			>
				{/* tabs */}
				<AppTabs tabs={tabItems} value={tab} onChange={handleTabChange} />

				{/* toolbar */}
				<Box
					sx={{
						display: 'flex',
						gap: 1.5,
						alignItems: 'center',
						px: 2.5,
						py: 1.5,
						borderBottom: `1px solid ${tokens.line}`,
					}}
				>
					<Box
						sx={{
							flex: 1,
							display: 'flex',
							alignItems: 'center',
							gap: 1,
							px: 1.5,
							py: 0.875,
							border: `1px solid ${tokens.line}`,
							borderRadius: 1.5,
							background: tokens.surface,
							'&:focus-within': { borderColor: tokens.accent },
						}}
					>
						<Box sx={{ color: tokens.ink3, fontSize: 13, flexShrink: 0 }}>
							<FontAwesomeIcon icon={Icons.search} />
						</Box>
						<InputBase
							value={search}
							onChange={(e) => {
								setSearch(e.target.value);
								setPage(1);
							}}
							placeholder={t('orders.search')}
							sx={{ fontSize: 13.5, flex: 1 }}
						/>
					</Box>
				</Box>

				{/* table or states */}
				{loading ? (
					<Box sx={{ py: 8 }}>
						<AppLoader />
					</Box>
				) : orders.length === 0 ? (
					<Box sx={{ py: 6 }}>
						<EmptyState
							icon={Icons.order}
							title={t(
								search || tab !== 'ALL' ? 'orders.emptyFiltered.title' : 'orders.empty.title'
							)}
							description={t(
								search || tab !== 'ALL'
									? 'orders.emptyFiltered.description'
									: 'orders.empty.description'
							)}
						/>
					</Box>
				) : (
					<AppTable columns={columns} rows={orders} rowKey={(row) => row.id} />
				)}

				{/* pagination */}
				{total > pageSize && (
					<Box sx={{ px: 2.5, py: 1.5, borderTop: `1px solid ${tokens.line}` }}>
						<AppPagination
							page={page}
							pageSize={pageSize}
							total={total}
							pageSizeOptions={[8, 25, 50]}
							onChange={(p, ps) => {
								setPage(p);
								setPageSize(ps);
							}}
						/>
					</Box>
				)}
			</Box>
		</Box>
	);
}
