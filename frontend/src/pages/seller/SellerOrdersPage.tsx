import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Grid, Typography, Link, InputBase, IconButton } from '@mui/material';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
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
	useAppToast,
} from '@/components/ui';
import type { AppTableColumn, AppMenuItem } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { tokens } from '@/theme';
import { ROUTES } from '@/constants/routes';
import {
	MY_SELLER_ORDERS_QUERY,
	MY_SELLER_ORDER_STATS_QUERY,
	CANCEL_SELLER_ORDER_MUTATION,
} from '@/graphql/operations/sellerOrders';
import type { OrderStatus, OrderStats, PaginatedSellerOrders, SellerOrder } from '@/types/orders';
import { EXPORT_MY_SELLER_ORDERS_QUERY } from '@/graphql/operations/importExport';
import { useAuth } from '@/hooks/useAuth';
import { downloadSpreadsheetFile } from '@/utils/downloadSpreadsheet';
import { formatMoney } from '@/utils/formatMoney';

const PAGE_SIZE = 8;

type TabValue = 'ALL' | OrderStatus;

const TABS: Array<{ value: TabValue; labelKey: string; statsKey: keyof OrderStats | null }> = [
	{ value: 'ALL', labelKey: 'sellerOrders.tabs.all', statsKey: 'all' },
	{ value: 'PENDING', labelKey: 'sellerOrders.tabs.pending', statsKey: 'pending' },
	{ value: 'CONFIRMED', labelKey: 'sellerOrders.tabs.confirmed', statsKey: 'confirmed' },
	{ value: 'SHIPPED', labelKey: 'sellerOrders.tabs.shipped', statsKey: 'shipped' },
	{ value: 'DELIVERED', labelKey: 'sellerOrders.tabs.delivered', statsKey: 'delivered' },
	{ value: 'CANCELLED', labelKey: 'sellerOrders.tabs.cancelled', statsKey: 'cancelled' },
	{ value: 'REFUNDED', labelKey: 'sellerOrders.tabs.refunded', statsKey: 'refunded' },
];

const AVATAR_TONES = [
	{ bg: tokens.accentSoft, fg: tokens.accentInk },
	{ bg: tokens.cyanSoft, fg: tokens.cyanInk },
	{ bg: tokens.amberSoft, fg: tokens.amberInk },
	{ bg: tokens.coralSoft, fg: tokens.coralInk },
];

function formatOrderId(id: string) {
	return `#KX-${id.slice(-4).toUpperCase()}`;
}

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

const ACTIVE_RETURN_STATUSES = [
	'REQUESTED',
	'UNDER_REVIEW',
	'APPROVED',
	'AWAITING_RETURN_SHIPPING',
	'RECEIVED',
];

function hasReturnRequest(order: SellerOrder): boolean {
	return Boolean(order.returnRequest);
}

function hasActiveReturnRequest(order: SellerOrder): boolean {
	return Boolean(
		order.returnRequest && ACTIVE_RETURN_STATUSES.includes(order.returnRequest.status)
	);
}

function getInitials(name: string) {
	return name
		.split(' ')
		.slice(0, 2)
		.map((w) => w[0] ?? '')
		.join('')
		.toUpperCase();
}

function getAvatarTone(id: string) {
	const idx = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_TONES.length;
	return AVATAR_TONES[idx];
}

