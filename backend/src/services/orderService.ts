import { OrderStatus, PaymentStatus, DeliveryStatus, ReturnRequestStatus } from '@prisma/client';
import { GraphQLError } from 'graphql';
import {
	findOrderByIdAndBuyer,
	updateOrderStatus,
	updatePaymentStatus,
	findOrdersByBuyer,
	findOrderById,
	findOrdersBySeller,
	findOrderByIdAndSeller,
	updateDeliveryShipment,
	updateDeliveryRecord,
	markOrderDelivered,
	updateOrderNotes,
	type FindOrdersFilter,
	type Pagination,
	type PaginatedOrders,
	type OrderRecord,
	type SellerOrderRecord,
} from '../repositories/orderRepository.js';
import {
	createReturnRequest,
	findReturnRequestByOrderId,
	findReturnRequestByOrderIdAndSeller,
	updateReturnRequestStatus,
	type ReturnRequestRecord,
} from '../repositories/returnRequestRepository.js';
import * as notificationService from './notificationService.js';

const CANCELLABLE_STATUSES: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.CONFIRMED];
const DELIVERABLE_STATUSES: OrderStatus[] = [OrderStatus.SHIPPED];
// requestRefund is for pre-shipment cancellation refunds only (CONFIRMED = paid but not yet shipped).
// Post-delivery refunds must go through requestReturn → return flow.
const REFUNDABLE_STATUSES: OrderStatus[] = [OrderStatus.CONFIRMED];
const RETURNABLE_STATUSES: OrderStatus[] = [OrderStatus.DELIVERED];
const SHIPPABLE_STATUSES: OrderStatus[] = [OrderStatus.CONFIRMED];
const SELLER_CANCELLABLE_STATUSES: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.CONFIRMED];
const SELLER_DELIVERABLE_STATUSES: OrderStatus[] = [OrderStatus.SHIPPED];
const RETURN_REVIEW_STATUSES: ReturnRequestStatus[] = [
	ReturnRequestStatus.REQUESTED,
	ReturnRequestStatus.UNDER_REVIEW,
];
const RETURN_RECEIVABLE_STATUSES: ReturnRequestStatus[] = [
	ReturnRequestStatus.APPROVED,
	ReturnRequestStatus.AWAITING_RETURN_SHIPPING,
];

async function requireSellerOrder(orderId: string, sellerId: string): Promise<SellerOrderRecord> {
	const order = await findOrderByIdAndSeller(orderId, sellerId);
	if (!order) {
		throw new GraphQLError('Order not found', { extensions: { code: 'NOT_FOUND' } });
	}
	return order;
}

async function finishSellerMutation(
	orderId: string,
	sellerId: string,
	beforeStatus?: OrderStatus
): Promise<SellerOrderView> {
	const refreshed = await findOrderByIdAndSeller(orderId, sellerId);
	if (!refreshed) {
		throw new GraphQLError('Order not found', { extensions: { code: 'NOT_FOUND' } });
	}
	if (beforeStatus) {
		void notificationService
			.notifyOrderStatusChange(refreshed, beforeStatus)
			.catch(() => undefined);
	}
	return mapToSellerOrderView(refreshed, sellerId);
}

async function requireSellerReturn(
	orderId: string,
	sellerId: string
): Promise<ReturnRequestRecord> {
	const returnRequest = await findReturnRequestByOrderIdAndSeller(orderId, sellerId);
	if (!returnRequest) {
		throw new GraphQLError('Return request not found for this order.', {
			extensions: { code: 'NOT_FOUND' },
		});
	}
	return returnRequest;
}

export interface SellerOrderBuyerView {
	id: string;
	name: string;
	email: string;
	phone?: string | null;
}

export interface SellerOrderView {
	id: string;
	status: OrderStatus;
	sellerSubtotal: number;
	itemCount: number;
	buyer: SellerOrderBuyerView;
	items: SellerOrderRecord['items'];
	payment: SellerOrderRecord['payment'];
	delivery: SellerOrderRecord['delivery'];
	returnRequest: SellerOrderRecord['returnRequest'];
	createdAt: Date;
	updatedAt: Date;
}

export interface PaginatedSellerOrders {
	items: SellerOrderView[];
	total: number;
	page: number;
	pageSize: number;
}

function getBuyerDisplayName(order: SellerOrderRecord): string {
	const profile = order.buyer.profile;
	if (profile?.displayName?.trim()) {
		return profile.displayName.trim();
	}
	const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim();
	return fullName || order.buyer.email;
}

export function mapToSellerOrderView(order: SellerOrderRecord, sellerId: string): SellerOrderView {
	const items = order.items.filter((item) => item.sellerId === sellerId);
	const sellerSubtotal = items.reduce((sum, item) => sum + Number(item.totalPrice), 0);
	const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
	const returnRequest =
		order.returnRequest && order.returnRequest.sellerId === sellerId ? order.returnRequest : null;

	return {
		id: order.id,
		status: order.status,
		sellerSubtotal,
		itemCount,
		buyer: {
			id: order.buyer.id,
			name: getBuyerDisplayName(order),
			email: order.buyer.email,
			phone: order.buyer.profile?.phone ?? null,
		},
		items,
		payment: order.payment,
		delivery: order.delivery,
		returnRequest,
		createdAt: order.createdAt,
		updatedAt: order.updatedAt,
	};
}

