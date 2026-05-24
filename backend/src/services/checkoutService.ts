import { GraphQLError } from 'graphql';
import { DeliveryMethod, PaymentMethod } from '../constants/enums.js';
import * as cartRepo from '../repositories/cartRepository.js';
import * as orderRepo from '../repositories/orderRepository.js';
import * as promoRepo from '../repositories/promoCodeRepository.js';
import * as productRepo from '../repositories/productRepository.js';
import { Language } from '../constants/enums.js';

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

export async function createOrder(
	userId: string,
	paymentMethod: PaymentMethod,
	deliveryMethod: DeliveryMethod,
	deliveryAddress: string | undefined,
	promoCode: string | undefined,
	notes: string | undefined
): Promise<OrderOut> {
	// Load cart
	const cartItems = await cartRepo.findCartByUser(userId);
	if (cartItems.length === 0) {
		throw new GraphQLError('Cart is empty', { extensions: { code: 'EMPTY_CART' } });
	}

	// Validate stock and build order items
	const orderItems: orderRepo.CreateOrderInput['items'] = [];
	let subtotal = 0;

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
		});
	}

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
		discount: discount > 0 ? discount : undefined,
		promoCodeId: promoResult?.promoCodeId,
		notes,
		paymentMethod,
		deliveryMethod,
		deliveryAddress,
		items: orderItems,
	});

	// Increment promo usage outside transaction (best-effort)
	if (promoResult) {
		await promoRepo.incrementPromoUsage(promoResult.promoCodeId);
	}

	// Clear cart
	await cartRepo.clearCart(userId);

	return mapOrder(order);
}
