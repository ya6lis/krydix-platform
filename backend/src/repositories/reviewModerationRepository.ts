import { prisma } from '../utils/prisma.js';
import type { Prisma } from '@prisma/client';

export type ModerationReviewTab = 'PENDING' | 'FLAGGED' | 'APPROVED' | 'HIDDEN';

export type ModerationReviewTarget = 'ALL' | 'PRODUCT' | 'SELLER' | 'BUYER';

const MODERATION_INCLUDE = {
	reviewer: {
		select: {
			id: true,
			profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
		},
	},
	product: {
		select: {
			id: true,
			sku: true,
			slug: true,
			translations: { where: { language: 'EN' as const }, take: 1 },
			media: { where: { isMain: true }, take: 1 },
		},
	},
	complaints: {
		where: { status: { in: ['NEW', 'IN_REVIEW'] as const } },
		orderBy: { createdAt: 'desc' as const },
		take: 1,
		select: { id: true, reason: true, status: true, complainantId: true },
	},
} as const;

export type RawModerationReview = Prisma.ProductReviewGetPayload<{
	include: typeof MODERATION_INCLUDE;
}>;

function buildSearchFilter(search?: string): Prisma.ProductReviewWhereInput | undefined {
	if (!search?.trim()) return undefined;
	const q = search.trim();
	return {
		OR: [
			{ text: { contains: q, mode: 'insensitive' } },
			{ product: { sku: { contains: q, mode: 'insensitive' } } },
			{ product: { translations: { some: { title: { contains: q, mode: 'insensitive' } } } } },
			{
				reviewer: {
					profile: {
						OR: [
							{ firstName: { contains: q, mode: 'insensitive' } },
							{ lastName: { contains: q, mode: 'insensitive' } },
						],
					},
				},
			},
		],
	};
}

function buildRatingFilter(ratingFilter?: string): Prisma.ProductReviewWhereInput | undefined {
	if (!ratingFilter || ratingFilter === 'ALL') return undefined;
	if (ratingFilter === '5') return { rating: { gte: 5, lte: 5 } };
	if (ratingFilter === '4') return { rating: { gte: 4, lte: 4 } };
	if (ratingFilter === '3') return { rating: { gte: 3, lte: 3 } };
	if (ratingFilter === '1-2') return { rating: { gte: 1, lte: 2 } };
	return undefined;
}

function buildTabWhere(tab: ModerationReviewTab): Prisma.ProductReviewWhereInput {
	switch (tab) {
		case 'PENDING':
			return { isApproved: false, isBlocked: false };
		case 'APPROVED':
			return { isApproved: true, isBlocked: false };
		case 'HIDDEN':
			return { isBlocked: true };
		case 'FLAGGED':
			return {
				complaints: { some: { status: { in: ['NEW', 'IN_REVIEW'] } } },
				isBlocked: false,
			};
		default:
			return {};
	}
}

export async function findModerationReviews({
	tab = 'PENDING',
	search,
	ratingFilter,
	target = 'PRODUCT',
	page = 1,
	pageSize = 6,
}: {
	tab?: ModerationReviewTab;
	search?: string;
	ratingFilter?: string;
	target?: ModerationReviewTarget;
	page?: number;
	pageSize?: number;
}) {
	// MVP: only product reviews are in DB workflow; other targets return empty
	if (target === 'SELLER' || target === 'BUYER') {
		return { items: [], total: 0, page, pageSize };
	}

	const skip = (page - 1) * pageSize;
	const where: Prisma.ProductReviewWhereInput = {
		deletedAt: null,
		...buildTabWhere(tab),
		...buildSearchFilter(search),
		...buildRatingFilter(ratingFilter),
	};

	const [items, total] = await Promise.all([
		prisma.productReview.findMany({
			where,
			include: MODERATION_INCLUDE,
			orderBy: { createdAt: 'desc' },
			skip,
			take: pageSize,
		}),
		prisma.productReview.count({ where }),
	]);

	return { items, total, page, pageSize };
}

export async function countModerationReviewsByTab() {
	const base = { deletedAt: null };
	const [pending, flagged, approved, hidden] = await Promise.all([
		prisma.productReview.count({
			where: { ...base, isApproved: false, isBlocked: false },
		}),
		prisma.productReview.count({
			where: {
				...base,
				isBlocked: false,
				complaints: { some: { status: { in: ['NEW', 'IN_REVIEW'] } } },
			},
		}),
		prisma.productReview.count({
			where: { ...base, isApproved: true, isBlocked: false },
		}),
		prisma.productReview.count({
			where: { ...base, isBlocked: true },
		}),
	]);
	return { pending, flagged, approved, hidden };
}

export async function findModerationReviewById(id: string) {
	return prisma.productReview.findUnique({
		where: { id },
		include: MODERATION_INCLUDE,
	});
}

export async function approveReviewRecord(id: string) {
	return prisma.productReview.update({
		where: { id },
		data: { isApproved: true, isBlocked: false },
		include: MODERATION_INCLUDE,
	});
}

export async function hideReviewRecord(id: string) {
	return prisma.productReview.update({
		where: { id },
		data: { isBlocked: true, isApproved: false },
		include: MODERATION_INCLUDE,
	});
}

export async function softDeleteReviewRecord(id: string) {
	return prisma.productReview.update({
		where: { id },
		data: { deletedAt: new Date(), isBlocked: true },
		include: MODERATION_INCLUDE,
	});
}

export async function countReviewerApprovedReviews(reviewerId: string) {
	return prisma.productReview.count({
		where: { reviewerId, isApproved: true, isBlocked: false, deletedAt: null },
	});
}