function CustomerCell({ order }: { order: SellerOrder }) {
	const tone = getAvatarTone(order.buyer.id);
	const initials = getInitials(order.buyer.name);

	return (
		<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
			<Box
				sx={{
					width: 36,
					height: 36,
					borderRadius: '50%',
					background: tone.bg,
					color: tone.fg,
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
			<Box sx={{ minWidth: 0 }}>
				<Typography
					sx={{
						fontSize: 13,
						fontWeight: 500,
						color: tokens.ink1,
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
					}}
				>
					{order.buyer.name}
				</Typography>
				<Typography
					sx={{
						fontSize: 11.5,
						color: tokens.ink3,
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
					}}
				>
					{order.buyer.email}
				</Typography>
			</Box>
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

export default function SellerOrdersPage() {
	const { t } = useTranslation();
	const { showToast } = useAppToast();
	const { canImportExport } = useAuth();
	const [tab, setTab] = useState<TabValue>('ALL');
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(PAGE_SIZE);
	const [search, setSearch] = useState('');
	const [dateFrom, setDateFrom] = useState('');
	const [dateTo, setDateTo] = useState('');
	const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
	const [menuOrder, setMenuOrder] = useState<SellerOrder | null>(null);
	const [cancelTarget, setCancelTarget] = useState<SellerOrder | null>(null);

	const filter = {
		...(tab !== 'ALL' ? { status: tab as OrderStatus } : {}),
		...(search ? { search } : {}),
		...(dateFrom ? { dateFrom: new Date(dateFrom).toISOString() } : {}),
		...(dateTo ? { dateTo: new Date(`${dateTo}T23:59:59`).toISOString() } : {}),
		page,
		pageSize,
	};

	const { data, loading, refetch } = useQuery<{ mySellerOrders: PaginatedSellerOrders }>(
		MY_SELLER_ORDERS_QUERY,
		{ variables: { filter } }
	);

	const { data: statsData } = useQuery<{ mySellerOrderStats: OrderStats }>(
		MY_SELLER_ORDER_STATS_QUERY
	);

	const [cancelOrder, { loading: cancelling }] = useMutation(CANCEL_SELLER_ORDER_MUTATION, {
		onCompleted: () => {
			setCancelTarget(null);
			refetch();
		},
	});

	const [exportOrders, { loading: exporting }] = useLazyQuery(EXPORT_MY_SELLER_ORDERS_QUERY, {
		fetchPolicy: 'network-only',
	});

	const handleExport = async () => {
		try {
			const { data } = await exportOrders({
				variables: {
					filter: {
						...(tab !== 'ALL' ? { status: tab } : {}),
						...(search ? { search } : {}),
					},
				},
			});
			if (data?.exportMySellerOrders) {
				downloadSpreadsheetFile(data.exportMySellerOrders);
				showToast(t('importExport.exportSuccess'), 'success');
			}
		} catch {
			showToast(t('importExport.exportError'), 'error');
		}
	};

	const orders = data?.mySellerOrders.items ?? [];
	const total = data?.mySellerOrders.total ?? 0;
	const stats = statsData?.mySellerOrderStats;

	const handleTabChange = (val: string) => {
		setTab(val as TabValue);
		setPage(1);
	};

	const openMenu = (e: React.MouseEvent<HTMLElement>, order: SellerOrder) => {
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
					label: t('sellerOrders.viewDetails'),
					icon: Icons.order,
					onClick: () => {
						window.location.href = ROUTES.SELLER_ORDER(menuOrder.id);
					},
				},
				...(hasActiveReturnRequest(menuOrder)
					? [
							{
								label: t('sellerOrders.manageReturn'),
								icon: Icons.sync,
								onClick: () => {
									window.location.href = ROUTES.SELLER_ORDER(menuOrder.id);
									closeMenu();
								},
							},
						]
					: []),
				...(['PENDING', 'CONFIRMED'].includes(menuOrder.status)
					? [
							{
								label: t('sellerOrders.cancelOrder'),
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

	const columns: AppTableColumn<SellerOrder>[] = [
		{
			key: 'id',
			label: t('sellerOrders.table.order'),
			render: (row) => (
				<Link
					component={RouterLink}
					to={ROUTES.SELLER_ORDER(row.id)}
					sx={{
						fontFamily: 'JetBrains Mono, monospace',
						fontSize: 13,
						fontWeight: 600,
						color: tokens.accentInk,
						textDecoration: 'none',
						'&:hover': { textDecoration: 'underline' },
					}}
				>
					{formatOrderId(row.id)}
				</Link>
			),
		},
		{
			key: 'customer',
			label: t('sellerOrders.table.customer'),
			render: (row) => <CustomerCell order={row} />,
		},
		{
			key: 'date',
			label: t('sellerOrders.table.date'),
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
			label: t('sellerOrders.table.items'),
			align: 'center',
			render: (row) => (
				<Typography sx={{ fontSize: 13, color: tokens.ink2 }}>{row.itemCount}</Typography>
			),
		},
		{
			key: 'amount',
			label: t('sellerOrders.table.amount'),
			align: 'right',
			render: (row) => (
				<Typography sx={{ fontSize: 13, fontWeight: 700, color: tokens.ink1 }}>
					{formatMoney(row.sellerSubtotal)}
				</Typography>
			),
		},
		{
			key: 'payment',
			label: t('sellerOrders.table.payment'),
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
			label: t('sellerOrders.table.status'),
			render: (row) => (
				<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, alignItems: 'flex-start' }}>
					<StatusBadge status={row.status} label={t(`status.order.${row.status}`)} />
					{hasReturnRequest(row) && row.returnRequest && (
						<StatusBadge
							status={row.returnRequest.status}
							label={t(`status.returnRequest.${row.returnRequest.status}`)}
						/>
					)}
				</Box>
			),
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

	const hasFilters = tab !== 'ALL' || search || dateFrom || dateTo;

	return (
		<Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
			<Box
				sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}
			>
				<Box>
					<Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
						{t('sellerOrders.title')}
					</Typography>
					<Typography sx={{ color: tokens.ink3, mt: 0.5, fontSize: 14 }}>
						{t('sellerOrders.subtitle')}
					</Typography>
				</Box>
				<Box sx={{ display: 'flex', gap: 1.5, flexShrink: 0 }}>
					{canImportExport && (
						<AppButton
							variant="outlined"
							size="small"
							startIcon={<FontAwesomeIcon icon={Icons.download} />}
							onClick={handleExport}
							loading={exporting}
						>
							{t('sellerOrders.export')}
						</AppButton>
					)}
				</Box>
			</Box>

			<Grid container spacing={2} sx={{ mb: 3 }}>
				<Grid item xs={12} sm={6} md={3}>
					<StatCard
						icon={Icons.cart}
						label={t('sellerOrders.stats.all')}
						value={stats?.all ?? 0}
						tone="accent"
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<StatCard
						icon={Icons.clock}
						label={t('sellerOrders.stats.pending')}
						value={stats?.pending ?? 0}
						tone="amber"
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<StatCard
						icon={Icons.check}
						label={t('sellerOrders.stats.completed')}
						value={stats?.delivered ?? 0}
						tone="cyan"
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<StatCard
						icon={Icons.sync}
						label={t('sellerOrders.stats.refunded')}
						value={stats?.refunded ?? 0}
						tone="coral"
					/>
				</Grid>
			</Grid>

			<Box
				sx={{
					background: tokens.surface,
					border: `1px solid ${tokens.line}`,
					borderRadius: 2,
					overflow: 'hidden',
				}}
			>
				<AppTabs tabs={tabItems} value={tab} onChange={handleTabChange} />

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
						placeholder={t('sellerOrders.startDate')}
					/>
					<DateField
						value={dateTo}
						onChange={(v) => {
							setDateTo(v);
							setPage(1);
						}}
						placeholder={t('sellerOrders.endDate')}
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
							placeholder={t('sellerOrders.search')}
							sx={{ fontSize: 13.5, flex: 1 }}
						/>
					</Box>
					<AppButton
						variant="outlined"
						size="small"
						startIcon={<FontAwesomeIcon icon={Icons.filter} />}
					>
						{t('sellerOrders.filters')}
					</AppButton>
				</Box>

				{loading ? (
					<Box sx={{ py: 8 }}>
						<AppLoader />
					</Box>
				) : orders.length === 0 ? (
					<Box sx={{ py: 6 }}>
						<EmptyState
							icon={Icons.order}
							title={t(
								hasFilters ? 'sellerOrders.emptyFiltered.title' : 'sellerOrders.empty.title'
							)}
							description={t(
								hasFilters
									? 'sellerOrders.emptyFiltered.description'
									: 'sellerOrders.empty.description'
							)}
						/>
					</Box>
				) : (
					<AppTable columns={columns} rows={orders} rowKey={(row) => row.id} />
				)}

				{total > 0 && (
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

			<AppMenu
				anchorEl={menuAnchor}
				open={Boolean(menuAnchor)}
				onClose={closeMenu}
				items={menuItems}
			/>

			<ConfirmDialog
				open={Boolean(cancelTarget)}
				onClose={() => setCancelTarget(null)}
				onConfirm={() => {
					if (cancelTarget) {
						cancelOrder({ variables: { orderId: cancelTarget.id } });
					}
				}}
				title={t('sellerOrders.detail.cancelConfirm.title')}
				message={t('sellerOrders.detail.cancelConfirm.message')}
				confirmLabel={t('sellerOrders.detail.cancelConfirm.submit')}
				loading={cancelling}
				confirmColor="error"
			/>
		</Box>
	);
}
