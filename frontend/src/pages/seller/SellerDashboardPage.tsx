import { useState, useMemo } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@apollo/client';
import { Box, Grid, Stack, Typography, Link } from '@mui/material';
import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from 'recharts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { Icons } from '@/constants/icons';
import { tokens } from '@/theme';
import { ROUTES } from '@/constants/routes';
import { AppButton, AppTable, EmptyState, SegmentedControl, StatCard, AppImage, StatusBadge } from '@/components/ui';
import {
	DashboardWelcomeHeader,
	DashboardAlertBanner,
	DashboardSectionCard,
	DashboardQuickActions,
} from '@/components/dashboard';
import type { AppTableColumn } from '@/components/ui';
import {
	SELLER_STATS_QUERY,
	SELLER_REVENUE_SERIES_QUERY,
	SELLER_TOP_PRODUCTS_QUERY,
	SELLER_LOW_STOCK_ALERTS_QUERY,
	SELLER_DASHBOARD_SUMMARY_QUERY,
} from '@/graphql/operations/sellerDashboard';
import type {
	SellerStatsData,
	SellerRevenueSeriesData,
	SellerTopProductsData,
	SellerLowStockAlertsData,
	SellerDashboardSummaryData,
	TopProduct,
	LowStockAlertItem,
} from '@/graphql/operations/sellerDashboard';
import { MY_SELLER_ORDERS_QUERY } from '@/graphql/operations/sellerOrders';
import type { OrderStatus } from '@/types/orders';
import { Role } from '@/constants/enums';
import { useAuth } from '@/hooks/useAuth';

// ─── Types ────────────────────────────────────────────────────────────────────

type SellerRecentOrder = {
	id: string;
	status: OrderStatus;
	sellerSubtotal: number;
	buyer?: { name?: string | null; email?: string | null } | null;
};
type DashboardPeriod = 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR';
type RevenueGranularity = 'DAY' | 'WEEK' | 'MONTH';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_GRANULARITY: Record<DashboardPeriod, RevenueGranularity> = {
	WEEK: 'DAY',
	MONTH: 'DAY',
	QUARTER: 'WEEK',
	YEAR: 'MONTH',
};

function formatRevenueLarge(n: number): string {
	if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
	return `$${n.toFixed(0)}`;
}

function formatRevenueExact(n: number): string {
	return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatChartDate(dateStr: string, granularity: RevenueGranularity): string {
	const d = new Date(dateStr);
	if (granularity === 'MONTH') return d.toLocaleDateString('en-US', { month: 'short' });
	return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Chart Tooltip ────────────────────────────────────────────────────────────

interface ChartTooltipProps {
	active?: boolean;
	payload?: Array<{ value: number }>;
	label?: string;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
	if (!active || !payload?.length) return null;
	return (
		<Box
			sx={{
				bgcolor: tokens.ink1,
				color: 'white',
				px: 2,
				py: 1.5,
				borderRadius: 2,
				boxShadow: tokens.shadowMd,
				fontSize: 12.5,
			}}
		>
			<Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, mb: 0.25 }}>
				{label}
			</Typography>
			<Typography sx={{ fontWeight: 700, color: 'white', fontSize: 14 }}>
				{formatRevenueExact(payload[0].value)}
			</Typography>
		</Box>
	);
}

// ─── Hero Card ────────────────────────────────────────────────────────────────

interface HeroCardProps {
	revenue: number;
	orders: number;
	period: DashboardPeriod;
	periodLabel: string;
	loading: boolean;
}

