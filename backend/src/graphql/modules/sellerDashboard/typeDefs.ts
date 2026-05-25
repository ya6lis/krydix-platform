export const sellerDashboardTypeDefs = `#graphql
	enum DashboardPeriod {
		WEEK
		MONTH
		QUARTER
		YEAR
	}

	enum RevenueGranularity {
		DAY
		WEEK
		MONTH
	}

	type SellerStats {
		totalRevenue: Float!
		totalOrders: Int!
		totalProducts: Int!
		averageRating: Float
	}

	type RevenuePoint {
		date: String!
		revenue: Float!
	}

	type DashboardTopProduct {
		productId: String!
		titleEn: String!
		sku: String!
		imageUrl: String
		revenue: Float!
		orderCount: Int!
	}

	type LowStockAlert {
		productId: String!
		titleEn: String!
		sku: String!
		imageUrl: String
		variantId: String!
		variantOptions: JSON!
		stock: Int!
	}

	extend type Query {
		sellerStats(period: DashboardPeriod): SellerStats!
		sellerRevenueSeries(granularity: RevenueGranularity, period: DashboardPeriod): [RevenuePoint!]!
		sellerTopProducts(limit: Int): [DashboardTopProduct!]!
		sellerLowStockAlerts(threshold: Int): [LowStockAlert!]!
	}
`;
