import * as repo from '../repositories/sellerDashboardRepository.js';

export type DashboardPeriod = 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR';
export type RevenueGranularity = 'DAY' | 'WEEK' | 'MONTH';

const PERIOD_DAYS: Record<DashboardPeriod, number> = {
	WEEK: 7,
	MONTH: 30,
	QUARTER: 90,
	YEAR: 365,
};

function getPeriodStart(period: DashboardPeriod): Date {
	const ms = PERIOD_DAYS[period] * 24 * 60 * 60 * 1000;
	return new Date(Date.now() - ms);
}

function toDateString(raw: Date | string): string {
	const s = raw instanceof Date ? raw.toISOString() : String(raw);
	return s.split('T')[0];
}

export async function getSellerStats(sellerId: string, period: DashboardPeriod = 'MONTH') {
	const periodStart = getPeriodStart(period);
	const [totalRevenue, totalOrders, totalProducts, averageRating] = await Promise.all([
		repo.getSellerRevenue(sellerId, periodStart),
		repo.getSellerOrderCount(sellerId, periodStart),
		repo.getSellerProductCount(sellerId),
		repo.getSellerAverageRating(sellerId),
	]);
	return { totalRevenue, totalOrders, totalProducts, averageRating };
}

export async function getSellerRevenueSeries(
	sellerId: string,
	granularity: RevenueGranularity = 'DAY',
	period: DashboardPeriod = 'MONTH'
) {
	const periodStart = getPeriodStart(period);
	let rows: repo.RevenueSeriesRow[];

	if (granularity === 'WEEK') {
		rows = await repo.getRevenueSeriesWeek(sellerId, periodStart);
	} else if (granularity === 'MONTH') {
		rows = await repo.getRevenueSeriesMonth(sellerId, periodStart);
	} else {
		rows = await repo.getRevenueSeriesDay(sellerId, periodStart);
	}

	return rows.map((r) => ({
		date: toDateString(r.date),
		revenue: Number(r.revenue),
	}));
}

export async function getSellerTopProducts(sellerId: string, limit = 10) {
	const rows = await repo.getTopProductRows(sellerId, Math.min(limit, 50));
	if (rows.length === 0) return [];

	const productIds = rows.map((r) => r.productId);
	const products = await repo.findProductsForTopList(productIds, sellerId);
	const productMap = new Map(products.map((p) => [p.id, p]));

	return rows.map((row) => {
		const product = productMap.get(row.productId);
		const enT = product?.translations.find((t) => t.language === 'EN');
		return {
			productId: row.productId,
			titleEn: enT?.title ?? product?.sku ?? row.productId,
			sku: product?.sku ?? '',
			imageUrl: product?.media[0]?.url ?? null,
			revenue: Number(row.revenue),
			orderCount: Number(row.orderCount),
		};
	});
}

export async function getSellerDashboardSummary(sellerId: string) {
	const [pendingModerationCount, unrepliedReviewCount] = await Promise.all([
		repo.getSellerPendingModerationCount(sellerId),
		repo.getSellerUnrepliedReviewCount(sellerId),
	]);
	return { pendingModerationCount, unrepliedReviewCount };
}

export async function getSellerLowStockAlerts(sellerId: string, threshold = 5) {
	const variants = await repo.getLowStockVariants(sellerId, threshold);
	return variants.map((v) => {
		const enT = v.product.translations.find((t) => t.language === 'EN');
		return {
			productId: v.productId,
			titleEn: enT?.title ?? v.product.sku,
			sku: v.product.sku,
			imageUrl: v.product.media[0]?.url ?? null,
			variantId: v.id,
			variantOptions: v.options as Record<string, string>,
			stock: v.stock,
		};
	});
}
