import { GraphQLError } from 'graphql';
import { OrderStatus } from '@prisma/client';

jest.mock('../../repositories/orderRepository.js');
jest.mock('../../repositories/returnRequestRepository.js');

import * as orderRepo from '../../repositories/orderRepository.js';
import * as returnRepo from '../../repositories/returnRequestRepository.js';
import * as orderService from '../orderService.js';

const mockRepo = orderRepo as jest.Mocked<typeof orderRepo>;
const mockReturnRepo = returnRepo as jest.Mocked<typeof returnRepo>;

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
		returnRequest: null,
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
	it('throws for DELIVERED order (must use requestReturn instead)', async () => {
		const order = makeOrder({ status: OrderStatus.DELIVERED });
		mockRepo.findOrderByIdAndBuyer.mockResolvedValue(order as never);

		await expect(orderService.requestRefund(ORDER_ID, BUYER_ID)).rejects.toThrow(GraphQLError);
		expect(mockRepo.updatePaymentStatus).not.toHaveBeenCalled();
		expect(mockRepo.updateOrderStatus).not.toHaveBeenCalled();
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

// ─── requestReturn ───────────────────────────────────────────────────────────

describe('requestReturn', () => {
	it('creates return request for DELIVERED order', async () => {
		const order = makeOrder({
			status: OrderStatus.DELIVERED,
			delivery: { status: 'DELIVERED' },
			items: [{ sellerId: 'seller-1' }],
		});
		mockRepo.findOrderByIdAndBuyer.mockResolvedValue(order as never);
		mockReturnRepo.findReturnRequestByOrderId.mockResolvedValue(null);

		const createdRequest = {
			id: 'rr-1',
			orderId: ORDER_ID,
			buyerId: BUYER_ID,
			sellerId: 'seller-1',
			status: 'REQUESTED',
			reason: 'Product arrived with a defect',
			details: 'Product arrived with a defect',
			resolution: null,
			reviewedById: null,
			reviewedAt: null,
			refundedAt: null,
			closedAt: null,
			createdAt: new Date('2026-01-02'),
			updatedAt: new Date('2026-01-02'),
		};
		mockReturnRepo.createReturnRequest.mockResolvedValue(createdRequest as never);

		const result = await orderService.requestReturn(
			ORDER_ID,
			BUYER_ID,
			'Product arrived with a defect',
			'Product arrived with a defect'
		);

		expect(mockReturnRepo.createReturnRequest).toHaveBeenCalledWith({
			orderId: ORDER_ID,
			buyerId: BUYER_ID,
			sellerId: 'seller-1',
			reason: 'Product arrived with a defect',
			details: 'Product arrived with a defect',
		});
		expect(result.status).toBe('REQUESTED');
	});

	it('throws when order is not delivered', async () => {
		const order = makeOrder({ status: OrderStatus.CONFIRMED, delivery: { status: 'PENDING' } });
		mockRepo.findOrderByIdAndBuyer.mockResolvedValue(order as never);

		await expect(
			orderService.requestReturn(ORDER_ID, BUYER_ID, 'Broken item', 'Broken item')
		).rejects.toThrow(GraphQLError);
	});

	it('throws when a return request already exists', async () => {
		const order = makeOrder({
			status: OrderStatus.DELIVERED,
			delivery: { status: 'DELIVERED' },
			items: [{ sellerId: 'seller-1' }],
		});
		mockRepo.findOrderByIdAndBuyer.mockResolvedValue(order as never);
		mockReturnRepo.findReturnRequestByOrderId.mockResolvedValue({ id: 'rr-1' } as never);

		await expect(
			orderService.requestReturn(ORDER_ID, BUYER_ID, 'Broken item', 'Broken item')
		).rejects.toThrow(GraphQLError);
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
