import { Prisma, ReturnRequestStatus } from '@prisma/client';
import { prisma } from '../utils/prisma.js';

export type ReturnRequestRecord = Prisma.ReturnRequestGetPayload<{
	select: {
		id: true;
		orderId: true;
		buyerId: true;
		sellerId: true;
		status: true;
		reason: true;
		details: true;
		resolution: true;
		reviewedById: true;
		reviewedAt: true;
		refundedAt: true;
		closedAt: true;
		createdAt: true;
		updatedAt: true;
	};
}>;

export interface CreateReturnRequestInput {
	orderId: string;
	buyerId: string;
	sellerId: string;
	reason: string;
	details?: string | null;
}

export async function createReturnRequest(
	input: CreateReturnRequestInput
): Promise<ReturnRequestRecord> {
	return prisma.returnRequest.create({
		data: {
			orderId: input.orderId,
			buyerId: input.buyerId,
			sellerId: input.sellerId,
			reason: input.reason,
			details: input.details ?? null,
		},
	});
}

export async function findReturnRequestByOrderId(
	orderId: string
): Promise<ReturnRequestRecord | null> {
	return prisma.returnRequest.findUnique({
		where: { orderId },
	});
}

export async function updateReturnRequestStatus(
	orderId: string,
	status: ReturnRequestStatus,
	meta?: {
		reviewedById?: string | null;
		reviewedAt?: Date | null;
		refundedAt?: Date | null;
		closedAt?: Date | null;
		resolution?: string | null;
	}
): Promise<ReturnRequestRecord> {
	return prisma.returnRequest.update({
		where: { orderId },
		data: {
			status,
			reviewedById: meta?.reviewedById ?? undefined,
			reviewedAt: meta?.reviewedAt ?? undefined,
			refundedAt: meta?.refundedAt ?? undefined,
			closedAt: meta?.closedAt ?? undefined,
			resolution: meta?.resolution ?? undefined,
		},
	});
}
