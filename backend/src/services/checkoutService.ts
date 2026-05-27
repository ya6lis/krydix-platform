import { GraphQLError } from 'graphql';
import { DeliveryMethod, PaymentMethod } from '../constants/enums.js';
import * as cartRepo from '../repositories/cartRepository.js';
import * as orderRepo from '../repositories/orderRepository.js';
import * as promoRepo from '../repositories/promoCodeRepository.js';
import * as productRepo from '../repositories/productRepository.js';
import * as notificationService from './notificationService.js';
import * as feeCalculationService from './feeCalculationService.js';
import * as auditLog from './auditLogService.js';
import { Language } from '../constants/enums.js';
import { DEFAULT_ORDER_CURRENCY } from '../constants/monetization.js';

export interface PromoResult {
	promoCodeId: string;
	discount: number;
}

export interface OrderOut {
	id: string;
	status: string;
	totalAmount: number;
	discount: number | null;
	notes: string | null;
	items: Array<{
		id: string;
		productId: string;
		variantId: string | null;
		quantity: number;
		unitPrice: number;
		totalPrice: number;
		productTitle: string;
	}>;
	payment: {
		id: string;
		status: string;
		amount: number;
		method: string | null;
	} | null;
	delivery: {
		id: string;
		status: string;
		method: string;
		address: string | null;
		trackingCode: string | null;
	} | null;
	createdAt: string;
}

export async function validatePromoCode(code: string, subtotal: number): Promise<PromoResult> {
	const promo = await promoRepo.findPromoByCode(code);
	if (!promo || !promo.isActive) {
		throw new GraphQLError('Invalid promo code', { extensions: { code: 'INVALID_PROMO' } });
	}
	if (promo.expiresAt && promo.expiresAt < new Date()) {
		throw new GraphQLError('Promo code expired', { extensions: { code: 'PROMO_EXPIRED' } });
	}
	if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
		throw new GraphQLError('Promo code usage limit reached', {
			extensions: { code: 'PROMO_LIMIT_REACHED' },
		});
	}
	if (promo.minOrderAmount !== null && subtotal < Number(promo.minOrderAmount)) {
		throw new GraphQLError(
			`Minimum order amount for this promo is ${Number(promo.minOrderAmount)}`,
			{ extensions: { code: 'PROMO_MIN_AMOUNT' } }
		);
	}

	let discount = 0;
	if (promo.discountPercent !== null) {
		discount = (subtotal * Number(promo.discountPercent)) / 100;
	} else if (promo.discountFixed !== null) {
		discount = Math.min(Number(promo.discountFixed), subtotal);
	}

	return { promoCodeId: promo.id, discount };
}

function mapOrder(order: orderRepo.OrderRecord): OrderOut {
	return {
		id: order.id,
		status: order.status,
		totalAmount: Number(order.totalAmount),
		discount: order.discount !== null ? Number(order.discount) : null,
		notes: order.notes ?? null,
		items: order.items.map((i) => ({
			id: i.id,
			productId: i.productId,
			variantId: i.variantId ?? null,
			quantity: i.quantity,
			unitPrice: Number(i.unitPrice),
			totalPrice: Number(i.totalPrice),
			productTitle: i.productTitle,
		})),
		payment: order.payment
			? {
					id: order.payment.id,
					status: order.payment.status,
					amount: Number(order.payment.amount),
					method: order.payment.method ?? null,
				}
			: null,
		delivery: order.delivery
			? {
					id: order.delivery.id,
					status: order.delivery.status,
					method: order.delivery.method,
					address: order.delivery.address ?? null,
					trackingCode: order.delivery.trackingCode ?? null,
				}
			: null,
		createdAt: order.createdAt.toISOString(),
	};
}

export interface CartItemInput {
	productId: string;
	variantId?: string | null;
	quantity: number;
}

interface PreparedOrderItem {
	productId: string;
	variantId?: string;
	sellerId: string;
	quantity: number;
	unitPrice: number;
	productTitle: string;
	categoryIds: string[];
}

