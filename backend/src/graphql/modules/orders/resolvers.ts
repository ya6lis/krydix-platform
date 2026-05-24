import { GraphQLError } from 'graphql';
import { OrderStatus } from '@prisma/client';
import type { GraphQLContext } from '../../../types/context.js';
import {
	cancelOrder,
	confirmDelivery,
	requestRefund,
	getMyOrders,
	getMyOrder,
} from '../../../services/orderService.js';
import { countOrdersByBuyerAndStatus } from '../../../repositories/orderRepository.js';
import { MyOrdersFilterSchema } from '../../../validators/ordersValidators.js';

function requireAuth(context: GraphQLContext) {
	if (!context.user) {
		throw new GraphQLError('Authentication required', {
			extensions: { code: 'UNAUTHENTICATED' },
		});
	}
	return context.user;
}

export const ordersResolvers = {
	Query: {
		myOrders: async (
			_: unknown,
			args: {
				filter?: {
					status?: string;
					dateFrom?: string;
					dateTo?: string;
					search?: string;
					page?: number;
					pageSize?: number;
				};
			},
			context: GraphQLContext
		) => {
			const user = requireAuth(context);

			const parsed = MyOrdersFilterSchema.parse({
				status: args.filter?.status as OrderStatus | undefined,
				dateFrom: args.filter?.dateFrom,
				dateTo: args.filter?.dateTo,
				search: args.filter?.search,
				page: args.filter?.page ?? 1,
				pageSize: args.filter?.pageSize ?? 10,
			});

			return getMyOrders(
				user.id,
				{
					status: parsed.status,
					dateFrom: parsed.dateFrom ? new Date(parsed.dateFrom) : undefined,
					dateTo: parsed.dateTo ? new Date(parsed.dateTo) : undefined,
					search: parsed.search,
				},
				{ page: parsed.page, pageSize: parsed.pageSize }
			);
		},

		myOrder: async (_: unknown, args: { id: string }, context: GraphQLContext) => {
			const user = requireAuth(context);
			return getMyOrder(args.id, user.id);
		},

		myOrderStats: async (_: unknown, __: unknown, context: GraphQLContext) => {
			const user = requireAuth(context);
			return countOrdersByBuyerAndStatus(user.id);
		},
	},

	Mutation: {
		cancelOrder: async (_: unknown, args: { orderId: string }, context: GraphQLContext) => {
			const user = requireAuth(context);
			return cancelOrder(args.orderId, user.id);
		},

		confirmDelivery: async (_: unknown, args: { orderId: string }, context: GraphQLContext) => {
			const user = requireAuth(context);
			return confirmDelivery(args.orderId, user.id);
		},

		requestRefund: async (_: unknown, args: { orderId: string }, context: GraphQLContext) => {
			const user = requireAuth(context);
			return requestRefund(args.orderId, user.id);
		},
	},

	Order: {
		createdAt: (order: { createdAt: Date }) => order.createdAt.toISOString(),
		updatedAt: (order: { updatedAt: Date }) => order.updatedAt.toISOString(),
	},

	PaymentRecord: {
		createdAt: (record: { createdAt: Date }) => record.createdAt.toISOString(),
	},

	DeliveryRecord: {
		createdAt: (record: { createdAt: Date }) => record.createdAt.toISOString(),
	},
};
