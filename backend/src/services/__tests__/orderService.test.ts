import { GraphQLError } from 'graphql';
import { OrderStatus, PaymentStatus } from '@prisma/client';

jest.mock('../../repositories/orderRepository.js');

import * as orderRepo from '../../repositories/orderRepository.js';
import * as orderService from '../orderService.js';

const mockRepo = orderRepo as jest.Mocked<typeof orderRepo>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeOrder(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: 'order-1',
		buyerId: 'buyer-1',
		status: OrderStatus.PENDING,
		totalAmount: 200,
		discount: null,
		promoCodeId: null,
		notes: null,
		deletedAt: null,
		createdAt: new Date('2026-01-01'),
		updatedAt: new Date('2026-01-01'),
		items: [],
		payment: null,
		delivery: null,
		promoCode: null,
		...overrides,
	};
}

const BUYER_ID = 'buyer-1';
const ORDER_ID = 'order-1';

beforeEach(() => {
	jest.clearAllMocks();
});

// ─── cancelOrder ─────────────────────────────────────────────────────────────

describe('cancelOrder', () => {
	it('cancels a PENDING order', async () => {
		const order = makeOrder({ status: OrderStatus.PENDING });
		mockRepo.findOrderByIdAndBuyer.mockResolvedValue(order as never);
		mockRepo.updateOrderStatus.mockResolvedValue({
			...order,
			status: OrderStatus.CANCELLED,
		} as never);

		const result = await orderService.cancelOrder(ORDER_ID, BUYER_ID);

		expect(mockRepo.updateOrderStatus).toHaveBeenCalledWith(ORDER_ID, OrderStatus.CANCELLED);
		expect(result.status).toBe(OrderStatus.CANCELLED);
	});

	it('cancels a CONFIRMED order', async () => {
		const order = makeOrder({ status: OrderStatus.CONFIRMED });
		mockRepo.findOrderByIdAndBuyer.mockResolvedValue(order as never);
		mockRepo.updateOrderStatus.mockResolvedValue({
			...order,
			status: OrderStatus.CANCELLED,
		} as never);

		await orderService.cancelOrder(ORDER_ID, BUYER_ID);

		expect(mockRepo.updateOrderStatus).toHaveBeenCalledWith(ORDER_ID, OrderStatus.CANCELLED);
	});

	it('throws when order not found', async () => {
		mockRepo.findOrderByIdAndBuyer.mockResolvedValue(null);

		await expect(orderService.cancelOrder(ORDER_ID, BUYER_ID)).rejects.toThrow(GraphQLError);
		await expect(orderService.cancelOrder(ORDER_ID, BUYER_ID)).rejects.toMatchObject({
			extensions: { code: 'NOT_FOUND' },
		});
	});

	it('throws when order is SHIPPED (cannot cancel)', async () => {
		const order = makeOrder({ status: OrderStatus.SHIPPED });
		mockRepo.findOrderByIdAndBuyer.mockResolvedValue(order as never);

		await expect(orderService.cancelOrder(ORDER_ID, BUYER_ID)).rejects.toThrow(GraphQLError);
		await expect(orderService.cancelOrder(ORDER_ID, BUYER_ID)).rejects.toMatchObject({
			extensions: { code: 'BAD_USER_INPUT' },
		});
	});

	it('throws when order is DELIVERED (cannot cancel)', async () => {
		const order = makeOrder({ status: OrderStatus.DELIVERED });
		mockRepo.findOrderByIdAndBuyer.mockResolvedValue(order as never);

		await expect(orderService.cancelOrder(ORDER_ID, BUYER_ID)).rejects.toThrow(GraphQLError);
	});
});

// ─── confirmDelivery ──────────────────────────────────────────────────────────

describe('confirmDelivery', () => {
	it('confirms delivery when order is SHIPPED', async () => {
		const order = makeOrder({ status: OrderStatus.SHIPPED });
		mockRepo.findOrderByIdAndBuyer.mockResolvedValue(order as never);
		mockRepo.updateOrderStatus.mockResolvedValue({
			...order,
			status: OrderStatus.DELIVERED,
		} as never);

		const result = await orderService.confirmDelivery(ORDER_ID, BUYER_ID);

		expect(mockRepo.updateOrderStatus).toHaveBeenCalledWith(ORDER_ID, OrderStatus.DELIVERED);
		expect(result.status).toBe(OrderStatus.DELIVERED);
	});

	it('throws when order not found', async () => {
		mockRepo.findOrderByIdAndBuyer.mockResolvedValue(null);

		await expect(orderService.confirmDelivery(ORDER_ID, BUYER_ID)).rejects.toThrow(GraphQLError);
		await expect(orderService.confirmDelivery(ORDER_ID, BUYER_ID)).rejects.toMatchObject({
			extensions: { code: 'NOT_FOUND' },
		});
	});

	it('throws when order is PENDING (not yet shipped)', async () => {
		const order = makeOrder({ status: OrderStatus.PENDING });
		mockRepo.findOrderByIdAndBuyer.mockResolvedValue(order as never);

		await expect(orderService.confirmDelivery(ORDER_ID, BUYER_ID)).rejects.toThrow(GraphQLError);
		await expect(orderService.confirmDelivery(ORDER_ID, BUYER_ID)).rejects.toMatchObject({
			extensions: { code: 'BAD_USER_INPUT' },
		});
	});

	it('throws when order is already DELIVERED', async () => {
		const order = makeOrder({ status: OrderStatus.DELIVERED });
		mockRepo.findOrderByIdAndBuyer.mockResolvedValue(order as never);

		await expect(orderService.confirmDelivery(ORDER_ID, BUYER_ID)).rejects.toThrow(GraphQLError);
	});
});

