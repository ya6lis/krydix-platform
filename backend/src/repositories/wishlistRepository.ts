import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';

export type WishlistItemRecord = Prisma.WishlistItemGetPayload<{
	include: {
		product: {
			include: {
				translations: true;
				media: true;
				variants: true;
				seller: { include: { profile: true } };
			};
		};
	};
}>;

const WISHLIST_INCLUDE = {
	product: {
		include: {
			translations: true,
			media: { where: { isMain: true }, take: 1 },
			variants: true,
			seller: { include: { profile: true } },
		},
	},
} as const;

export async function findWishlistByUser(userId: string): Promise<WishlistItemRecord[]> {
	return prisma.wishlistItem.findMany({
		where: { userId },
		include: WISHLIST_INCLUDE,
		orderBy: { createdAt: 'desc' },
	});
}

export async function findWishlistProductIds(userId: string): Promise<string[]> {
	const rows = await prisma.wishlistItem.findMany({
		where: { userId },
		select: { productId: true },
		orderBy: { createdAt: 'desc' },
	});
	return rows.map((row) => row.productId);
}

export async function findWishlistItem(
	userId: string,
	productId: string
): Promise<{ id: string } | null> {
	return prisma.wishlistItem.findUnique({
		where: { userId_productId: { userId, productId } },
		select: { id: true },
	});
}

export async function addWishlistItem(userId: string, productId: string): Promise<void> {
	await prisma.wishlistItem.create({ data: { userId, productId } });
}

export async function removeWishlistItem(userId: string, productId: string): Promise<void> {
	await prisma.wishlistItem.deleteMany({ where: { userId, productId } });
}
