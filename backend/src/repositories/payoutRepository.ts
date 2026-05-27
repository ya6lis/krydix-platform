import { PayoutStatus, Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';

const payoutInclude = {
	order: { select: { id: true, status: true } },
	orderItem: {
		select: {
			id: true,
			productTitle: true,
			totalPrice: true,
			confirmedReceivedAt: true,
		},
	},
} as const;

export type PayoutRecord = Prisma.SellerPayoutGetPayload<{ include: typeof payoutInclude }>;

export interface CreatePayoutInput {
	orderId: string;
	orderItemId: string;
	sellerId: string;
	amountGross: number;
	platformFeeAmount: number;
	withdrawalFeeAmount?: number;
	amountNet: number;
	currency: string;
	availableAt: Date;
}

export async function createPayout(input: CreatePayoutInput): Promise<PayoutRecord> {
	return prisma.sellerPayout.create({
		data: {
			orderId: input.orderId,
			orderItemId: input.orderItemId,
			sellerId: input.sellerId,
			amountGross: input.amountGross,
			platformFeeAmount: input.platformFeeAmount,
			withdrawalFeeAmount: input.withdrawalFeeAmount ?? 0,
			amountNet: input.amountNet,
			currency: input.currency,
			status: PayoutStatus.ON_HOLD,
			availableAt: input.availableAt,
		},
		include: payoutInclude,
	});
}

export async function findPayoutById(id: string): Promise<PayoutRecord | null> {
	return prisma.sellerPayout.findUnique({ where: { id }, include: payoutInclude });
}

export async function findPayoutsBySeller(
	sellerId: string,
	filter?: { status?: PayoutStatus | PayoutStatus[] },
	pagination?: { page: number; pageSize: number }
): Promise<{ items: PayoutRecord[]; total: number; page: number; pageSize: number }> {
	const page = pagination?.page ?? 1;
	const pageSize = pagination?.pageSize ?? 20;
	const skip = (page - 1) * pageSize;

	const where: Prisma.SellerPayoutWhereInput = {
		sellerId,
		...(filter?.status && {
			status: Array.isArray(filter.status) ? { in: filter.status } : filter.status,
		}),
	};

	const [items, total] = await Promise.all([
		prisma.sellerPayout.findMany({
			where,
			include: payoutInclude,
			orderBy: { createdAt: 'desc' },
			skip,
			take: pageSize,
		}),
		prisma.sellerPayout.count({ where }),
	]);

	return { items, total, page, pageSize };
}

export async function sumPayoutAmountsBySeller(
	sellerId: string,
	statuses: PayoutStatus[]
): Promise<number> {
	const result = await prisma.sellerPayout.aggregate({
		where: { sellerId, status: { in: statuses } },
		_sum: { amountNet: true },
	});
	return Number(result._sum.amountNet ?? 0);
}

export async function countPayoutsBySeller(
	sellerId: string,
	statuses: PayoutStatus[]
): Promise<number> {
	return prisma.sellerPayout.count({
		where: { sellerId, status: { in: statuses } },
	});
}

export async function findPayoutsForOrder(orderId: string): Promise<PayoutRecord[]> {
	return prisma.sellerPayout.findMany({
		where: { orderId },
		include: payoutInclude,
	});
}

export async function findPayoutByOrderItem(orderItemId: string): Promise<PayoutRecord | null> {
	return prisma.sellerPayout.findUnique({
		where: { orderItemId },
		include: payoutInclude,
	});
}

export async function markPayoutsBlockedForOrder(orderId: string, sellerId?: string): Promise<number> {
	const result = await prisma.sellerPayout.updateMany({
		where: {
			orderId,
			...(sellerId && { sellerId }),
			status: { in: [PayoutStatus.ON_HOLD, PayoutStatus.ELIGIBLE_FOR_RELEASE, PayoutStatus.RELEASED] },
		},
		data: { status: PayoutStatus.BLOCKED },
	});
	return result.count;
}

export async function markPayoutsRefundedForOrder(orderId: string, sellerId?: string): Promise<number> {
	const result = await prisma.sellerPayout.updateMany({
		where: {
			orderId,
			...(sellerId && { sellerId }),
			status: { notIn: [PayoutStatus.WITHDRAWN, PayoutStatus.REFUNDED] },
		},
		data: { status: PayoutStatus.REFUNDED },
	});
	return result.count;
}

export async function promoteEligiblePayouts(now = new Date()): Promise<number> {
	const result = await prisma.sellerPayout.updateMany({
		where: {
			status: PayoutStatus.ON_HOLD,
			availableAt: { lte: now },
		},
		data: { status: PayoutStatus.ELIGIBLE_FOR_RELEASE },
	});
	return result.count;
}

export async function releaseEligiblePayouts(now = new Date()): Promise<number> {
	const result = await prisma.sellerPayout.updateMany({
		where: {
			status: PayoutStatus.ELIGIBLE_FOR_RELEASE,
			availableAt: { lte: now },
		},
		data: { status: PayoutStatus.RELEASED, releasedAt: now },
	});
	return result.count;
}

export async function withdrawReleasedPayouts(
	sellerId: string,
	payoutIds?: string[]
): Promise<PayoutRecord[]> {
	const now = new Date();
	return prisma.$transaction(async (tx) => {
		const payouts = await tx.sellerPayout.findMany({
			where: {
				sellerId,
				status: { in: [PayoutStatus.RELEASED, PayoutStatus.ELIGIBLE_FOR_RELEASE] },
				...(payoutIds?.length && { id: { in: payoutIds } }),
			},
			include: payoutInclude,
		});

		if (payouts.length === 0) return [];

		await tx.sellerPayout.updateMany({
			where: { id: { in: payouts.map((p) => p.id) } },
			data: { status: PayoutStatus.WITHDRAWN, withdrawnAt: now },
		});

		return tx.sellerPayout.findMany({
			where: { id: { in: payouts.map((p) => p.id) } },
			include: payoutInclude,
		});
	});
}

export async function confirmOrderItemsReceipt(
	orderId: string,
	confirmedAt: Date,
	holdUntil: Date
): Promise<number> {
	const result = await prisma.orderItem.updateMany({
		where: { orderId, confirmedReceivedAt: null },
		data: { confirmedReceivedAt: confirmedAt, payoutHoldUntil: holdUntil },
	});
	return result.count;
}

export async function findOrdersPendingAutoConfirm(cutoff: Date) {
	return prisma.order.findMany({
		where: {
			deletedAt: null,
			status: { in: ['SHIPPED', 'DELIVERED'] },
			delivery: {
				status: 'DELIVERED',
				deliveredAt: { lte: cutoff },
				confirmedReceivedAt: null,
			},
			items: { some: { confirmedReceivedAt: null } },
		},
		include: {
			items: true,
			delivery: true,
			payment: true,
		},
	});
}

export async function sumPendingPlatformPayouts(): Promise<number> {
	const result = await prisma.sellerPayout.aggregate({
		where: {
			status: { in: [PayoutStatus.ON_HOLD, PayoutStatus.ELIGIBLE_FOR_RELEASE, PayoutStatus.RELEASED] },
		},
		_sum: { amountNet: true },
	});
	return Number(result._sum.amountNet ?? 0);
}
