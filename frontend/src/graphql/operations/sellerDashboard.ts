import { gql } from '@apollo/client';

export const SELLER_STATS_QUERY = gql`
	query SellerStats($period: DashboardPeriod) {
		sellerStats(period: $period) {
			totalRevenue
			totalOrders
			totalProducts
			averageRating
		}
	}
`;

export const SELLER_REVENUE_SERIES_QUERY = gql`
	query SellerRevenueSeries($granularity: RevenueGranularity, $period: DashboardPeriod) {
		sellerRevenueSeries(granularity: $granularity, period: $period) {
			date
			revenue
		}
	}
`;

export const SELLER_TOP_PRODUCTS_QUERY = gql`
	query SellerTopProducts($limit: Int) {
		sellerTopProducts(limit: $limit) {
			productId
			titleEn
			sku
			imageUrl
			revenue
			orderCount
		}
	}
`;

export const SELLER_LOW_STOCK_ALERTS_QUERY = gql`
	query SellerLowStockAlerts($threshold: Int) {
		sellerLowStockAlerts(threshold: $threshold) {
			productId
			titleEn
			sku
			imageUrl
			variantId
			variantOptions
			stock
		}
	}
`;

// ─── TypeScript interfaces ────────────────────────────────────────────────────

export interface SellerStatsData {
	sellerStats: {
		totalRevenue: number;
		totalOrders: number;
		totalProducts: number;
		averageRating: number | null;
	};
}

export interface RevenuePoint {
	date: string;
	revenue: number;
}

export interface SellerRevenueSeriesData {
	sellerRevenueSeries: RevenuePoint[];
}

export interface TopProduct {
	productId: string;
	titleEn: string;
	sku: string;
	imageUrl: string | null;
	revenue: number;
	orderCount: number;
}

export interface SellerTopProductsData {
	sellerTopProducts: TopProduct[];
}

export interface LowStockAlertItem {
	productId: string;
	titleEn: string;
	sku: string;
	imageUrl: string | null;
	variantId: string;
	variantOptions: Record<string, string>;
	stock: number;
}

export interface SellerLowStockAlertsData {
	sellerLowStockAlerts: LowStockAlertItem[];
}