function HeroCard({ revenue, orders, period: _period, periodLabel, loading }: HeroCardProps) {
	const { t } = useTranslation();
	const navigate = useNavigate();

	return (
		<Box
			sx={{
				background: `linear-gradient(135deg, ${tokens.indigo} 0%, ${tokens.purple} 100%)`,
				borderRadius: tokens.radius / 8,
				p: { xs: 3, md: '32px 36px' },
				display: 'grid',
				gridTemplateColumns: { xs: '1fr', sm: '1.3fr 1fr' },
				gap: 3,
				alignItems: 'center',
				position: 'relative',
				overflow: 'hidden',
				color: 'white',
				height: '100%',
				minHeight: 260,
				boxSizing: 'border-box',
			}}
		>
			{/* radial glow */}
			<Box
				sx={{
					position: 'absolute',
					inset: 0,
					background: `radial-gradient(circle at 90% 20%, ${tokens.purpleSoft} 0%, transparent 55%)`,
					opacity: 0.55,
					pointerEvents: 'none',
				}}
			/>

			{/* left: text */}
			<Box sx={{ position: 'relative', zIndex: 1 }}>
				<Typography
					sx={{
						fontSize: 11,
						fontWeight: 700,
						letterSpacing: '0.14em',
						textTransform: 'uppercase',
						color: tokens.accentLight,
						mb: 1,
					}}
				>
					{t('sellerDashboard.hero.eyebrow', { period: periodLabel })}
				</Typography>

				<Typography
					sx={{
						fontWeight: 700,
						fontSize: { xs: 20, md: 26 },
						lineHeight: 1.2,
						letterSpacing: '-0.02em',
						mb: 1,
					}}
				>
					{t('sellerDashboard.hero.title')}
					<Box
						component="em"
						sx={{ fontStyle: 'italic', color: tokens.accentLight, display: 'block' }}
					>
						{loading ? '…' : formatRevenueExact(revenue)}
					</Box>
				</Typography>

				<Typography
					sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 13.5, maxWidth: '40ch', mb: 2.5 }}
				>
					{t('sellerDashboard.hero.body')}
				</Typography>

				<Box
					component="button"
					onClick={() => navigate(ROUTES.SELLER_PRODUCTS)}
					sx={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 1,
						bgcolor: 'white',
						color: tokens.indigo,
						px: 2.25,
						py: 1.125,
						borderRadius: 999,
						fontWeight: 700,
						fontSize: 13.5,
						border: 0,
						cursor: 'pointer',
						fontFamily: 'inherit',
						'&:hover': { opacity: 0.92 },
						transition: 'opacity 120ms',
					}}
				>
					{t('sellerDashboard.hero.cta')}
					<FontAwesomeIcon icon={Icons.arrowRight} style={{ fontSize: 13 }} />
				</Box>
			</Box>

			{/* right: hero stat pills */}
			<Box
				sx={{
					position: 'relative',
					zIndex: 1,
					display: 'flex',
					flexDirection: 'column',
					gap: 1.25,
				}}
			>
				{/* orders */}
				<Box
					sx={{
						bgcolor: 'rgba(255,255,255,0.06)',
						border: '1px solid rgba(255,255,255,0.12)',
						borderRadius: 1.5,
						px: 2,
						py: 1.75,
						display: 'flex',
						alignItems: 'center',
						gap: 1.75,
					}}
				>
					<Box>
						<Typography
							sx={{
								fontSize: 11,
								color: 'rgba(255,255,255,0.6)',
								letterSpacing: '0.06em',
								textTransform: 'uppercase',
								mb: 0.5,
							}}
						>
							{t('sellerDashboard.hero.statOrders')}
						</Typography>
						<Typography
							sx={{ fontSize: 22, fontWeight: 700, color: 'white', letterSpacing: '-0.01em' }}
						>
							{loading ? '—' : orders}
						</Typography>
					</Box>
					<Box sx={{ ml: 'auto', color: tokens.cyan, fontSize: 12.5, fontWeight: 700 }}>
						<FontAwesomeIcon icon={Icons.order} />
					</Box>
				</Box>

				{/* revenue */}
				<Box
					sx={{
						bgcolor: 'rgba(255,255,255,0.06)',
						border: '1px solid rgba(255,255,255,0.12)',
						borderRadius: 1.5,
						px: 2,
						py: 1.75,
						display: 'flex',
						alignItems: 'center',
						gap: 1.75,
					}}
				>
					<Box>
						<Typography
							sx={{
								fontSize: 11,
								color: 'rgba(255,255,255,0.6)',
								letterSpacing: '0.06em',
								textTransform: 'uppercase',
								mb: 0.5,
							}}
						>
							{t('sellerDashboard.hero.statRevenue')}
						</Typography>
						<Typography
							sx={{ fontSize: 22, fontWeight: 700, color: 'white', letterSpacing: '-0.01em' }}
						>
							{loading ? '—' : formatRevenueLarge(revenue)}
						</Typography>
					</Box>
					<Box sx={{ ml: 'auto', color: tokens.cyan, fontSize: 12.5, fontWeight: 700 }}>
						<FontAwesomeIcon icon={Icons.wallet} />
					</Box>
				</Box>
			</Box>
		</Box>
	);
}

