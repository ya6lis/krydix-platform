import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';

export type CartItemRecord = Prisma.CartItemGetPayload<{
	include: {
		product: {
			include: {
				translations: true;
				media: true;
				variants: true;
				categories: { select: { categoryId: true } };
				seller: { include: { profile: true } };
			};
		};
		variant: true;
	};
}>;

export async function findCartByUser(userId: string): Promise<CartItemRecord[]> {
	return prisma.cartItem.findMany({
		where: { userId },
		include: {
			product: {
				include: {
					translations: true,
					media: { where: { isMain: true }, take: 1 },
					variants: true,
					categories: { select: { categoryId: true } },
					seller: { include: { profile: true } },
				},
			},
			variant: true,
		},
		orderBy: { createdAt: 'asc' },
	});
}

export async function findCartItem(
	userId: string,
	productId: string,
	variantId: string | null
): Promise<{ id: string; quantity: number } | null> {
	return prisma.cartItem.findFirst({
		where: { userId, productId, variantId: variantId ?? null },
		select: { id: true, quantity: true },
	});
}

export async function upsertCartItem(
	userId: string,
	productId: string,
	variantId: string | null,
	quantity: number
): Promise<void> {
	await prisma.cartItem.upsert({
		where: {
			userId_productId_variantId: {
				userId,
				productId,
				variantId: variantId ?? '',
			},
		},
		create: { userId, productId, variantId, quantity },
		update: { quantity },
	});
}

export async function updateCartItemQty(id: string, quantity: number): Promise<void> {
	await prisma.cartItem.update({ where: { id }, data: { quantity } });
}

export async function removeCartItem(id: string): Promise<void> {
	await prisma.cartItem.delete({ where: { id } });
}

export async function clearCart(userId: string): Promise<void> {
	await prisma.cartItem.deleteMany({ where: { userId } });
}
