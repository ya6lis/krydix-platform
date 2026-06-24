import { OrderStatus, PaymentStatus, ProductStatus } from '@prisma/client';
import { prisma } from '../utils/prisma.js';

const ENFORCEABLE_ORDER_STATUSES: OrderStatus[] = [
	OrderStatus.PENDING,
	OrderStatus.CONFIRMED,
	OrderStatus.SHIPPED,
	OrderStatus.DELIVERED,
];

const REFUNDABLE_PAYMENT_STATUSES: PaymentStatus[] = [PaymentStatus.PAID, PaymentStatus.AUTHORIZED];

export interface UserEnforcementResult {
	productsAffected: number;
	ordersCancelled: number;
	ordersRefunded: number;
}

async function findAffectedOrderIds(userId: string): Promise<string[]> {
	const [buyerOrders, sellerItems] = await Promise.all([
		prisma.order.findMany({
			where: {
				buyerId: userId,
				deletedAt: null,
				status: { in: ENFORCEABLE_ORDER_STATUSES },
			},
			select: { id: true },
		}),
		prisma.orderItem.findMany({
			where: {
				sellerId: userId,
				order: {
					deletedAt: null,
					status: { in: ENFORCEABLE_ORDER_STATUSES },
				},
			},
			select: { orderId: true },
		}),
	]);

	return [...new Set([...buyerOrders.map((o) => o.id), ...sellerItems.map((i) => i.orderId)])];
}

async function cancelAndRefundOrders(
	tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
	orderIds: string[],
	options?: { softDeleteOrders?: boolean }
): Promise<{ ordersCancelled: number; ordersRefunded: number }> {
	if (orderIds.length === 0) {
		return { ordersCancelled: 0, ordersRefunded: 0 };
	}

	const orders = await tx.order.findMany({
		where: { id: { in: orderIds } },
		include: { payment: true },
	});

	let ordersCancelled = 0;
	let ordersRefunded = 0;
	const softDeleteAt = options?.softDeleteOrders ? new Date() : undefined;

	for (const order of orders) {
		if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.REFUNDED) {
			continue;
		}

		const needsRefund =
			order.payment !== null && REFUNDABLE_PAYMENT_STATUSES.includes(order.payment.status);

		if (needsRefund) {
			await tx.paymentRecord.updateMany({
				where: { orderId: order.id },
				data: { status: PaymentStatus.REFUNDED },
			});
			await tx.order.update({
				where: { id: order.id },
				data: {
					status: OrderStatus.REFUNDED,
					...(softDeleteAt && { deletedAt: softDeleteAt }),
				},
			});
			ordersRefunded++;
		} else {
			await tx.order.update({
				where: { id: order.id },
				data: {
					status: OrderStatus.CANCELLED,
					...(softDeleteAt && { deletedAt: softDeleteAt }),
				},
			});
			ordersCancelled++;
		}
	}

	return { ordersCancelled, ordersRefunded };
}

export async function applySoftBanEffects(userId: string): Promise<UserEnforcementResult> {
	const orderIds = await findAffectedOrderIds(userId);

	return prisma.$transaction(async (tx) => {
		const products = await tx.product.updateMany({
			where: { sellerId: userId, deletedAt: null },
			data: { status: ProductStatus.DRAFT, isAvailable: false },
		});

		const { ordersCancelled, ordersRefunded } = await cancelAndRefundOrders(tx, orderIds);

		return {
			productsAffected: products.count,
			ordersCancelled,
			ordersRefunded,
		};
	});
}

export async function applySoftDeleteEffects(userId: string): Promise<UserEnforcementResult> {
	const orderIds = await findAffectedOrderIds(userId);

	return prisma.$transaction(async (tx) => {
		const products = await tx.product.updateMany({
			where: { sellerId: userId, deletedAt: null },
			data: {
				deletedAt: new Date(),
				isAvailable: false,
				status: ProductStatus.ARCHIVED,
			},
		});

		const { ordersCancelled, ordersRefunded } = await cancelAndRefundOrders(tx, orderIds, {
			softDeleteOrders: true,
		});

		return {
			productsAffected: products.count,
			ordersCancelled,
			ordersRefunded,
		};
	});
}