async function applyOrderStatusChange(orderId: string, status: OrderStatus): Promise<OrderRecord> {
	const before = await findOrderById(orderId);
	const order = await updateOrderStatus(orderId, status);
	if (before) {
		void notificationService.notifyOrderStatusChange(order, before.status).catch(() => undefined);
	}
	return order;
}

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

	return applyOrderStatusChange(orderId, OrderStatus.CANCELLED);
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

	return applyOrderStatusChange(orderId, OrderStatus.DELIVERED);
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
	return applyOrderStatusChange(orderId, OrderStatus.REFUNDED);
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

export async function getMySellerOrders(
	sellerId: string,
	filter?: FindOrdersFilter,
	pagination?: Pagination
): Promise<PaginatedSellerOrders> {
	const result = await findOrdersBySeller(sellerId, filter, pagination);
	return {
		items: result.items.map((order) => mapToSellerOrderView(order, sellerId)),
		total: result.total,
		page: result.page,
		pageSize: result.pageSize,
	};
}

export async function getMySellerOrder(orderId: string, sellerId: string): Promise<SellerOrderView> {
	const order = await findOrderByIdAndSeller(orderId, sellerId);

	if (!order) {
		throw new GraphQLError('Order not found', { extensions: { code: 'NOT_FOUND' } });
	}

	return mapToSellerOrderView(order, sellerId);
}

export async function shipSellerOrder(
	orderId: string,
	sellerId: string,
	trackingCode?: string
): Promise<SellerOrderView> {
	const order = await requireSellerOrder(orderId, sellerId);

	if (!SHIPPABLE_STATUSES.includes(order.status)) {
		throw new GraphQLError(
			`Order can only be shipped when status is CONFIRMED. Current status: "${order.status}".`,
			{ extensions: { code: 'BAD_USER_INPUT' } }
		);
	}

	if (!order.delivery) {
		throw new GraphQLError('Delivery record is missing for this order.', {
			extensions: { code: 'BAD_USER_INPUT' },
		});
	}

	const beforeStatus = order.status;
	await updateDeliveryShipment(orderId, trackingCode);
	return finishSellerMutation(orderId, sellerId, beforeStatus);
}

export async function confirmSellerOrder(orderId: string, sellerId: string): Promise<SellerOrderView> {
	const order = await requireSellerOrder(orderId, sellerId);

	if (order.status !== OrderStatus.PENDING) {
		throw new GraphQLError(
			`Order can only be confirmed when status is PENDING. Current status: "${order.status}".`,
			{ extensions: { code: 'BAD_USER_INPUT' } }
		);
	}

	const beforeStatus = order.status;
	await applyOrderStatusChange(orderId, OrderStatus.CONFIRMED);
	return finishSellerMutation(orderId, sellerId, beforeStatus);
}

export async function markSellerOrderPacked(
	orderId: string,
	sellerId: string
): Promise<SellerOrderView> {
	const order = await requireSellerOrder(orderId, sellerId);

	if (order.status !== OrderStatus.CONFIRMED) {
		throw new GraphQLError(
			`Order can only be packed when status is CONFIRMED. Current status: "${order.status}".`,
			{ extensions: { code: 'BAD_USER_INPUT' } }
		);
	}

	if (!order.delivery) {
		throw new GraphQLError('Delivery record is missing for this order.', {
			extensions: { code: 'BAD_USER_INPUT' },
		});
	}

	await updateDeliveryRecord(orderId, { status: DeliveryStatus.PACKED });
	return finishSellerMutation(orderId, sellerId);
}

export async function markSellerOrderInTransit(
	orderId: string,
	sellerId: string
): Promise<SellerOrderView> {
	const order = await requireSellerOrder(orderId, sellerId);

	if (order.status !== OrderStatus.SHIPPED) {
		throw new GraphQLError(
			`Order must be SHIPPED before marking in transit. Current status: "${order.status}".`,
			{ extensions: { code: 'BAD_USER_INPUT' } }
		);
	}

	if (!order.delivery) {
		throw new GraphQLError('Delivery record is missing for this order.', {
			extensions: { code: 'BAD_USER_INPUT' },
		});
	}

	await updateDeliveryRecord(orderId, { status: DeliveryStatus.IN_TRANSIT });
	return finishSellerMutation(orderId, sellerId);
}

export async function markSellerOrderDelivered(
	orderId: string,
	sellerId: string
): Promise<SellerOrderView> {
	const order = await requireSellerOrder(orderId, sellerId);

	if (!SELLER_DELIVERABLE_STATUSES.includes(order.status)) {
		throw new GraphQLError(
			`Order can only be marked delivered when status is SHIPPED. Current status: "${order.status}".`,
			{ extensions: { code: 'BAD_USER_INPUT' } }
		);
	}

	const beforeStatus = order.status;
	await markOrderDelivered(orderId);
	return finishSellerMutation(orderId, sellerId, beforeStatus);
}

