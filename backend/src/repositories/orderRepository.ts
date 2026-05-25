import { Prisma, DeliveryMethod, PaymentMethod, OrderStatus } from '@prisma/client';
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

export interface FindOrdersFilter {
	status?: OrderStatus;
	dateFrom?: Date;
	dateTo?: Date;
	search?: string;
}

export interface Pagination {
	page: number;
	pageSize: number;
}

export interface PaginatedOrders {
	items: OrderRecord[];
	total: number;
	page: number;
	pageSize: number;
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
			include: {
				items: { include: { product: { include: { media: true } }, variant: true, seller: true } },
				payment: true,
				delivery: true,
				promoCode: true,
			},
		});
	});
}

export async function findOrdersByBuyer(
	buyerId: string,
	filter?: FindOrdersFilter,
	pagination?: Pagination
): Promise<PaginatedOrders> {
	const page = pagination?.page ?? 1;
	const pageSize = pagination?.pageSize ?? 10;
	const skip = (page - 1) * pageSize;

	const where: Prisma.OrderWhereInput = {
		buyerId,
		deletedAt: null,
		...(filter?.status && { status: filter.status }),
		...(filter?.dateFrom || filter?.dateTo
			? {
					createdAt: {
						...(filter.dateFrom && { gte: filter.dateFrom }),
						...(filter.dateTo && { lte: filter.dateTo }),
					},
				}
			: {}),
	};

	const [items, total] = await Promise.all([
		prisma.order.findMany({
			where,
			include: {
				items: { include: { product: { include: { media: true } }, variant: true, seller: true } },
				payment: true,
				delivery: true,
				promoCode: true,
			},
			orderBy: { createdAt: 'desc' },
			skip,
			take: pageSize,
		}),
		prisma.order.count({ where }),
	]);

	return { items, total, page, pageSize };
}

export async function findOrderById(id: string): Promise<OrderRecord | null> {
	return prisma.order.findFirst({
		where: { id, deletedAt: null },
		include: {
			items: { include: { product: { include: { media: true } }, variant: true, seller: true } },
			payment: true,
			delivery: true,
			promoCode: true,
		},
	});
}

export async function findOrderByIdAndBuyer(
	id: string,
	buyerId: string
): Promise<OrderRecord | null> {
	return prisma.order.findFirst({
		where: { id, buyerId, deletedAt: null },
		include: {
			items: { include: { product: { include: { media: true } }, variant: true, seller: true } },
			payment: true,
			delivery: true,
			promoCode: true,
		},
	});
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<OrderRecord> {
	return prisma.order.update({
		where: { id },
		data: { status },
		include: {
			items: { include: { product: { include: { media: true } }, variant: true, seller: true } },
			payment: true,
			delivery: true,
			promoCode: true,
		},
	});
}

export async function updatePaymentStatus(orderId: string, status: string): Promise<void> {
	await prisma.paymentRecord.updateMany({
		where: { orderId },
		data: { status: status as never },
	});
}

export async function countOrdersByBuyerAndStatus(buyerId: string): Promise<{
	all: number;
	pending: number;
	confirmed: number;
	shipped: number;
	delivered: number;
	cancelled: number;
	refunded: number;
}> {
	const [all, pending, confirmed, shipped, delivered, cancelled, refunded] = await Promise.all([
		prisma.order.count({ where: { buyerId, deletedAt: null } }),
		prisma.order.count({ where: { buyerId, deletedAt: null, status: 'PENDING' } }),
		prisma.order.count({ where: { buyerId, deletedAt: null, status: 'CONFIRMED' } }),
		prisma.order.count({ where: { buyerId, deletedAt: null, status: 'SHIPPED' } }),
		prisma.order.count({ where: { buyerId, deletedAt: null, status: 'DELIVERED' } }),
		prisma.order.count({ where: { buyerId, deletedAt: null, status: 'CANCELLED' } }),
		prisma.order.count({ where: { buyerId, deletedAt: null, status: 'REFUNDED' } }),
	]);
	return { all, pending, confirmed, shipped, delivered, cancelled, refunded };
}
