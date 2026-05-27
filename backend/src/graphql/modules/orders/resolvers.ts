import { GraphQLError } from 'graphql';
import { OrderStatus } from '@prisma/client';
import type { GraphQLContext } from '../../../types/context.js';
import { requireImportExport } from '../../../utils/importExportAccess.js';
import { requireSellerCabinet } from '../../../utils/sellerCabinetAccess.js';
import { exportSellerOrders } from '../../../services/orderExportService.js';
import {
	cancelOrder,
	confirmDelivery,
	requestRefund,
	requestReturn,
	getMyOrders,
	getMyOrder,
	getMySellerOrders,
	getMySellerOrder,
	shipSellerOrder,
	confirmSellerOrder,
	markSellerOrderPacked,
	markSellerOrderInTransit,
	markSellerOrderDelivered,
	cancelSellerOrder,
	updateSellerOrderTracking,
	reviewSellerReturnRequest,
	markSellerReturnReceived,
	processSellerReturnRefund,
} from '../../../services/orderService.js';
import {
	countOrdersByBuyerAndStatus,
	countOrdersBySellerAndStatus,
} from '../../../repositories/orderRepository.js';
import {
	MyOrdersFilterSchema,
	ShipSellerOrderSchema,
	CancelSellerOrderSchema,
	UpdateSellerTrackingSchema,
	ReviewSellerReturnSchema,
	SellerOrderIdSchema,
} from '../../../validators/ordersValidators.js';

function requireAuth(context: GraphQLContext) {
	if (!context.user) {
		throw new GraphQLError('Authentication required', {
			extensions: { code: 'UNAUTHENTICATED' },
		});
	}
	return context.user;
}

function requireSeller(context: GraphQLContext) {
	return requireSellerCabinet(context);
}

