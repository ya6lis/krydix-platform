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

const CANCELLABLE_STATUSES: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.CONFIRMED];
const DELIVERABLE_STATUSES: OrderStatus[] = [OrderStatus.SHIPPED];
const REFUNDABLE_STATUSES: OrderStatus[] = [OrderStatus.DELIVERED, OrderStatus.CONFIRMED];

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
			`Refund can only be requested for DELIVERED or CONFIRMED orders. Current status: "${order.status}".`,
			{ extensions: { code: 'BAD_USER_INPUT' } }
		);
	}

	await updatePaymentStatus(orderId, PaymentStatus.REFUNDED);
	return updateOrderStatus(orderId, OrderStatus.REFUNDED);
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
