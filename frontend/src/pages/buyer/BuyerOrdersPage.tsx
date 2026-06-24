import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Grid, Typography, Link, InputBase, IconButton } from '@mui/material';
import { useQuery, useMutation } from '@apollo/client';
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
	AppMenu,
	ConfirmDialog,
	AppButton,
} from '@/components/ui';
import type { AppTableColumn, AppMenuItem } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { tokens } from '@/theme';
import { ROUTES } from '@/constants/routes';
import {
	MY_ORDERS_QUERY,
	MY_ORDER_STATS_QUERY,
	CANCEL_ORDER_MUTATION,
} from '@/graphql/operations/orders';
import type { Order, OrderStatus, PaginatedOrders, OrderStats } from '@/types/orders';

const PAGE_SIZE = 8;

type TabValue = 'ALL' | OrderStatus;

const TABS: Array<{ value: TabValue; labelKey: string; statsKey: keyof OrderStats | null }> = [
	{ value: 'ALL', labelKey: 'orders.tabs.all', statsKey: 'all' },
	{ value: 'PENDING', labelKey: 'orders.tabs.pending', statsKey: 'pending' },
	{ value: 'CONFIRMED', labelKey: 'orders.tabs.confirmed', statsKey: 'confirmed' },
	{ value: 'SHIPPED', labelKey: 'orders.tabs.shipped', statsKey: 'shipped' },
	{ value: 'DELIVERED', labelKey: 'orders.tabs.delivered', statsKey: 'delivered' },
	{ value: 'CANCELLED', labelKey: 'orders.tabs.cancelled', statsKey: 'cancelled' },
	{ value: 'REFUNDED', labelKey: 'orders.tabs.refunded', statsKey: 'refunded' },
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

function ProductAvatar({ title }: { title: string }) {
	const initials = title
		.split(' ')
		.slice(0, 2)
		.map((w) => w[0] ?? '')
		.join('')
		.toUpperCase();
	return (
		<Box
			sx={{
				width: 36,
				height: 36,
				borderRadius: 1.5,
				background: tokens.accentSoft,
				color: tokens.accentInk,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				fontFamily: 'JetBrains Mono, monospace',
				fontSize: 11,
				fontWeight: 700,
				flexShrink: 0,
			}}
		>
			{initials || '?'}
		</Box>
	);
}

function DateField({
	value,
	onChange,
	placeholder,
}: {
	value: string;
	onChange: (v: string) => void;
	placeholder: string;
}) {
	return (
		<Box
			sx={{
				display: 'flex',
				alignItems: 'center',
				gap: 1,
				px: 1.5,
				py: 0.875,
				border: `1px solid ${tokens.line}`,
				borderRadius: 1.5,
				background: tokens.surface,
				'&:focus-within': { borderColor: tokens.accent },
				minWidth: 140,
			}}
		>
			<Box sx={{ color: tokens.ink3, fontSize: 13, flexShrink: 0 }}>
				<FontAwesomeIcon icon={Icons.calendar} />
			</Box>
			<InputBase
				type="date"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				inputProps={{ style: { fontSize: 13, color: value ? 'inherit' : 'var(--ink-3)' } }}
				sx={{ fontSize: 13, flex: 1, minWidth: 0, '& input': { p: 0 } }}
			/>
		</Box>
	);
}

export default function BuyerOrdersPage() {
	const { t } = useTranslation();
	const [tab, setTab] = useState<TabValue>('ALL');
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(PAGE_SIZE);
	const [search, setSearch] = useState('');
	const [dateFrom, setDateFrom] = useState('');
	const [dateTo, setDateTo] = useState('');

	// actions menu state
	const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
	const [menuOrder, setMenuOrder] = useState<Order | null>(null);

	// cancel dialog
	const [cancelTarget, setCancelTarget] = useState<Order | null>(null);

	const filter = {
		...(tab !== 'ALL' ? { status: tab as OrderStatus } : {}),
		...(search ? { search } : {}),
		...(dateFrom ? { dateFrom } : {}),
		...(dateTo ? { dateTo } : {}),
		page,
		pageSize,
	};

	const { data, loading, refetch } = useQuery<{ myOrders: PaginatedOrders }>(MY_ORDERS_QUERY, {
		variables: { filter },
	});

	const { data: statsData } = useQuery<{ myOrderStats: OrderStats }>(MY_ORDER_STATS_QUERY);

	const [cancelOrder, { loading: cancelling }] = useMutation(CANCEL_ORDER_MUTATION, {
		onCompleted: () => {
			setCancelTarget(null);
			refetch();
		},
	});

	const orders = data?.myOrders.items ?? [];
	const total = data?.myOrders.total ?? 0;
	const stats = statsData?.myOrderStats;

	const handleTabChange = (val: string) => {
		setTab(val as TabValue);
		setPage(1);
	};

	const openMenu = (e: React.MouseEvent<HTMLElement>, order: Order) => {
		setMenuAnchor(e.currentTarget);
		setMenuOrder(order);
	};

	const closeMenu = () => {
		setMenuAnchor(null);
		setMenuOrder(null);
	};

	const menuItems: AppMenuItem[] = menuOrder
		? [
				{
					label: t('orders.viewDetails'),
					icon: Icons.order,
					onClick: () => {
						window.location.href = ROUTES.ORDER(menuOrder.id);
					},
				},
				...(menuOrder.status === 'PENDING' || menuOrder.status === 'CONFIRMED'
					? [
							{
								label: t('orders.cancelOrder'),
								icon: Icons.ban,
								danger: true as const,
								onClick: () => {
									setCancelTarget(menuOrder);
									closeMenu();
								},
							},
						]
					: []),
			]
		: [];

	const columns: AppTableColumn<Order>[] = [
		{
			key: 'id',
			label: t('orders.table.order'),
			render: (row) => (
				<Link
					component={RouterLink}
					to={ROUTES.ORDER(row.id)}
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
			key: 'product',
			label: t('orders.table.product'),
			render: (row) => {
				const title = row.items[0]?.productTitle ?? '—';
				return (
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
						<ProductAvatar title={title} />
						<Typography
							sx={{
								fontSize: 13,
								fontWeight: 500,
								color: tokens.ink1,
								maxWidth: 180,
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap',
							}}
						>
							{title}
						</Typography>
					</Box>
				);
			},
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
		{
			key: 'actions',
			label: '',
			align: 'right',
			render: (row) => (
				<IconButton
					size="small"
					onClick={(e) => openMenu(e, row)}
					sx={{ color: tokens.ink3, '&:hover': { color: tokens.ink1 } }}
				>
					<FontAwesomeIcon icon={Icons.more} style={{ fontSize: 14 }} />
				</IconButton>
			),
		},
	];

	const tabItems = TABS.map((t_) => ({
		value: t_.value,
		label: t(t_.labelKey),
		count: t_.statsKey !== null && stats ? (stats[t_.statsKey] as number) : undefined,
	}));

	return (
		<Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
			{/* page head */}
			<Box
				sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}
			>
				<Box>
					<Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
						{t('orders.title')}
					</Typography>
					<Typography sx={{ color: tokens.ink3, mt: 0.5, fontSize: 14 }}>
						{t('orders.subtitle')}
					</Typography>
				</Box>
			</Box>

			{/* stat row */}
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
						value={stats?.delivered ?? 0}
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

			{/* table card */}
			<Box
				sx={{
					background: tokens.surface,
					border: `1px solid ${tokens.line}`,
					borderRadius: 2,
					overflow: 'hidden',
				}}
			>
				{/* tabs with count badges */}
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
						flexWrap: 'wrap',
					}}
				>
					<DateField
						value={dateFrom}
						onChange={(v) => {
							setDateFrom(v);
							setPage(1);
						}}
						placeholder={t('orders.startDate')}
					/>
					<DateField
						value={dateTo}
						onChange={(v) => {
							setDateTo(v);
							setPage(1);
						}}
						placeholder={t('orders.endDate')}
					/>
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
							minWidth: 160,
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
					<AppButton
						variant="outlined"
						size="small"
						startIcon={<FontAwesomeIcon icon={Icons.filter} />}
					>
						{t('orders.filters')}
					</AppButton>
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
								search || dateFrom || dateTo || tab !== 'ALL'
									? 'orders.emptyFiltered.title'
									: 'orders.empty.title'
							)}
							description={t(
								search || dateFrom || dateTo || tab !== 'ALL'
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

			{/* actions dropdown menu */}
			<AppMenu
				anchorEl={menuAnchor}
				open={Boolean(menuAnchor)}
				onClose={closeMenu}
				items={menuItems}
			/>

			{/* cancel order confirm dialog */}
			<ConfirmDialog
				open={Boolean(cancelTarget)}
				onClose={() => setCancelTarget(null)}
				onConfirm={() => {
					if (cancelTarget) {
						cancelOrder({ variables: { orderId: cancelTarget.id } });
					}
				}}
				loading={cancelling}
				confirmColor="error"
				title={t('orderDetail.cancelConfirm.title')}
				message={t('orderDetail.cancelConfirm.message')}
				confirmLabel={t('orders.cancelOrder')}
			/>
		</Box>
	);
}