// ─── requestRefund ────────────────────────────────────────────────────────────

describe('requestRefund', () => {
	it('creates refund for DELIVERED order', async () => {
		const order = makeOrder({ status: OrderStatus.DELIVERED });
		mockRepo.findOrderByIdAndBuyer.mockResolvedValue(order as never);
		mockRepo.updatePaymentStatus.mockResolvedValue(undefined);
		mockRepo.updateOrderStatus.mockResolvedValue({
			...order,
			status: OrderStatus.REFUNDED,
		} as never);

		const result = await orderService.requestRefund(ORDER_ID, BUYER_ID);

		expect(mockRepo.updatePaymentStatus).toHaveBeenCalledWith(ORDER_ID, PaymentStatus.REFUNDED);
		expect(mockRepo.updateOrderStatus).toHaveBeenCalledWith(ORDER_ID, OrderStatus.REFUNDED);
		expect(result.status).toBe(OrderStatus.REFUNDED);
	});

	it('creates refund for CONFIRMED order', async () => {
		const order = makeOrder({ status: OrderStatus.CONFIRMED });
		mockRepo.findOrderByIdAndBuyer.mockResolvedValue(order as never);
		mockRepo.updatePaymentStatus.mockResolvedValue(undefined);
		mockRepo.updateOrderStatus.mockResolvedValue({
			...order,
			status: OrderStatus.REFUNDED,
		} as never);

		await orderService.requestRefund(ORDER_ID, BUYER_ID);

		expect(mockRepo.updatePaymentStatus).toHaveBeenCalled();
		expect(mockRepo.updateOrderStatus).toHaveBeenCalledWith(ORDER_ID, OrderStatus.REFUNDED);
	});

	it('throws when order not found', async () => {
		mockRepo.findOrderByIdAndBuyer.mockResolvedValue(null);

		await expect(orderService.requestRefund(ORDER_ID, BUYER_ID)).rejects.toThrow(GraphQLError);
		await expect(orderService.requestRefund(ORDER_ID, BUYER_ID)).rejects.toMatchObject({
			extensions: { code: 'NOT_FOUND' },
		});
	});

	it('throws when order is PENDING (not refundable)', async () => {
		const order = makeOrder({ status: OrderStatus.PENDING });
		mockRepo.findOrderByIdAndBuyer.mockResolvedValue(order as never);

		await expect(orderService.requestRefund(ORDER_ID, BUYER_ID)).rejects.toThrow(GraphQLError);
		await expect(orderService.requestRefund(ORDER_ID, BUYER_ID)).rejects.toMatchObject({
			extensions: { code: 'BAD_USER_INPUT' },
		});
	});

	it('throws when order is CANCELLED (not refundable)', async () => {
		const order = makeOrder({ status: OrderStatus.CANCELLED });
		mockRepo.findOrderByIdAndBuyer.mockResolvedValue(order as never);

		await expect(orderService.requestRefund(ORDER_ID, BUYER_ID)).rejects.toThrow(GraphQLError);
	});
});

// ─── getMyOrders ──────────────────────────────────────────────────────────────

describe('getMyOrders', () => {
	it('delegates to findOrdersByBuyer with filter and pagination', async () => {
		const paginatedResult = {
			items: [makeOrder()],
			total: 1,
			page: 1,
			pageSize: 10,
		};
		mockRepo.findOrdersByBuyer.mockResolvedValue(paginatedResult as never);

		const result = await orderService.getMyOrders(
			BUYER_ID,
			{ status: OrderStatus.PENDING },
			{ page: 1, pageSize: 10 }
		);

		expect(mockRepo.findOrdersByBuyer).toHaveBeenCalledWith(
			BUYER_ID,
			{ status: OrderStatus.PENDING },
			{ page: 1, pageSize: 10 }
		);
		expect(result.total).toBe(1);
	});
});

// ─── getMyOrder ───────────────────────────────────────────────────────────────

describe('getMyOrder', () => {
	it('returns order when found', async () => {
		const order = makeOrder();
		mockRepo.findOrderByIdAndBuyer.mockResolvedValue(order as never);

		const result = await orderService.getMyOrder(ORDER_ID, BUYER_ID);
		expect(result.id).toBe(ORDER_ID);
	});

	it('throws NOT_FOUND when order does not belong to buyer', async () => {
		mockRepo.findOrderByIdAndBuyer.mockResolvedValue(null);

		await expect(orderService.getMyOrder(ORDER_ID, BUYER_ID)).rejects.toThrow(GraphQLError);
		await expect(orderService.getMyOrder(ORDER_ID, BUYER_ID)).rejects.toMatchObject({
			extensions: { code: 'NOT_FOUND' },
		});
	});
});
