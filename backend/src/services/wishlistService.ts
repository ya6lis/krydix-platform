import { GraphQLError } from 'graphql';
import * as wishlistRepo from '../repositories/wishlistRepository.js';
import * as productRepo from '../repositories/productRepository.js';
import { Language } from '../constants/enums.js';

export interface WishlistItemOut {
	id: string;
	productId: string;
	productTitle: string;
	productSlug: string;
	productImage: string | null;
	price: number;
	comparePrice: number | null;
	inStock: boolean;
	totalStock: number;
	sellerId: string;
	sellerName: string;
}

export interface WishlistOut {
	items: WishlistItemOut[];
	count: number;
}

function mapItem(item: wishlistRepo.WishlistItemRecord, language: Language): WishlistItemOut {
	const translation =
		item.product.translations.find((t) => t.language === language) ??
		item.product.translations[0];
	const profile = item.product.seller.profile;
	const sellerName = profile
		? `${profile.firstName} ${profile.lastName}`.trim()
		: item.product.sellerId;
	const totalStock = item.product.variants.reduce((sum, variant) => sum + variant.stock, 0);

	return {
		id: item.id,
		productId: item.productId,
		productTitle: translation?.title ?? '',
		productSlug: item.product.slug,
		productImage: item.product.media[0]?.url ?? null,
		price: Number(item.product.basePrice),
		comparePrice: item.product.comparePrice ? Number(item.product.comparePrice) : null,
		inStock: item.product.isAvailable && totalStock > 0,
		totalStock,
		sellerId: item.product.sellerId,
		sellerName,
	};
}

async function buildWishlist(userId: string, language: Language): Promise<WishlistOut> {
	const items = await wishlistRepo.findWishlistByUser(userId);
	const mapped = items
		.filter((item) => !item.product.deletedAt && item.product.isAvailable)
		.map((item) => mapItem(item, language));
	return { items: mapped, count: mapped.length };
}

export async function getWishlist(userId: string, language: Language): Promise<WishlistOut> {
	return buildWishlist(userId, language);
}

export async function getWishlistProductIds(userId: string): Promise<string[]> {
	return wishlistRepo.findWishlistProductIds(userId);
}

async function assertProductWishlistable(productId: string) {
	const product = await productRepo.findProductById(productId);
	if (!product || product.deletedAt || !product.isAvailable) {
		throw new GraphQLError('Product not found or unavailable', {
			extensions: { code: 'NOT_FOUND' },
		});
	}
}

export async function addToWishlist(
	userId: string,
	productId: string,
	language: Language,
): Promise<WishlistOut> {
	await assertProductWishlistable(productId);
	const existing = await wishlistRepo.findWishlistItem(userId, productId);
	if (!existing) {
		await wishlistRepo.addWishlistItem(userId, productId);
	}
	return buildWishlist(userId, language);
}

export async function removeFromWishlist(
	userId: string,
	productId: string,
	language: Language,
): Promise<WishlistOut> {
	await wishlistRepo.removeWishlistItem(userId, productId);
	return buildWishlist(userId, language);
}

export async function toggleWishlist(
	userId: string,
	productId: string,
	language: Language,
): Promise<WishlistOut> {
	const existing = await wishlistRepo.findWishlistItem(userId, productId);
	if (existing) {
		await wishlistRepo.removeWishlistItem(userId, productId);
	} else {
		await assertProductWishlistable(productId);
		await wishlistRepo.addWishlistItem(userId, productId);
	}
	return buildWishlist(userId, language);
}
