import { GraphQLError } from 'graphql';
import { OrderStatus } from '@prisma/client';

jest.mock('../../repositories/orderRepository.js');
jest.mock('../../repositories/returnRequestRepository.js');
jest.mock('../../repositories/platformRepository.js');
jest.mock('../payoutService.js', () => ({
	blockPayoutsForOrder: jest.fn().mockResolvedValue(undefined),
	restorePayoutsForOrder: jest.fn().mockResolvedValue(undefined),
	refundPayoutsForOrder: jest.fn().mockResolvedValue(undefined),
	createPayoutsForOrder: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../auditLogService.js', () => ({
	log: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../notificationService.js', () => ({
	notifyOrderStatusChange: jest.fn().mockResolvedValue(undefined),
	notifyReturnUpdate: jest.fn().mockResolvedValue(undefined),
}));

import * as orderRepo from '../../repositories/orderRepository.js';
import * as returnRepo from '../../repositories/returnRequestRepository.js';
import * as platformRepo from '../../repositories/platformRepository.js';
import * as payoutService from '../payoutService.js';
import * as orderService from '../orderService.js';

const mockRepo = orderRepo as jest.Mocked<typeof orderRepo>;
const mockReturnRepo = returnRepo as jest.Mocked<typeof returnRepo>;
const mockPlatformRepo = platformRepo as jest.Mocked<typeof platformRepo>;
const mockPayoutService = payoutService as jest.Mocked<typeof payoutService>;

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
	mockPlatformRepo.getPlatformConfig.mockResolvedValue({
		returnWindowDays: 14,
		returnRequiresApproval: true,
	} as never);
	mockPayoutService.blockPayoutsForOrder.mockResolvedValue(undefined);
	mockPayoutService.restorePayoutsForOrder.mockResolvedValue(undefined);
	mockPayoutService.refundPayoutsForOrder.mockResolvedValue(undefined);
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
		const order = makeOrder({
			status: OrderStatus.SHIPPED,
			items: [{ sellerId: 'seller-1', confirmedReceivedAt: null }],
		});
		mockRepo.findOrderByIdAndBuyer.mockResolvedValue(order as never);
		mockRepo.updateOrderStatus.mockResolvedValue({
			...order,
			status: OrderStatus.DELIVERED,
		} as never);
		mockRepo.findOrderByIdAndBuyer.mockResolvedValueOnce(order as never).mockResolvedValueOnce({
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

	it('throws when receipt was already confirmed', async () => {
		const order = makeOrder({
			status: OrderStatus.DELIVERED,
			items: [{ sellerId: 'seller-1', confirmedReceivedAt: new Date() }],
		});
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
	const deliveredOrder = () =>
		makeOrder({
			status: OrderStatus.DELIVERED,
			delivery: {
				status: 'DELIVERED',
				deliveredAt: new Date(),
			},
			items: [{ sellerId: 'seller-1' }],
		});

	it('creates return request for DELIVERED order', async () => {
		const order = deliveredOrder();
		mockRepo.findOrderByIdAndBuyer.mockResolvedValue(order as never);
		mockReturnRepo.findReturnRequestByOrderId.mockResolvedValue(null);

		const createdRequest = {
			id: 'rr-1',
			orderId: ORDER_ID,
			buyerId: BUYER_ID,
			sellerId: 'seller-1',
			status: 'UNDER_REVIEW',
			reason: 'Product arrived with a defect',
			details: 'Zipper broken on arrival',
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
			'Zipper broken on arrival'
		);

		expect(mockReturnRepo.createReturnRequest).toHaveBeenCalledWith({
			orderId: ORDER_ID,
			buyerId: BUYER_ID,
			sellerId: 'seller-1',
			reason: 'Product arrived with a defect',
			details: 'Zipper broken on arrival',
			status: 'UNDER_REVIEW',
		});
		expect(mockPayoutService.blockPayoutsForOrder).toHaveBeenCalledWith(ORDER_ID, 'seller-1');
		expect(result.status).toBe('UNDER_REVIEW');
	});

	it('auto-approves when platform does not require seller review', async () => {
		mockPlatformRepo.getPlatformConfig.mockResolvedValue({
			returnWindowDays: 14,
			returnRequiresApproval: false,
		} as never);

		const order = deliveredOrder();
		mockRepo.findOrderByIdAndBuyer.mockResolvedValue(order as never);
		mockReturnRepo.findReturnRequestByOrderId.mockResolvedValue(null);
		mockReturnRepo.createReturnRequest.mockResolvedValue({
			id: 'rr-1',
			status: 'AWAITING_RETURN_SHIPPING',
		} as never);

		await orderService.requestReturn(ORDER_ID, BUYER_ID, 'Wrong size');

		expect(mockReturnRepo.createReturnRequest).toHaveBeenCalledWith(
			expect.objectContaining({ status: 'AWAITING_RETURN_SHIPPING' })
		);
	});

	it('throws when return window expired', async () => {
		const order = makeOrder({
			status: OrderStatus.DELIVERED,
			delivery: {
				status: 'DELIVERED',
				deliveredAt: new Date('2020-01-01'),
			},
			items: [{ sellerId: 'seller-1' }],
		});
		mockRepo.findOrderByIdAndBuyer.mockResolvedValue(order as never);
		mockReturnRepo.findReturnRequestByOrderId.mockResolvedValue(null);

		await expect(
			orderService.requestReturn(ORDER_ID, BUYER_ID, 'Broken item')
		).rejects.toMatchObject({
			extensions: { code: 'BAD_USER_INPUT' },
		});
	});

	it('throws when order has multiple sellers', async () => {
		const order = makeOrder({
			status: OrderStatus.DELIVERED,
			delivery: { status: 'DELIVERED', deliveredAt: new Date() },
			items: [{ sellerId: 'seller-1' }, { sellerId: 'seller-2' }],
		});
		mockRepo.findOrderByIdAndBuyer.mockResolvedValue(order as never);
		mockReturnRepo.findReturnRequestByOrderId.mockResolvedValue(null);

		await expect(
			orderService.requestReturn(ORDER_ID, BUYER_ID, 'Broken item')
		).rejects.toMatchObject({
			extensions: { code: 'BAD_USER_INPUT' },
		});
	});

	it('throws when order is not delivered', async () => {
		const order = makeOrder({ status: OrderStatus.CONFIRMED, delivery: { status: 'PENDING' } });
		mockRepo.findOrderByIdAndBuyer.mockResolvedValue(order as never);

		await expect(
			orderService.requestReturn(ORDER_ID, BUYER_ID, 'Broken item', 'Broken item')
		).rejects.toThrow(GraphQLError);
	});

	it('throws when a return request already exists', async () => {
		const order = deliveredOrder();
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

// ─── getMySellerOrder / shipSellerOrder ──────────────────────────────────────

const SELLER_ID = 'seller-1';

function makeSellerOrderRecord(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: ORDER_ID,
		buyerId: BUYER_ID,
		status: OrderStatus.CONFIRMED,
		totalAmount: 200,
		discount: null,
		promoCodeId: null,
		notes: null,
		deletedAt: null,
		createdAt: new Date('2026-01-01'),
		updatedAt: new Date('2026-01-01'),
		buyer: {
			id: BUYER_ID,
			email: 'buyer@test.com',
			profile: {
				firstName: 'Jane',
				lastName: 'Doe',
				displayName: null,
			},
		},
		items: [
			{
				id: 'item-1',
				productId: 'p1',
				variantId: null,
				sellerId: SELLER_ID,
				quantity: 2,
				unitPrice: 100,
				totalPrice: 200,
				productTitle: 'Test Product',
			},
		],
		payment: { id: 'pay-1', status: 'PAID', amount: 200 },
		delivery: { id: 'del-1', status: 'PENDING', method: 'COURIER', trackingCode: null },
		returnRequest: null,
		promoCode: null,
		...overrides,
	};
}

describe('getMySellerOrder', () => {
	it('returns seller-scoped order view', async () => {
		mockRepo.findOrderByIdAndSeller.mockResolvedValue(makeSellerOrderRecord() as never);

		const result = await orderService.getMySellerOrder(ORDER_ID, SELLER_ID);

		expect(result.sellerSubtotal).toBe(200);
		expect(result.itemCount).toBe(2);
		expect(result.buyer.name).toBe('Jane Doe');
		expect(result.items).toHaveLength(1);
	});

	it('throws NOT_FOUND when seller has no items on order', async () => {
		mockRepo.findOrderByIdAndSeller.mockResolvedValue(null);

		await expect(orderService.getMySellerOrder(ORDER_ID, SELLER_ID)).rejects.toMatchObject({
			extensions: { code: 'NOT_FOUND' },
		});
	});
});

describe('shipSellerOrder', () => {
	it('ships a CONFIRMED order and sets tracking code', async () => {
		const order = makeSellerOrderRecord({ status: OrderStatus.CONFIRMED });
		const shipped = makeSellerOrderRecord({
			status: OrderStatus.SHIPPED,
			delivery: { id: 'del-1', status: 'SENT', method: 'COURIER', trackingCode: 'TTN123' },
		});

		mockRepo.findOrderByIdAndSeller.mockResolvedValueOnce(order as never);
		mockRepo.updateDeliveryShipment.mockResolvedValue({ ...order, status: OrderStatus.SHIPPED } as never);
		mockRepo.findOrderByIdAndSeller.mockResolvedValueOnce(shipped as never);

		const result = await orderService.shipSellerOrder(ORDER_ID, SELLER_ID, 'TTN123');

		expect(mockRepo.updateDeliveryShipment).toHaveBeenCalledWith(ORDER_ID, 'TTN123');
		expect(result.status).toBe(OrderStatus.SHIPPED);
	});

	it('throws when order is not CONFIRMED', async () => {
		mockRepo.findOrderByIdAndSeller.mockResolvedValue(
			makeSellerOrderRecord({ status: OrderStatus.PENDING }) as never
		);

		await expect(orderService.shipSellerOrder(ORDER_ID, SELLER_ID)).rejects.toMatchObject({
			extensions: { code: 'BAD_USER_INPUT' },
		});
	});
});

describe('confirmSellerOrder', () => {
	it('confirms a PENDING order', async () => {
		const order = makeSellerOrderRecord({ status: OrderStatus.PENDING });
		const confirmed = makeSellerOrderRecord({ status: OrderStatus.CONFIRMED });

		mockRepo.findOrderByIdAndSeller.mockResolvedValueOnce(order as never);
		mockRepo.updateOrderStatus.mockResolvedValue(confirmed as never);
		mockRepo.findOrderById.mockResolvedValue(order as never);
		mockRepo.findOrderByIdAndSeller.mockResolvedValueOnce(confirmed as never);

		const result = await orderService.confirmSellerOrder(ORDER_ID, SELLER_ID);
		expect(result.status).toBe(OrderStatus.CONFIRMED);
	});
});

describe('cancelSellerOrder', () => {
	it('cancels a CONFIRMED order with reason', async () => {
		const order = makeSellerOrderRecord({ status: OrderStatus.CONFIRMED, notes: null });
		const cancelled = makeSellerOrderRecord({ status: OrderStatus.CANCELLED });

		mockRepo.findOrderByIdAndSeller.mockResolvedValueOnce(order as never);
		mockRepo.updateOrderNotes.mockResolvedValue(undefined as never);
		mockRepo.findOrderById.mockResolvedValue(order as never);
		mockRepo.updateOrderStatus.mockResolvedValue(cancelled as never);
		mockRepo.findOrderByIdAndSeller.mockResolvedValueOnce(cancelled as never);

		const result = await orderService.cancelSellerOrder(ORDER_ID, SELLER_ID, 'Out of stock');
		expect(mockRepo.updateOrderNotes).toHaveBeenCalled();
		expect(result.status).toBe(OrderStatus.CANCELLED);
	});
});

describe('markSellerOrderDelivered', () => {
	it('marks a SHIPPED order as delivered', async () => {
		const order = makeSellerOrderRecord({ status: OrderStatus.SHIPPED });
		const delivered = makeSellerOrderRecord({ status: OrderStatus.DELIVERED });

		mockRepo.findOrderByIdAndSeller.mockResolvedValueOnce(order as never);
		mockRepo.markOrderDelivered.mockResolvedValue(delivered as never);
		mockRepo.findOrderByIdAndSeller.mockResolvedValueOnce(delivered as never);

		const result = await orderService.markSellerOrderDelivered(ORDER_ID, SELLER_ID);
		expect(mockRepo.markOrderDelivered).toHaveBeenCalledWith(ORDER_ID);
		expect(result.status).toBe(OrderStatus.DELIVERED);
	});
});