// ─── Feature / Low Stock summary card ─────────────────────────────────────────

interface FeatureCardProps {
	lowStockCount: number;
	loading: boolean;
}

function FeatureCard({ lowStockCount, loading }: FeatureCardProps) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const hasAlerts = lowStockCount > 0;

	return (
		<Box
			sx={{
				background: tokens.surface,
				border: `1px solid ${tokens.line}`,
				borderRadius: tokens.radius / 8,
				p: '22px',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'space-between',
				minHeight: 260,
				height: '100%',
				boxSizing: 'border-box',
			}}
		>
			<Box>
				{/* tag */}
				<Box
					sx={{
						display: 'inline-flex',
						fontSize: 10.5,
						fontWeight: 700,
						letterSpacing: '0.1em',
						textTransform: 'uppercase',
						color: hasAlerts ? tokens.amberInk : tokens.cyanInk,
						bgcolor: hasAlerts ? tokens.amberSoft : tokens.cyanSoft,
						px: 1,
						py: 0.5,
						borderRadius: 0.5,
						mb: 1.75,
					}}
				>
					{loading
						? '…'
						: hasAlerts
							? t('sellerDashboard.featureCard.tag')
							: t('sellerDashboard.featureCard.okTag')}
				</Box>

				{/* placeholder visual */}
				<Box
					sx={{
						my: 1.75,
						height: 110,
						borderRadius: 1.5,
						bgcolor: tokens.surface2,
						border: `1px dashed ${tokens.line}`,
						display: 'grid',
						placeItems: 'center',
						color: tokens.ink3,
					}}
				>
					<FontAwesomeIcon
						icon={hasAlerts ? Icons.warning : Icons.checkCircle}
						size="2x"
						color={hasAlerts ? tokens.amber : tokens.cyan}
					/>
				</Box>

				<Typography sx={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.01em', mb: 0.5 }}>
					{loading
						? '…'
						: hasAlerts
							? t('sellerDashboard.featureCard.title', { count: lowStockCount })
							: t('sellerDashboard.featureCard.okTitle')}
				</Typography>

				<Typography sx={{ fontSize: 13, color: tokens.ink3, mb: 0 }}>
					{hasAlerts
						? t('sellerDashboard.featureCard.body')
						: t('sellerDashboard.featureCard.okBody')}
				</Typography>
			</Box>

			{hasAlerts && (
				<Link
					component="button"
					onClick={() => navigate(ROUTES.SELLER_PRODUCTS)}
					underline="none"
					sx={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 1,
						fontSize: 13.5,
						fontWeight: 600,
						color: tokens.accent,
						cursor: 'pointer',
						mt: 2,
						'&:hover': { color: tokens.accentInk },
					}}
				>
					{t('sellerDashboard.featureCard.cta')}
					<FontAwesomeIcon icon={Icons.arrowRight} style={{ fontSize: 12 }} />
				</Link>
			)}
		</Box>
	);
}

// ─── Revenue chart ────────────────────────────────────────────────────────────

interface RevenueChartProps {
	granularity: RevenueGranularity;
	onGranularityChange: (g: RevenueGranularity) => void;
	data: Array<{ date: string; revenue: number }>;
	loading: boolean;
	totalRevenue: number;
}

