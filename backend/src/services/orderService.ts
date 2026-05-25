import { OrderStatus, PaymentStatus } from '@prisma/client';
import { GraphQLError } from 'graphql';
import {
	findOrderByIdAndBuyer,
	updateOrderStatus,
	updatePaymentStatus,
	findOrdersByBuyer,
	findOrderById,
	type FindOrdersFilter,
	type Pagination,
	type PaginatedOrders,
	type OrderRecord,
} from '../repositories/orderRepository.js';
import {
	createReturnRequest,
	findReturnRequestByOrderId,
	type ReturnRequestRecord,
} from '../repositories/returnRequestRepository.js';

const CANCELLABLE_STATUSES: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.CONFIRMED];
const DELIVERABLE_STATUSES: OrderStatus[] = [OrderStatus.SHIPPED];
// requestRefund is for pre-shipment cancellation refunds only (CONFIRMED = paid but not yet shipped).
// Post-delivery refunds must go through requestReturn → return flow.
const REFUNDABLE_STATUSES: OrderStatus[] = [OrderStatus.CONFIRMED];
const RETURNABLE_STATUSES: OrderStatus[] = [OrderStatus.DELIVERED];

export async function cancelOrder(orderId: string, buyerId: string): Promise<OrderRecord> {
	const order = await findOrderByIdAndBuyer(orderId, buyerId);

	if (!order) {
		throw new GraphQLError('Order not found', { extensions: { code: 'NOT_FOUND' } });
	}

	if (!CANCELLABLE_STATUSES.includes(order.status)) {
		throw new GraphQLError(
			`Order cannot be cancelled in status "${order.status}". Only PENDING or CONFIRMED orders can be cancelled.`,
			{ extensions: { code: 'BAD_USER_INPUT' } }
		);
	}

	return updateOrderStatus(orderId, OrderStatus.CANCELLED);
}

export async function confirmDelivery(orderId: string, buyerId: string): Promise<OrderRecord> {
	const order = await findOrderByIdAndBuyer(orderId, buyerId);

	if (!order) {
		throw new GraphQLError('Order not found', { extensions: { code: 'NOT_FOUND' } });
	}

	if (!DELIVERABLE_STATUSES.includes(order.status)) {
		throw new GraphQLError(
			`Delivery can only be confirmed when order is SHIPPED. Current status: "${order.status}".`,
			{ extensions: { code: 'BAD_USER_INPUT' } }
		);
	}

	return updateOrderStatus(orderId, OrderStatus.DELIVERED);
}

export async function requestRefund(orderId: string, buyerId: string): Promise<OrderRecord> {
	const order = await findOrderByIdAndBuyer(orderId, buyerId);

	if (!order) {
		throw new GraphQLError('Order not found', { extensions: { code: 'NOT_FOUND' } });
	}

	if (!REFUNDABLE_STATUSES.includes(order.status)) {
		throw new GraphQLError(
			`Refund can only be requested for CONFIRMED orders (before shipment). Current status: "${order.status}". For delivered orders use requestReturn.`,
			{ extensions: { code: 'BAD_USER_INPUT' } }
		);
	}

	await updatePaymentStatus(orderId, PaymentStatus.REFUNDED);
	return updateOrderStatus(orderId, OrderStatus.REFUNDED);
}

export async function requestReturn(
	orderId: string,
	buyerId: string,
	reason: string,
	details?: string
): Promise<ReturnRequestRecord> {
	const order = await findOrderByIdAndBuyer(orderId, buyerId);

	if (!order) {
		throw new GraphQLError('Order not found', { extensions: { code: 'NOT_FOUND' } });
	}

	if (!RETURNABLE_STATUSES.includes(order.status)) {
		throw new GraphQLError(
			`Return requests are only available for DELIVERED orders. Current status: "${order.status}".`,
			{ extensions: { code: 'BAD_USER_INPUT' } }
		);
	}

	if (!order.delivery || order.delivery.status !== 'DELIVERED') {
		throw new GraphQLError(
			`Return requests require a delivered package. Current delivery status: "${order.delivery?.status ?? 'N/A'}".`,
			{ extensions: { code: 'BAD_USER_INPUT' } }
		);
	}

	const existingRequest = await findReturnRequestByOrderId(orderId);
	if (existingRequest) {
		throw new GraphQLError('A return request already exists for this order.', {
			extensions: { code: 'BAD_USER_INPUT' },
		});
	}

	if (!reason.trim()) {
		throw new GraphQLError('Return reason is required.', {
			extensions: { code: 'BAD_USER_INPUT' },
		});
	}

	const sellerId = order.items[0]?.sellerId;
	if (!sellerId) {
		throw new GraphQLError('Unable to determine seller for this order.', {
			extensions: { code: 'BAD_USER_INPUT' },
		});
	}

	return createReturnRequest({
		orderId,
		buyerId,
		sellerId,
		reason: reason.trim(),
		details: details?.trim() || null,
	});
}

export async function getMyOrders(
	buyerId: string,
	filter?: FindOrdersFilter,
	pagination?: Pagination
): Promise<PaginatedOrders> {
	return findOrdersByBuyer(buyerId, filter, pagination);
}

export async function getMyOrder(orderId: string, buyerId: string): Promise<OrderRecord> {
	const order = await findOrderByIdAndBuyer(orderId, buyerId);

	if (!order) {
		throw new GraphQLError('Order not found', { extensions: { code: 'NOT_FOUND' } });
	}

	return order;
}

export async function getOrderById(orderId: string): Promise<OrderRecord | null> {
	return findOrderById(orderId);
}
