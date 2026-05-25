import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../../../types/context.js';
import * as service from '../../../services/sellerDashboardService.js';
import type { DashboardPeriod, RevenueGranularity } from '../../../services/sellerDashboardService.js';

function requireSeller(ctx: GraphQLContext) {
	if (!ctx.user) {
		throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
	}
	if (ctx.user.role !== 'SELLER' && ctx.user.role !== 'ADMIN') {
		throw new GraphQLError('Seller access required', { extensions: { code: 'FORBIDDEN' } });
	}
	return ctx.user;
}

export const sellerDashboardResolvers = {
	Query: {
		sellerStats: async (
			_: unknown,
			{ period }: { period?: DashboardPeriod },
			ctx: GraphQLContext
		) => {
			const user = requireSeller(ctx);
			return service.getSellerStats(user.id, period ?? 'MONTH');
		},

		sellerRevenueSeries: async (
			_: unknown,
			{ granularity, period }: { granularity?: RevenueGranularity; period?: DashboardPeriod },
			ctx: GraphQLContext
		) => {
			const user = requireSeller(ctx);
			return service.getSellerRevenueSeries(user.id, granularity ?? 'DAY', period ?? 'MONTH');
		},

		sellerTopProducts: async (
			_: unknown,
			{ limit }: { limit?: number },
			ctx: GraphQLContext
		) => {
			const user = requireSeller(ctx);
			return service.getSellerTopProducts(user.id, limit ?? 10);
		},

		sellerLowStockAlerts: async (
			_: unknown,
			{ threshold }: { threshold?: number },
			ctx: GraphQLContext
		) => {
			const user = requireSeller(ctx);
			return service.getSellerLowStockAlerts(user.id, threshold ?? 5);
		},
	},
};