function RevenueChart({
	granularity,
	onGranularityChange,
	data,
	loading,
	totalRevenue,
}: RevenueChartProps) {
	const { t } = useTranslation();

	const GRANULARITY_OPTIONS = [
		{ value: 'DAY', label: t('sellerDashboard.chart.granularity.DAY') },
		{ value: 'WEEK', label: t('sellerDashboard.chart.granularity.WEEK') },
		{ value: 'MONTH', label: t('sellerDashboard.chart.granularity.MONTH') },
	];

	const chartData = useMemo(
		() =>
			data.map((p) => ({
				...p,
				label: formatChartDate(p.date, granularity),
			})),
		[data, granularity]
	);

	return (
		<Box
			sx={{
				background: tokens.surface,
				border: `1px solid ${tokens.line}`,
				borderRadius: tokens.radius / 8,
				p: 3,
				height: '100%',
				boxSizing: 'border-box',
			}}
		>
			{/* head */}
			<Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={0.5}>
				<Box>
					<Typography sx={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.01em' }}>
						{t('sellerDashboard.chart.title')}
					</Typography>
					<Typography sx={{ fontSize: 12.5, color: tokens.ink3, mt: 0.5 }}>
						{t('sellerDashboard.chart.subtitle')}
					</Typography>
				</Box>
				<SegmentedControl
					options={GRANULARITY_OPTIONS}
					value={granularity}
					onChange={(v) => onGranularityChange(v as RevenueGranularity)}
					size="sm"
				/>
			</Stack>

			{/* legend */}
			<Stack
				direction="row"
				spacing={2.5}
				mt={2.25}
				mb={1}
				sx={{ fontSize: 12.5, color: tokens.ink2 }}
			>
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
					<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: tokens.accent }} />
					{t('sellerDashboard.chart.legendRevenue')}
					<Box component="strong" sx={{ fontWeight: 700, color: tokens.ink1, ml: 0.75 }}>
						{formatRevenueExact(totalRevenue)}
					</Box>
				</Box>
			</Stack>

			{/* chart */}
			{loading ? (
				<Box sx={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
					<Typography sx={{ color: tokens.ink3, fontSize: 13 }}>…</Typography>
				</Box>
			) : chartData.length === 0 ? (
				<Box sx={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
					<Typography sx={{ color: tokens.ink3, fontSize: 13 }}>
						{t('sellerDashboard.chart.empty')}
					</Typography>
				</Box>
			) : (
				<ResponsiveContainer width="100%" height={220}>
					<AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
						<defs>
							<linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor={tokens.purple} stopOpacity={0.15} />
								<stop offset="95%" stopColor={tokens.purple} stopOpacity={0} />
							</linearGradient>
						</defs>
						<CartesianGrid strokeDasharray="2 4" stroke={tokens.line2} vertical={false} />
						<XAxis
							dataKey="label"
							tick={{ fontSize: 11.5, fill: tokens.ink3 }}
							axisLine={false}
							tickLine={false}
							interval="preserveStartEnd"
						/>
						<YAxis
							tick={{ fontSize: 11.5, fill: tokens.ink3 }}
							axisLine={false}
							tickLine={false}
							tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)}
							width={52}
						/>
						<Tooltip content={<ChartTooltip />} />
						<Area
							type="monotone"
							dataKey="revenue"
							stroke={tokens.purple}
							fill="url(#revenueGrad)"
							strokeWidth={2.5}
							dot={false}
							activeDot={{ r: 5, fill: tokens.purple, strokeWidth: 0 }}
						/>
					</AreaChart>
				</ResponsiveContainer>
			)}
		</Box>
	);
}

// ─── Low stock side card ───────────────────────────────────────────────────────

interface LowStockSideCardProps {
	items: LowStockAlertItem[];
	loading: boolean;
}

