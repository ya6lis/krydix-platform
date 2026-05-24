import { GraphQLError } from 'graphql';
import * as cartRepo from '../repositories/cartRepository.js';
import * as productRepo from '../repositories/productRepository.js';
import { Language } from '../constants/enums.js';

export interface CartItemOut {
	id: string;
	productId: string;
	variantId: string | null;
	sellerId: string;
	sellerName: string;
	quantity: number;
	unitPrice: number;
	totalPrice: number;
	productTitle: string;
	productImage: string | null;
	variantOptions: Record<string, unknown> | null;
	stock: number;
}

export interface CartOut {
	items: CartItemOut[];
	subtotal: number;
}

function mapItem(item: cartRepo.CartItemRecord, language: Language): CartItemOut {
	const translation =
		item.product.translations.find((t) => t.language === language) ?? item.product.translations[0];

	const mainImage = item.product.media[0]?.url ?? null;
	const variant = item.variant;

	// price: variant price takes precedence over product base price
	const unitPrice = variant?.price ? Number(variant.price) : Number(item.product.basePrice);

	const stock = variant ? variant.stock : item.product.variants.reduce((s, v) => s + v.stock, 0);
	const profile = item.product.seller.profile;
	const sellerName = profile
		? `${profile.firstName} ${profile.lastName}`.trim()
		: item.product.sellerId;

	return {
		id: item.id,
		productId: item.productId,
		variantId: item.variantId ?? null,
		sellerId: item.product.sellerId,
		sellerName,
		quantity: item.quantity,
		unitPrice,
		totalPrice: unitPrice * item.quantity,
		productTitle: translation?.title ?? item.product.translations[0]?.title ?? '',
		productImage: mainImage,
		variantOptions: variant ? (variant.options as Record<string, unknown>) : null,
		stock,
	};
}

export async function getCart(userId: string, language: Language): Promise<CartOut> {
	const items = await cartRepo.findCartByUser(userId);
	const mapped = items.map((i) => mapItem(i, language));
	const subtotal = mapped.reduce((s, i) => s + i.totalPrice, 0);
	return { items: mapped, subtotal };
}

export async function addToCart(
	userId: string,
	productId: string,
	variantId: string | undefined,
	quantity: number
): Promise<CartOut> {
	const product = await productRepo.findProductById(productId);
	if (!product || !product.isAvailable) {
		throw new GraphQLError('Product not found or unavailable', {
			extensions: { code: 'NOT_FOUND' },
		});
	}

	if (variantId) {
		const variant = await productRepo.findVariantById(variantId);
		if (!variant || variant.productId !== productId) {
			throw new GraphQLError('Variant not found', { extensions: { code: 'NOT_FOUND' } });
		}
		if (variant.stock < quantity) {
			throw new GraphQLError('Insufficient stock', { extensions: { code: 'OUT_OF_STOCK' } });
		}
	}

	const existing = await cartRepo.findCartItem(userId, productId, variantId ?? null);
	const newQty = (existing?.quantity ?? 0) + quantity;

	await cartRepo.upsertCartItem(userId, productId, variantId ?? null, newQty);
	return getCart(userId, Language.EN);
}

export async function updateCartItem(
	userId: string,
	cartItemId: string,
	quantity: number
): Promise<CartOut> {
	const items = await cartRepo.findCartByUser(userId);
	const item = items.find((i) => i.id === cartItemId);
	if (!item) {
		throw new GraphQLError('Cart item not found', { extensions: { code: 'NOT_FOUND' } });
	}
	await cartRepo.updateCartItemQty(cartItemId, quantity);
	return getCart(userId, Language.EN);
}

export async function removeFromCart(userId: string, cartItemId: string): Promise<CartOut> {
	const items = await cartRepo.findCartByUser(userId);
	const item = items.find((i) => i.id === cartItemId);
	if (!item) {
		throw new GraphQLError('Cart item not found', { extensions: { code: 'NOT_FOUND' } });
	}
	await cartRepo.removeCartItem(cartItemId);
	return getCart(userId, Language.EN);
}

export async function clearCart(userId: string): Promise<CartOut> {
	await cartRepo.clearCart(userId);
	return { items: [], subtotal: 0 };
}
