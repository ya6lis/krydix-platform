import { Prisma, DeliveryMethod, PaymentMethod } from '@prisma/client';
import { prisma } from '../utils/prisma.js';

export type OrderRecord = Prisma.OrderGetPayload<{
	include: {
		items: true;
		payment: true;
		delivery: true;
		promoCode: true;
	};
}>;

export interface CreateOrderInput {
	buyerId: string;
	totalAmount: number;
	discount?: number;
	promoCodeId?: string;
	notes?: string;
	paymentMethod: PaymentMethod;
	deliveryMethod: DeliveryMethod;
	deliveryAddress?: string;
	items: Array<{
		productId: string;
		variantId?: string;
		sellerId: string;
		quantity: number;
		unitPrice: number;
		productTitle: string;
	}>;
}

export async function createOrder(input: CreateOrderInput): Promise<OrderRecord> {
	return prisma.$transaction(async (tx) => {
		const order = await tx.order.create({
			data: {
				buyerId: input.buyerId,
				totalAmount: input.totalAmount,
				discount: input.discount ?? null,
				promoCodeId: input.promoCodeId ?? null,
				notes: input.notes ?? null,
				items: {
					create: input.items.map((item) => ({
						productId: item.productId,
						variantId: item.variantId ?? null,
						sellerId: item.sellerId,
						quantity: item.quantity,
						unitPrice: item.unitPrice,
						totalPrice: item.unitPrice * item.quantity,
						productTitle: item.productTitle,
					})),
				},
			},
			include: { items: true, payment: true, delivery: true, promoCode: true },
		});

		await tx.paymentRecord.create({
			data: {
				orderId: order.id,
				amount: input.totalAmount,
				method: input.paymentMethod,
			},
		});

		await tx.deliveryRecord.create({
			data: {
				orderId: order.id,
				method: input.deliveryMethod,
				address: input.deliveryAddress ?? null,
			},
		});

		// decrement variant stock
		for (const item of input.items) {
			if (item.variantId) {
				await tx.productVariant.update({
					where: { id: item.variantId },
					data: { stock: { decrement: item.quantity } },
				});
			}
		}

		return tx.order.findUniqueOrThrow({
			where: { id: order.id },
			include: { items: true, payment: true, delivery: true, promoCode: true },
		});
	});
}

export async function findOrdersByBuyer(buyerId: string): Promise<OrderRecord[]> {
	return prisma.order.findMany({
		where: { buyerId, deletedAt: null },
		include: { items: true, payment: true, delivery: true, promoCode: true },
		orderBy: { createdAt: 'desc' },
	});
}

export async function findOrderById(id: string): Promise<OrderRecord | null> {
	return prisma.order.findFirst({
		where: { id, deletedAt: null },
		include: { items: true, payment: true, delivery: true, promoCode: true },
	});
}
