import { GraphQLError } from 'graphql';

jest.mock('../../repositories/cartRepository.js');
jest.mock('../../repositories/orderRepository.js');
jest.mock('../../repositories/promoCodeRepository.js');
jest.mock('../../repositories/productRepository.js');

import * as cartRepo from '../../repositories/cartRepository.js';
import * as orderRepo from '../../repositories/orderRepository.js';
import * as promoRepo from '../../repositories/promoCodeRepository.js';
import * as productRepo from '../../repositories/productRepository.js';
import * as checkoutService from '../checkoutService.js';
import { DeliveryMethod, PaymentMethod } from '../../constants/enums.js';

const mockCartRepo = cartRepo as jest.Mocked<typeof cartRepo>;
const mockOrderRepo = orderRepo as jest.Mocked<typeof orderRepo>;
const mockPromoRepo = promoRepo as jest.Mocked<typeof promoRepo>;
const mockProductRepo = productRepo as jest.Mocked<typeof productRepo>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makePromo(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: 'promo-1',
		code: 'SAVE10',
		discountPercent: 10,
		discountFixed: null,
		minOrderAmount: null,
		maxUses: null,
		usedCount: 0,
		expiresAt: null,
		isActive: true,
		createdAt: new Date(),
		...overrides,
	} as unknown as (typeof promoRepo)['findPromoByCode'] extends (
		...args: unknown[]
	) => Promise<infer R>
		? NonNullable<R>
		: never;
}

function makeCartItem(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: 'ci-1',
		userId: 'u-1',
		productId: 'p-1',
		variantId: null,
		quantity: 2,
		createdAt: new Date(),
		updatedAt: new Date(),
		product: {
			id: 'p-1',
			sellerId: 's-1',
			slug: 'jacket',
			sku: 'JKT-001',
			brand: 'Heritage',
			basePrice: 100,
			comparePrice: null,
			status: 'APPROVED',
			isAvailable: true,
			deletedAt: null,
			createdAt: new Date(),
			updatedAt: new Date(),
			translations: [{ language: 'EN', title: 'Jacket', description: 'Desc' }],
			media: [],
			variants: [],
			seller: { id: 's-1', profile: { firstName: 'John', lastName: 'Doe' } },
		},
		variant: null,
		...overrides,
	} as unknown as cartRepo.CartItemRecord;
}

