import { prisma } from '../utils/prisma.js';
import type { Prisma } from '@prisma/client';

const REVIEW_INCLUDE = {
	reviewer: {
		select: {
			id: true,
			profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
		},
	},
	product: {
		select: { id: true, sellerId: true, slug: true },
	},
} as const;

export type RawProductReview = Prisma.ProductReviewGetPayload<{ include: typeof REVIEW_INCLUDE }>;

export async function findProductReviews(
	productId: string,
	{ page = 1, pageSize = 10 }: { page?: number; pageSize?: number },
	viewerId?: string
) {
	const skip = (page - 1) * pageSize;
	const where: Prisma.ProductReviewWhereInput = {
		productId,
		isBlocked: false,
		deletedAt: null,
		OR: [{ isApproved: true }, ...(viewerId ? [{ reviewerId: viewerId }] : [])],
	};

	const [items, total] = await Promise.all([
		prisma.productReview.findMany({
			where,
			include: REVIEW_INCLUDE,
			orderBy: { createdAt: 'desc' },
			skip,
			take: pageSize,
		}),
		prisma.productReview.count({ where }),
	]);

	return { items, total, page, pageSize };
}

export async function findReviewById(id: string) {
	return prisma.productReview.findUnique({
		where: { id },
		include: REVIEW_INCLUDE,
	});
}

export async function countReviewerReviews(reviewerId: string) {
	return prisma.productReview.count({
		where: { reviewerId, isBlocked: false, deletedAt: null, isApproved: true },
	});
}

export async function findDeliveredOrderForProduct(buyerId: string, productId: string) {
	return prisma.order.findFirst({
		where: {
			buyerId,
			status: 'DELIVERED',
			deletedAt: null,
			items: { some: { productId } },
		},
		orderBy: { createdAt: 'desc' },
		select: { id: true },
	});
}

export async function findExistingReview(productId: string, reviewerId: string, orderId: string) {
	return prisma.productReview.findUnique({
		where: { productId_reviewerId_orderId: { productId, reviewerId, orderId } },
		include: REVIEW_INCLUDE,
	});
}

export async function createProductReview(data: {
	productId: string;
	reviewerId: string;
	orderId: string;
	rating: number;
	text?: string;
	photos?: Prisma.InputJsonValue;
}) {
	return prisma.productReview.create({
		data: {
			productId: data.productId,
			reviewerId: data.reviewerId,
			orderId: data.orderId,
			rating: data.rating,
			text: data.text ?? null,
			photos: data.photos ?? undefined,
			isApproved: false,
		},
		include: REVIEW_INCLUDE,
	});
}

export async function updateProductReview(
	id: string,
	data: { rating?: number; text?: string; photos?: Prisma.InputJsonValue }
) {
	return prisma.productReview.update({
		where: { id },
		data: {
			...data,
			isApproved: false,
		},
		include: REVIEW_INCLUDE,
	});
}

export async function setSellerReply(id: string, sellerReply: string) {
	return prisma.productReview.update({
		where: { id },
		data: { sellerReply },
		include: REVIEW_INCLUDE,
	});
}

export async function getApprovedRatingStats(productId: string) {
	const result = await prisma.productReview.aggregate({
		where: {
			productId,
			isApproved: true,
			isBlocked: false,
			deletedAt: null,
		},
		_avg: { rating: true },
		_count: { _all: true },
	});
	return {
		averageRating: Number(result._avg.rating ?? 0),
		reviewCount: result._count._all,
	};
}

export async function createReviewComplaint(data: {
	complainantId: string;
	targetReviewId: string;
	reason: string;
}) {
	return prisma.complaint.create({
		data: {
			complainantId: data.complainantId,
			target: 'REVIEW',
			targetReviewId: data.targetReviewId,
			reason: data.reason,
			status: 'NEW',
		},
	});
}