async function prepareOrderItems(
	userId: string,
	clientItems?: CartItemInput[]
): Promise<{ items: PreparedOrderItem[]; subtotal: number }> {
	const orderItems: PreparedOrderItem[] = [];
	let subtotal = 0;

	if (clientItems && clientItems.length > 0) {
		for (const item of clientItems) {
			const product = await productRepo.findProductById(item.productId);
			if (!product || !product.isAvailable) {
				throw new GraphQLError(`Product is no longer available`, {
					extensions: { code: 'PRODUCT_UNAVAILABLE' },
				});
			}

			let unitPrice = Number(product.basePrice);

			if (item.variantId) {
				const variant = await productRepo.findVariantById(item.variantId);
				if (!variant || variant.stock < item.quantity) {
					throw new GraphQLError(`Insufficient stock for product variant`, {
						extensions: { code: 'OUT_OF_STOCK' },
					});
				}
				if (variant.price !== null) unitPrice = Number(variant.price);
			}

			const translation =
				product.translations.find((t) => t.language === Language.EN) ?? product.translations[0];

			subtotal += unitPrice * item.quantity;

			orderItems.push({
				productId: item.productId,
				variantId: item.variantId ?? undefined,
				sellerId: product.sellerId,
				quantity: item.quantity,
				unitPrice,
				productTitle: translation?.title ?? '',
				categoryIds: product.categories.map((c) => c.categoryId),
			});
		}
	} else {
		const cartItems = await cartRepo.findCartByUser(userId);
		if (cartItems.length === 0) {
			throw new GraphQLError('Cart is empty', { extensions: { code: 'EMPTY_CART' } });
		}

		for (const item of cartItems) {
			if (!item.product.isAvailable) {
				throw new GraphQLError(
					`Product "${item.product.translations[0]?.title}" is no longer available`,
					{ extensions: { code: 'PRODUCT_UNAVAILABLE' } }
				);
			}

			if (item.variantId) {
				const variant = await productRepo.findVariantById(item.variantId);
				if (!variant || variant.stock < item.quantity) {
					throw new GraphQLError(
						`Insufficient stock for variant in "${item.product.translations[0]?.title}"`,
						{ extensions: { code: 'OUT_OF_STOCK' } }
					);
				}
			}

			const translation =
				item.product.translations.find((t) => t.language === Language.EN) ??
				item.product.translations[0];

			const unitPrice = item.variant?.price
				? Number(item.variant.price)
				: Number(item.product.basePrice);

			subtotal += unitPrice * item.quantity;

			orderItems.push({
				productId: item.productId,
				variantId: item.variantId ?? undefined,
				sellerId: item.product.sellerId,
				quantity: item.quantity,
				unitPrice,
				productTitle: translation?.title ?? '',
				categoryIds: item.product.categories?.map((c) => c.categoryId) ?? [],
			});
		}
	}

	return { items: orderItems, subtotal };
}

export async function createOrder(
	userId: string,
	paymentMethod: PaymentMethod,
	deliveryMethod: DeliveryMethod,
	deliveryAddress: string | undefined,
	promoCode: string | undefined,
	notes: string | undefined,
	clientItems?: CartItemInput[]
): Promise<OrderOut> {
	const { items: preparedItems, subtotal } = await prepareOrderItems(userId, clientItems);

	const feeSnapshots = await feeCalculationService.buildFeeSnapshots(
		preparedItems.map((item) => ({
			productId: item.productId,
			categoryIds: item.categoryIds,
			lineTotal: item.unitPrice * item.quantity,
		}))
	);

	const orderItems: orderRepo.CreateOrderInput['items'] = preparedItems.map((item, index) => ({
		productId: item.productId,
		variantId: item.variantId,
		sellerId: item.sellerId,
		quantity: item.quantity,
		unitPrice: item.unitPrice,
		productTitle: item.productTitle,
		feeSnapshot: feeSnapshots[index],
	}));

	const currency = feeSnapshots[0]?.currency ?? DEFAULT_ORDER_CURRENCY;

	// Validate promo
	let promoResult: PromoResult | undefined;
	if (promoCode) {
		promoResult = await validatePromoCode(promoCode, subtotal);
	}

	const discount = promoResult?.discount ?? 0;
	const totalAmount = Math.max(0, subtotal - discount);

	// Create order atomically
	const order = await orderRepo.createOrder({
		buyerId: userId,
		totalAmount,
		currency,
		discount: discount > 0 ? discount : undefined,
		promoCodeId: promoResult?.promoCodeId,
		notes,
		paymentMethod,
		deliveryMethod,
		deliveryAddress,
		items: orderItems,
	});

	if (paymentMethod !== PaymentMethod.CASH_ON_DELIVERY) {
		await orderRepo.capturePaymentInEscrow(order.id);
		await auditLog.log({
			actorId: userId,
			action: 'PAYMENT_CAPTURED',
			targetType: 'Order',
			targetId: order.id,
			metadata: { amount: totalAmount, currency, method: paymentMethod },
		});
	}

	const refreshed = await orderRepo.findOrderById(order.id);

	// Increment promo usage outside transaction (best-effort)
	if (promoResult) {
		await promoRepo.incrementPromoUsage(promoResult.promoCodeId);
	}

	// Clear cart
	await cartRepo.clearCart(userId);

	void notificationService.notifyNewOrder(refreshed ?? order).catch(() => undefined);

	return mapOrder(refreshed ?? order);
}
