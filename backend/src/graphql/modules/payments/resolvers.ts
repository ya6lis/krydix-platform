import { GraphQLError } from 'graphql';
import { PayoutStatus } from '@prisma/client';
import type { GraphQLContext } from '../../../types/context.js';
import { requireSellerCabinet } from '../../../utils/sellerCabinetAccess.js';
import {
	getSellerFinanceSummary,
	getSellerPayouts,
	withdrawSellerPayouts,
} from '../../../services/payoutService.js';

export const paymentsResolvers = {
	Query: {
		sellerFinanceSummary: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
			const user = requireSellerCabinet(ctx);
			return getSellerFinanceSummary(user.id);
		},
		sellerPayouts: async (
			_: unknown,
			args: { filter?: { status?: string; page?: number; pageSize?: number } },
			ctx: GraphQLContext
		) => {
			const user = requireSellerCabinet(ctx);
			return getSellerPayouts(
				user.id,
				args.filter?.status ? { status: args.filter.status as PayoutStatus } : undefined,
				{
					page: args.filter?.page ?? 1,
					pageSize: args.filter?.pageSize ?? 20,
				}
			);
		},
	},
	Mutation: {
		withdrawSellerPayouts: async (
			_: unknown,
			args: { payoutIds?: string[] },
			ctx: GraphQLContext
		) => {
			const user = requireSellerCabinet(ctx);
			try {
				return await withdrawSellerPayouts(user.id, args.payoutIds);
			} catch (error) {
				if (error instanceof GraphQLError) throw error;
				throw new GraphQLError('Withdrawal failed', { extensions: { code: 'INTERNAL_ERROR' } });
			}
		},
	},
};