function makeOrder() {
	return {
		id: 'order-1',
		buyerId: 'u-1',
		status: 'PENDING',
		totalAmount: 200,
		discount: null,
		promoCodeId: null,
		notes: null,
		deletedAt: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		items: [
			{
				id: 'oi-1',
				orderId: 'order-1',
				productId: 'p-1',
				variantId: null,
				sellerId: 's-1',
				quantity: 2,
				unitPrice: 100,
				totalPrice: 200,
				productTitle: 'Jacket',
				status: 'PENDING',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		],
		payment: {
			id: 'pay-1',
			orderId: 'order-1',
			status: 'PENDING',
			amount: 200,
			method: 'CARD',
			createdAt: new Date(),
			updatedAt: new Date(),
		},
		delivery: {
			id: 'del-1',
			orderId: 'order-1',
			status: 'PENDING',
			method: 'COURIER',
			address: null,
			trackingCode: null,
			shippedAt: null,
			deliveredAt: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		},
		promoCode: null,
	} as unknown as orderRepo.OrderRecord;
}

beforeEach(() => {
	jest.clearAllMocks();
});

// ─── validatePromoCode ────────────────────────────────────────────────────────

describe('checkoutService.validatePromoCode', () => {
	it('throws INVALID_PROMO if promo not found', async () => {
		mockPromoRepo.findPromoByCode.mockResolvedValue(null);
		await expect(checkoutService.validatePromoCode('FAKE', 100)).rejects.toThrow(GraphQLError);
	});

	it('throws INVALID_PROMO if promo inactive', async () => {
		mockPromoRepo.findPromoByCode.mockResolvedValue(makePromo({ isActive: false }));
		await expect(checkoutService.validatePromoCode('SAVE10', 100)).rejects.toThrow(GraphQLError);
	});

	it('throws PROMO_EXPIRED if past expiry', async () => {
		mockPromoRepo.findPromoByCode.mockResolvedValue(
			makePromo({ expiresAt: new Date(Date.now() - 1000) })
		);
		await expect(checkoutService.validatePromoCode('SAVE10', 100)).rejects.toThrow(GraphQLError);
	});

	it('throws PROMO_LIMIT_REACHED if usage limit exceeded', async () => {
		mockPromoRepo.findPromoByCode.mockResolvedValue(makePromo({ maxUses: 5, usedCount: 5 }));
		await expect(checkoutService.validatePromoCode('SAVE10', 100)).rejects.toThrow(GraphQLError);
	});

	it('throws PROMO_MIN_AMOUNT if subtotal below minimum', async () => {
		mockPromoRepo.findPromoByCode.mockResolvedValue(makePromo({ minOrderAmount: 200 }));
		await expect(checkoutService.validatePromoCode('SAVE10', 50)).rejects.toThrow(GraphQLError);
	});

	it('computes percent discount correctly', async () => {
		mockPromoRepo.findPromoByCode.mockResolvedValue(makePromo({ discountPercent: 20 }));
		const result = await checkoutService.validatePromoCode('SAVE10', 100);
		expect(result.discount).toBe(20); // 20% of 100
		expect(result.promoCodeId).toBe('promo-1');
	});

	it('computes fixed discount correctly, capped at subtotal', async () => {
		mockPromoRepo.findPromoByCode.mockResolvedValue(
			makePromo({ discountPercent: null, discountFixed: 300 })
		);
		const result = await checkoutService.validatePromoCode('SAVE10', 100);
		expect(result.discount).toBe(100); // capped at subtotal
	});
});

// ─── createOrder ─────────────────────────────────────────────────────────────

describe('checkoutService.createOrder', () => {
	it('throws EMPTY_CART if cart is empty', async () => {
		mockCartRepo.findCartByUser.mockResolvedValue([]);
		await expect(
			checkoutService.createOrder(
				'u-1',
				PaymentMethod.CARD,
				DeliveryMethod.COURIER,
				undefined,
				undefined,
				undefined
			)
		).rejects.toThrow(GraphQLError);
	});

	it('throws PRODUCT_UNAVAILABLE if product not available', async () => {
		mockCartRepo.findCartByUser.mockResolvedValue([
			makeCartItem({ product: { ...makeCartItem().product, isAvailable: false } }),
		]);
		await expect(
			checkoutService.createOrder(
				'u-1',
				PaymentMethod.CARD,
				DeliveryMethod.COURIER,
				undefined,
				undefined,
				undefined
			)
		).rejects.toThrow(GraphQLError);
	});

	it('throws OUT_OF_STOCK if variant stock insufficient', async () => {
		const variantItem = makeCartItem({ variantId: 'v-1', quantity: 5 });
		mockCartRepo.findCartByUser.mockResolvedValue([variantItem]);
		mockProductRepo.findVariantById.mockResolvedValue({
			id: 'v-1',
			productId: 'p-1',
			stock: 2,
			price: null,
			sku: null,
		});
		await expect(
			checkoutService.createOrder(
				'u-1',
				PaymentMethod.CARD,
				DeliveryMethod.COURIER,
				undefined,
				undefined,
				undefined
			)
		).rejects.toThrow(GraphQLError);
	});

	it('creates order atomically — Order + items + PaymentRecord + DeliveryRecord', async () => {
		mockCartRepo.findCartByUser.mockResolvedValue([makeCartItem()]);
		mockOrderRepo.createOrder.mockResolvedValue(makeOrder());
		mockCartRepo.clearCart.mockResolvedValue(undefined);

		const result = await checkoutService.createOrder(
			'u-1',
			PaymentMethod.CARD,
			DeliveryMethod.COURIER,
			'123 Main St',
			undefined,
			'Leave at door'
		);

		expect(mockOrderRepo.createOrder).toHaveBeenCalledTimes(1);
		const orderInput = mockOrderRepo.createOrder.mock.calls[0][0];
		expect(orderInput.buyerId).toBe('u-1');
		expect(orderInput.paymentMethod).toBe(PaymentMethod.CARD);
		expect(orderInput.deliveryMethod).toBe(DeliveryMethod.COURIER);
		expect(orderInput.items).toHaveLength(1);

		expect(mockCartRepo.clearCart).toHaveBeenCalledWith('u-1');
		expect(result.id).toBe('order-1');
	});

	it('applies promo code discount and increments usage', async () => {
		mockCartRepo.findCartByUser.mockResolvedValue([makeCartItem()]); // subtotal = 200
		mockPromoRepo.findPromoByCode.mockResolvedValue(makePromo({ discountPercent: 10 }));
		mockPromoRepo.incrementPromoUsage.mockResolvedValue(undefined);
		const orderWithDiscount = {
			...makeOrder(),
			totalAmount: 180,
			discount: 20,
			promoCodeId: 'promo-1',
		} as unknown as orderRepo.OrderRecord;
		mockOrderRepo.createOrder.mockResolvedValue(orderWithDiscount);
		mockCartRepo.clearCart.mockResolvedValue(undefined);

		const result = await checkoutService.createOrder(
			'u-1',
			PaymentMethod.CARD,
			DeliveryMethod.COURIER,
			undefined,
			'SAVE10',
			undefined
		);

		const orderInput = mockOrderRepo.createOrder.mock.calls[0][0];
		expect(orderInput.discount).toBeCloseTo(20);
		expect(orderInput.totalAmount).toBeCloseTo(180);
		expect(mockPromoRepo.incrementPromoUsage).toHaveBeenCalledWith('promo-1');
		expect(result.discount).toBe(20);
	});
});