function parseOrdersFilter(args: {
	filter?: {
		status?: string;
		dateFrom?: string;
		dateTo?: string;
		search?: string;
		page?: number;
		pageSize?: number;
	};
}) {
	return MyOrdersFilterSchema.parse({
		status: args.filter?.status as OrderStatus | undefined,
		dateFrom: args.filter?.dateFrom,
		dateTo: args.filter?.dateTo,
		search: args.filter?.search,
		page: args.filter?.page ?? 1,
		pageSize: args.filter?.pageSize ?? 10,
	});
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
			const parsed = parseOrdersFilter(args);

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

		mySellerOrders: async (
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
			const user = requireSeller(context);
			const parsed = parseOrdersFilter(args);

			return getMySellerOrders(
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

		mySellerOrder: async (_: unknown, args: { id: string }, context: GraphQLContext) => {
			const user = requireSeller(context);
			return getMySellerOrder(args.id, user.id);
		},

		mySellerOrderStats: async (_: unknown, __: unknown, context: GraphQLContext) => {
			const user = requireSeller(context);
			return countOrdersBySellerAndStatus(user.id);
		},

		exportMySellerOrders: async (
			_: unknown,
			args: {
				filter?: {
					status?: string;
					search?: string;
				};
			},
			context: GraphQLContext,
		) => {
			const user = requireImportExport(context);
			return exportSellerOrders(user.id, {
				status: args.filter?.status as OrderStatus | undefined,
				search: args.filter?.search,
			});
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

		requestReturn: async (
			_: unknown,
			args: { orderId: string; reason: string; details?: string },
			context: GraphQLContext
		) => {
			const user = requireAuth(context);
			return requestReturn(args.orderId, user.id, args.reason, args.details);
		},

		shipSellerOrder: async (
			_: unknown,
			args: { orderId: string; trackingCode?: string },
			context: GraphQLContext
		) => {
			const user = requireSeller(context);
			const parsed = ShipSellerOrderSchema.parse(args);
			return shipSellerOrder(parsed.orderId, user.id, parsed.trackingCode);
		},

		confirmSellerOrder: async (_: unknown, args: { orderId: string }, context: GraphQLContext) => {
			const user = requireSeller(context);
			const parsed = SellerOrderIdSchema.parse(args);
			return confirmSellerOrder(parsed.orderId, user.id);
		},

		markSellerOrderPacked: async (_: unknown, args: { orderId: string }, context: GraphQLContext) => {
			const user = requireSeller(context);
			const parsed = SellerOrderIdSchema.parse(args);
			return markSellerOrderPacked(parsed.orderId, user.id);
		},

		markSellerOrderInTransit: async (
			_: unknown,
			args: { orderId: string },
			context: GraphQLContext
		) => {
			const user = requireSeller(context);
			const parsed = SellerOrderIdSchema.parse(args);
			return markSellerOrderInTransit(parsed.orderId, user.id);
		},

		markSellerOrderDelivered: async (
			_: unknown,
			args: { orderId: string },
			context: GraphQLContext
		) => {
			const user = requireSeller(context);
			const parsed = SellerOrderIdSchema.parse(args);
			return markSellerOrderDelivered(parsed.orderId, user.id);
		},

		cancelSellerOrder: async (
			_: unknown,
			args: { orderId: string; reason?: string },
			context: GraphQLContext
		) => {
			const user = requireSeller(context);
			const parsed = CancelSellerOrderSchema.parse(args);
			return cancelSellerOrder(parsed.orderId, user.id, parsed.reason);
		},

		updateSellerOrderTracking: async (
			_: unknown,
			args: { orderId: string; trackingCode: string },
			context: GraphQLContext
		) => {
			const user = requireSeller(context);
			const parsed = UpdateSellerTrackingSchema.parse(args);
			return updateSellerOrderTracking(parsed.orderId, user.id, parsed.trackingCode);
		},

		reviewSellerReturnRequest: async (
			_: unknown,
			args: { orderId: string; approve: boolean; resolution?: string },
			context: GraphQLContext
		) => {
			const user = requireSeller(context);
			const parsed = ReviewSellerReturnSchema.parse(args);
			return reviewSellerReturnRequest(
				parsed.orderId,
				user.id,
				parsed.approve,
				parsed.resolution
			);
		},

		markSellerReturnReceived: async (
			_: unknown,
			args: { orderId: string },
			context: GraphQLContext
		) => {
			const user = requireSeller(context);
			const parsed = SellerOrderIdSchema.parse(args);
			return markSellerReturnReceived(parsed.orderId, user.id);
		},

		processSellerReturnRefund: async (
			_: unknown,
			args: { orderId: string },
			context: GraphQLContext
		) => {
			const user = requireSeller(context);
			const parsed = SellerOrderIdSchema.parse(args);
			return processSellerReturnRefund(parsed.orderId, user.id);
		},
	},

	SellerOrder: {
		createdAt: (order: { createdAt: Date }) => order.createdAt.toISOString(),
		updatedAt: (order: { updatedAt: Date }) => order.updatedAt.toISOString(),
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

	ReturnRequest: {
		createdAt: (record: { createdAt: Date }) => record.createdAt.toISOString(),
		updatedAt: (record: { updatedAt: Date }) => record.updatedAt.toISOString(),
		reviewedAt: (record: { reviewedAt: Date | null }) =>
			record.reviewedAt ? record.reviewedAt.toISOString() : null,
		refundedAt: (record: { refundedAt: Date | null }) =>
			record.refundedAt ? record.refundedAt.toISOString() : null,
		closedAt: (record: { closedAt: Date | null }) =>
			record.closedAt ? record.closedAt.toISOString() : null,
	},

	OrderItem: {
		productMainImage: (item: any) => {
			// item.product may be included by repository; pick the main media url if available
			const prod = (item as any).product;
			if (!prod || !prod.media || prod.media.length === 0) return null;
			const main = prod.media.find((m: any) => m.isMain) || prod.media[0];
			return main?.url ?? null;
		},
	},
};