export async function cancelSellerOrder(
	orderId: string,
	sellerId: string,
	reason?: string
): Promise<SellerOrderView> {
	const order = await requireSellerOrder(orderId, sellerId);

	if (!SELLER_CANCELLABLE_STATUSES.includes(order.status)) {
		throw new GraphQLError(
			`Order cannot be cancelled in status "${order.status}". Only PENDING or CONFIRMED orders can be cancelled.`,
			{ extensions: { code: 'BAD_USER_INPUT' } }
		);
	}

	if (reason?.trim()) {
		const note = `[Seller cancelled] ${reason.trim()}`;
		const mergedNotes = order.notes ? `${order.notes}\n${note}` : note;
		await updateOrderNotes(orderId, mergedNotes);
	}

	const beforeStatus = order.status;
	await applyOrderStatusChange(orderId, OrderStatus.CANCELLED);
	return finishSellerMutation(orderId, sellerId, beforeStatus);
}

export async function updateSellerOrderTracking(
	orderId: string,
	sellerId: string,
	trackingCode: string
): Promise<SellerOrderView> {
	const order = await requireSellerOrder(orderId, sellerId);

	if (![OrderStatus.CONFIRMED, OrderStatus.SHIPPED].includes(order.status)) {
		throw new GraphQLError(
			`Tracking can only be updated for CONFIRMED or SHIPPED orders. Current status: "${order.status}".`,
			{ extensions: { code: 'BAD_USER_INPUT' } }
		);
	}

	if (!order.delivery) {
		throw new GraphQLError('Delivery record is missing for this order.', {
			extensions: { code: 'BAD_USER_INPUT' },
		});
	}

	await updateDeliveryRecord(orderId, { trackingCode: trackingCode.trim() });
	return finishSellerMutation(orderId, sellerId);
}

export async function reviewSellerReturnRequest(
	orderId: string,
	sellerId: string,
	approve: boolean,
	resolution?: string
): Promise<SellerOrderView> {
	await requireSellerOrder(orderId, sellerId);
	const returnRequest = await requireSellerReturn(orderId, sellerId);

	if (!RETURN_REVIEW_STATUSES.includes(returnRequest.status)) {
		throw new GraphQLError(
			`Return request cannot be reviewed in status "${returnRequest.status}".`,
			{ extensions: { code: 'BAD_USER_INPUT' } }
		);
	}

	if (!approve && !resolution?.trim()) {
		throw new GraphQLError('Rejection reason is required.', {
			extensions: { code: 'BAD_USER_INPUT' },
		});
	}

	await updateReturnRequestStatus(
		orderId,
		approve ? ReturnRequestStatus.AWAITING_RETURN_SHIPPING : ReturnRequestStatus.REJECTED,
		{
			reviewedById: sellerId,
			reviewedAt: new Date(),
			resolution: resolution?.trim() || (approve ? 'Return approved by seller.' : null),
		}
	);

	return finishSellerMutation(orderId, sellerId);
}

export async function markSellerReturnReceived(
	orderId: string,
	sellerId: string
): Promise<SellerOrderView> {
	await requireSellerOrder(orderId, sellerId);
	const returnRequest = await requireSellerReturn(orderId, sellerId);

	if (!RETURN_RECEIVABLE_STATUSES.includes(returnRequest.status)) {
		throw new GraphQLError(
			`Return items can only be marked received from APPROVED or AWAITING_RETURN_SHIPPING. Current status: "${returnRequest.status}".`,
			{ extensions: { code: 'BAD_USER_INPUT' } }
		);
	}

	await updateReturnRequestStatus(orderId, ReturnRequestStatus.RECEIVED, {
		reviewedById: sellerId,
		reviewedAt: new Date(),
	});

	return finishSellerMutation(orderId, sellerId);
}

export async function processSellerReturnRefund(
	orderId: string,
	sellerId: string
): Promise<SellerOrderView> {
	await requireSellerOrder(orderId, sellerId);
	const returnRequest = await requireSellerReturn(orderId, sellerId);

	if (returnRequest.status !== ReturnRequestStatus.RECEIVED) {
		throw new GraphQLError(
			`Refund can only be processed after return is RECEIVED. Current status: "${returnRequest.status}".`,
			{ extensions: { code: 'BAD_USER_INPUT' } }
		);
	}

	const beforeStatus = (await findOrderByIdAndSeller(orderId, sellerId))!.status;
	await updateReturnRequestStatus(orderId, ReturnRequestStatus.REFUNDED, {
		refundedAt: new Date(),
	});
	await updatePaymentStatus(orderId, PaymentStatus.REFUNDED);
	await applyOrderStatusChange(orderId, OrderStatus.REFUNDED);
	return finishSellerMutation(orderId, sellerId, beforeStatus);
}