function LowStockSideCard({ items, loading }: LowStockSideCardProps) {
	const { t } = useTranslation();

	return (
		<Box
			sx={{
				background: tokens.surface,
				border: `1px solid ${tokens.line}`,
				borderRadius: tokens.radius / 8,
				p: 3,
				height: '100%',
				boxSizing: 'border-box',
			}}
		>
			{/* head */}
			<Typography sx={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.01em' }}>
				{t('sellerDashboard.lowStock.title')}
			</Typography>
			<Typography sx={{ fontSize: 12.5, color: tokens.ink3, mt: 0.5, mb: 2 }}>
				{t('sellerDashboard.lowStock.subtitle')}
			</Typography>

			{loading ? (
				<Box sx={{ color: tokens.ink3, fontSize: 13, py: 2, textAlign: 'center' }}>…</Box>
			) : items.length === 0 ? (
				<EmptyState
					icon={Icons.checkCircle}
					title={t('sellerDashboard.lowStock.empty')}
					description={t('sellerDashboard.lowStock.emptyDesc')}
				/>
			) : (
				<Stack spacing={1.25}>
					{items.map((item) => {
						const variantStr = Object.entries(item.variantOptions)
							.map(([k, v]) => `${k}: ${v}`)
							.join(', ');
						const stockColor =
							item.stock === 0
								? tokens.coralInk
								: item.stock <= 2
									? tokens.coralInk
									: tokens.amberInk;
						const stockBg =
							item.stock === 0
								? tokens.coralSoft
								: item.stock <= 2
									? tokens.coralSoft
									: tokens.amberSoft;

						return (
							<Box
								key={item.variantId}
								sx={{
									display: 'flex',
									alignItems: 'center',
									gap: 1.5,
									p: 1.25,
									borderRadius: 1.5,
									border: `1px solid ${tokens.line}`,
									bgcolor: tokens.surface,
								}}
							>
								{/* thumb */}
								<Box
									sx={{
										width: 40,
										height: 40,
										borderRadius: 1.25,
										bgcolor: tokens.surface2,
										flexShrink: 0,
										overflow: 'hidden',
									}}
								>
									{item.imageUrl ? (
										<AppImage
											src={item.imageUrl}
											alt={item.titleEn}
											sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
										/>
									) : (
										<Box
											sx={{
												width: '100%',
												height: '100%',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
											}}
										>
											<FontAwesomeIcon icon={Icons.image} color={tokens.ink3} />
										</Box>
									)}
								</Box>

								{/* info */}
								<Box sx={{ flex: 1, minWidth: 0 }}>
									<Typography
										sx={{
											fontSize: 12.5,
											fontWeight: 600,
											color: tokens.ink1,
											whiteSpace: 'nowrap',
											overflow: 'hidden',
											textOverflow: 'ellipsis',
										}}
									>
										{item.titleEn}
									</Typography>
									{variantStr && (
										<Typography sx={{ fontSize: 11, color: tokens.ink3 }}>{variantStr}</Typography>
									)}
								</Box>

								{/* stock badge */}
								<Box
									sx={{
										flexShrink: 0,
										fontSize: 11.5,
										fontWeight: 700,
										color: stockColor,
										bgcolor: stockBg,
										px: 1,
										py: 0.375,
										borderRadius: 999,
										whiteSpace: 'nowrap',
									}}
								>
									{item.stock} {t('sellerDashboard.lowStock.stockLabel')}
								</Box>
							</Box>
						);
					})}
				</Stack>
			)}
		</Box>
	);
}

// ─── Top products table ────────────────────────────────────────────────────────

interface TopProductsTableProps {
	products: TopProduct[];
	loading: boolean;
}

function TopProductsTable({ products, loading }: TopProductsTableProps) {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const columns: AppTableColumn<TopProduct>[] = [
		{
			key: 'product',
			label: t('sellerDashboard.topProducts.col.product'),
			render: (row) => (
				<Stack direction="row" alignItems="center" spacing={1.5}>
					<Box
						sx={{
							width: 44,
							height: 44,
							borderRadius: 1.5,
							bgcolor: tokens.surface2,
							flexShrink: 0,
							overflow: 'hidden',
						}}
					>
						{row.imageUrl ? (
							<AppImage
								src={row.imageUrl}
								alt={row.titleEn}
								sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
							/>
						) : (
							<Box
								sx={{
									width: '100%',
									height: '100%',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
								}}
							>
								<FontAwesomeIcon icon={Icons.image} color={tokens.ink3} size="sm" />
							</Box>
						)}
					</Box>
					<Box>
						<Typography sx={{ fontSize: 13, fontWeight: 600, color: tokens.ink1 }}>
							{row.titleEn}
						</Typography>
					</Box>
				</Stack>
			),
		},
		{
			key: 'sku',
			label: t('sellerDashboard.topProducts.col.sku'),
			width: 120,
			render: (row) => (
				<Typography sx={{ fontSize: 12.5, color: tokens.ink2, fontFamily: 'monospace' }}>
					{row.sku}
				</Typography>
			),
		},
		{
			key: 'revenue',
			label: t('sellerDashboard.topProducts.col.revenue'),
			width: 120,
			align: 'right',
			render: (row) => (
				<Typography sx={{ fontSize: 13, fontWeight: 700, color: tokens.ink1 }}>
					{formatRevenueExact(row.revenue)}
				</Typography>
			),
		},
		{
			key: 'orderCount',
			label: t('sellerDashboard.topProducts.col.orders'),
			width: 80,
			align: 'center',
			render: (row) => (
				<Typography sx={{ fontSize: 13, color: tokens.ink2 }}>{row.orderCount}</Typography>
			),
		},
	];

	return (
		<Box
			sx={{
				background: tokens.surface,
				border: `1px solid ${tokens.line}`,
				borderRadius: tokens.radius / 8,
				overflow: 'hidden',
			}}
		>
			{/* head */}
			<Box
				sx={{
					display: 'flex',
					alignItems: 'flex-start',
					justifyContent: 'space-between',
					px: 3,
					py: 2.5,
					borderBottom: `1px solid ${tokens.line}`,
				}}
			>
				<Box>
					<Typography sx={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.01em' }}>
						{t('sellerDashboard.topProducts.title')}
					</Typography>
					<Typography sx={{ fontSize: 12.5, color: tokens.ink3, mt: 0.5 }}>
						{t('sellerDashboard.topProducts.subtitle')}
					</Typography>
				</Box>
				<Box
					component="button"
					onClick={() => navigate(ROUTES.SELLER_PRODUCTS)}
					sx={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 0.75,
						fontSize: 13.5,
						fontWeight: 600,
						color: tokens.accent,
						bgcolor: 'transparent',
						border: 0,
						cursor: 'pointer',
						fontFamily: 'inherit',
						'&:hover': { color: tokens.accentInk },
					}}
				>
					{t('sellerDashboard.topProducts.viewAll')}
					<FontAwesomeIcon icon={Icons.arrowRight} style={{ fontSize: 12 }} />
				</Box>
			</Box>

			{products.length === 0 && !loading ? (
				<Box sx={{ py: 6 }}>
					<EmptyState
						icon={Icons.chartLine}
						title={t('sellerDashboard.topProducts.empty')}
						description={t('sellerDashboard.topProducts.emptyDesc')}
					/>
				</Box>
			) : (
				<AppTable
					columns={columns}
					rows={products}
					loading={loading}
					rowKey={(r) => r.productId}
					emptyTitle={t('sellerDashboard.topProducts.empty')}
					emptyDescription={t('sellerDashboard.topProducts.emptyDesc')}
				/>
			)}
		</Box>
	);
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SellerDashboardPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { user } = useAuth();

	const [period, setPeriod] = useState<DashboardPeriod>('MONTH');
	const [granularity, setGranularity] = useState<RevenueGranularity>(DEFAULT_GRANULARITY['MONTH']);

	const PERIOD_OPTIONS = (['WEEK', 'MONTH', 'QUARTER', 'YEAR'] as DashboardPeriod[]).map((p) => ({
		value: p,
		label: t(`sellerDashboard.period.${p}`),
	}));

	const handlePeriodChange = (p: string) => {
		const next = p as DashboardPeriod;
		setPeriod(next);
		setGranularity(DEFAULT_GRANULARITY[next]);
	};

	// ── Queries ──
	const { data: statsData, loading: statsLoading } = useQuery<SellerStatsData>(SELLER_STATS_QUERY, {
		variables: { period },
		fetchPolicy: 'cache-and-network',
	});
	const { data: seriesData, loading: seriesLoading } = useQuery<SellerRevenueSeriesData>(
		SELLER_REVENUE_SERIES_QUERY,
		{ variables: { granularity, period }, fetchPolicy: 'cache-and-network' }
	);
	const { data: topData, loading: topLoading } = useQuery<SellerTopProductsData>(
		SELLER_TOP_PRODUCTS_QUERY,
		{ variables: { limit: 5 }, fetchPolicy: 'cache-and-network' }
	);
	const { data: stockData, loading: stockLoading } = useQuery<SellerLowStockAlertsData>(
		SELLER_LOW_STOCK_ALERTS_QUERY,
		{ variables: { threshold: 5 }, fetchPolicy: 'cache-and-network' }
	);
	const { data: summaryData } = useQuery<SellerDashboardSummaryData>(SELLER_DASHBOARD_SUMMARY_QUERY);
	const { data: recentOrdersData, loading: recentOrdersLoading } = useQuery<{
		mySellerOrders: { items: SellerRecentOrder[] };
	}>(MY_SELLER_ORDERS_QUERY, {
		variables: { filter: { page: 1, pageSize: 5 } },
	});

	const stats = statsData?.sellerStats;
	const seriesPoints = seriesData?.sellerRevenueSeries ?? [];
	const topProducts = topData?.sellerTopProducts ?? [];
	const lowStockItems = stockData?.sellerLowStockAlerts ?? [];
	const summary = summaryData?.sellerDashboardSummary;
	const recentOrders = recentOrdersData?.mySellerOrders?.items ?? [];

	const periodLabel = t(`sellerDashboard.period.${period}`);

	const alerts = useMemo(() => {
		const items = [];
		if (lowStockItems.length > 0) {
			items.push({
				id: 'lowStock',
				messageKey: 'sellerDashboard.alerts.lowStock',
				messageParams: { count: lowStockItems.length },
				href: ROUTES.SELLER_PRODUCTS,
				tone: 'warning' as const,
			});
		}
		if ((summary?.pendingModerationCount ?? 0) > 0) {
			items.push({
				id: 'moderation',
				messageKey: 'sellerDashboard.alerts.pendingModeration',
				messageParams: { count: summary!.pendingModerationCount },
				href: ROUTES.SELLER_PRODUCTS,
				tone: 'warning' as const,
			});
		}
		if ((summary?.unrepliedReviewCount ?? 0) > 0) {
			items.push({
				id: 'reviews',
				messageKey: 'sellerDashboard.alerts.unrepliedReviews',
				messageParams: { count: summary!.unrepliedReviewCount },
				href: ROUTES.SELLER_PRODUCTS,
				tone: 'danger' as const,
			});
		}
		return items;
	}, [lowStockItems.length, summary]);

	return (
		<Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
			<DashboardWelcomeHeader
				name={user?.profile?.firstName}
				role={Role.SELLER}
				subtitleKey="sellerDashboard.pageSubtitle"
			/>

			<DashboardAlertBanner alerts={alerts} />

			<Box
				sx={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'flex-end',
					mb: 2.5,
					flexWrap: 'wrap',
					gap: 1.5,
				}}
			>
				<SegmentedControl
					options={PERIOD_OPTIONS}
					value={period}
					onChange={handlePeriodChange}
					size="sm"
				/>
				<AppButton
					variant="outlined"
					size="small"
					startIcon={<FontAwesomeIcon icon={Icons.add} />}
					onClick={() => navigate(ROUTES.SELLER_PRODUCT_NEW)}
				>
					{t('sellerDashboard.addProduct')}
				</AppButton>
				<AppButton
					variant="contained"
					size="small"
					startIcon={<FontAwesomeIcon icon={Icons.order} />}
					onClick={() => navigate(ROUTES.SELLER_ORDERS)}
				>
					{t('sellerDashboard.viewOrders')}
				</AppButton>
			</Box>

			{/* ── Row 1: Hero (3-col) + Feature (1-col) ── */}
			<Grid container spacing={2.5} sx={{ mb: 2.5 }}>
				<Grid item xs={12} md={9}>
					<HeroCard
						revenue={stats?.totalRevenue ?? 0}
						orders={stats?.totalOrders ?? 0}
						period={period}
						periodLabel={periodLabel}
						loading={statsLoading}
					/>
				</Grid>
				<Grid item xs={12} md={3}>
					<FeatureCard lowStockCount={lowStockItems.length} loading={stockLoading} />
				</Grid>
			</Grid>

			{/* ── Row 2: 4 stat cards ── */}
			<Grid container spacing={2.5} sx={{ mb: 2.5 }}>
				<Grid item xs={6} md={3}>
					<StatCard
						icon={Icons.products}
						label={t('sellerDashboard.stats.activeProducts')}
						value={statsLoading ? '…' : (stats?.totalProducts ?? 0)}
						tone="accent"
					/>
				</Grid>
				<Grid item xs={6} md={3}>
					<StatCard
						icon={Icons.order}
						label={t('sellerDashboard.stats.orders')}
						value={statsLoading ? '…' : (stats?.totalOrders ?? 0)}
						tone="amber"
					/>
				</Grid>
				<Grid item xs={6} md={3}>
					<StatCard
						icon={Icons.wallet}
						label={t('sellerDashboard.stats.revenue')}
						value={statsLoading ? '…' : formatRevenueLarge(stats?.totalRevenue ?? 0)}
						tone="cyan"
					/>
				</Grid>
				<Grid item xs={6} md={3}>
					<StatCard
						icon={Icons.star}
						label={t('sellerDashboard.stats.avgRating')}
						value={
							statsLoading
								? '…'
								: stats?.averageRating != null
									? stats.averageRating.toFixed(1)
									: t('sellerDashboard.stats.noRating')
						}
						tone="coral"
					/>
				</Grid>
			</Grid>

			{/* ── Row 3: Chart (3-col) + Low Stock side (1-col) ── */}
			<Grid container spacing={2.5} sx={{ mb: 2.5 }}>
				<Grid item xs={12} md={9}>
					<RevenueChart
						granularity={granularity}
						onGranularityChange={setGranularity}
						data={seriesPoints}
						loading={seriesLoading}
						totalRevenue={stats?.totalRevenue ?? 0}
					/>
				</Grid>
				<Grid item xs={12} md={3}>
					<LowStockSideCard items={lowStockItems} loading={stockLoading} />
				</Grid>
			</Grid>

			{/* ── Row 4: Recent orders + moderation summary ── */}
			<Grid container spacing={2.5} sx={{ mb: 2.5 }}>
				<Grid item xs={12} md={8}>
					<DashboardSectionCard
						titleKey="sellerDashboard.recentOrders.title"
						subtitleKey="sellerDashboard.recentOrders.subtitle"
						actionLabelKey="dashboard.common.viewAll"
						actionHref={ROUTES.SELLER_ORDERS}
					>
						{recentOrders.length === 0 && !recentOrdersLoading ? (
							<EmptyState
								icon={Icons.order}
								title={t('sellerDashboard.recentOrders.empty')}
								description={t('sellerDashboard.recentOrders.emptyDesc')}
							/>
						) : (
							<Stack spacing={1.25}>
								{recentOrders.map((order) => (
									<Box
										key={order.id}
										sx={{
											display: 'flex',
											alignItems: 'center',
											gap: 1.5,
											p: 1.5,
											borderRadius: 1.5,
											border: `1px solid ${tokens.line}`,
										}}
									>
										<Box sx={{ flex: 1, minWidth: 0 }}>
											<Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>
												#KX-{order.id.slice(-4).toUpperCase()}
											</Typography>
											<Typography sx={{ fontSize: 12, color: tokens.ink3 }}>
												{order.buyer?.name ?? order.buyer?.email} · $
												{order.sellerSubtotal.toFixed(2)}
											</Typography>
										</Box>
										<StatusBadge
											status={order.status}
											label={t(`status.order.${order.status}`)}
										/>
										<AppButton
											variant="outlined"
											size="small"
											onClick={() => navigate(ROUTES.SELLER_ORDER(order.id))}
										>
											{t('sellerDashboard.recentOrders.process')}
										</AppButton>
									</Box>
								))}
							</Stack>
						)}
					</DashboardSectionCard>
				</Grid>
				<Grid item xs={12} md={4}>
					<DashboardSectionCard titleKey="sellerDashboard.moderation.title">
						<Stack spacing={1.25}>
							<Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: tokens.surface2 }}>
								<Typography sx={{ fontSize: 12, color: tokens.ink3 }}>
									{t('sellerDashboard.moderation.pending')}
								</Typography>
								<Typography sx={{ fontSize: 22, fontWeight: 700 }}>
									{summary?.pendingModerationCount ?? 0}
								</Typography>
							</Box>
							<Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: tokens.surface2 }}>
								<Typography sx={{ fontSize: 12, color: tokens.ink3 }}>
									{t('sellerDashboard.moderation.unrepliedReviews')}
								</Typography>
								<Typography sx={{ fontSize: 22, fontWeight: 700 }}>
									{summary?.unrepliedReviewCount ?? 0}
								</Typography>
							</Box>
						</Stack>
					</DashboardSectionCard>
				</Grid>
			</Grid>

			{/* ── Row 5: Top products (full width) ── */}
			<TopProductsTable products={topProducts} loading={topLoading} />

			<Box sx={{ mt: 2.5 }}>
				<DashboardQuickActions
					titleKey="sellerDashboard.quickActions.title"
					actions={[
						{
							id: 'addProduct',
							labelKey: 'sellerDashboard.quickActions.addProduct',
							href: ROUTES.SELLER_PRODUCT_NEW,
							icon: Icons.add,
						},
						{
							id: 'orders',
							labelKey: 'sellerDashboard.quickActions.orders',
							href: ROUTES.SELLER_ORDERS,
							icon: Icons.order,
							tone: 'cyan',
						},
						{
							id: 'products',
							labelKey: 'sellerDashboard.quickActions.products',
							href: ROUTES.SELLER_PRODUCTS,
							icon: Icons.products,
							tone: 'coral',
						},
					]}
				/>
			</Box>
		</Box>
	);
}
