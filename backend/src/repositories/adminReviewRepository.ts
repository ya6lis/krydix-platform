import { prisma } from '../utils/prisma.js';
import type { ComplaintStatus, Prisma } from '@prisma/client';

const OPEN_COMPLAINT_STATUSES: ComplaintStatus[] = ['NEW', 'IN_REVIEW'];

export type AdminReviewStatusFilter =
	| 'ALL'
	| 'PENDING'
	| 'FLAGGED'
	| 'APPROVED'
	| 'BLOCKED'
	| 'DELETED';

const REVIEW_INCLUDE = {
	reviewer: {
		select: {
			id: true,
			email: true,
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
		where: { status: { in: OPEN_COMPLAINT_STATUSES } },
		orderBy: { createdAt: 'desc' },
		take: 1,
		select: { id: true, reason: true },
	},
} satisfies Prisma.ProductReviewInclude;

export type RawAdminReview = Prisma.ProductReviewGetPayload<{ include: typeof REVIEW_INCLUDE }>;

function buildSearchFilter(search?: string): Prisma.ProductReviewWhereInput | undefined {
	if (!search?.trim()) return undefined;
	const q = search.trim();
	return {
		OR: [
			{ text: { contains: q, mode: 'insensitive' } },
			{ id: { contains: q, mode: 'insensitive' } },
			{ product: { sku: { contains: q, mode: 'insensitive' } } },
			{ product: { translations: { some: { title: { contains: q, mode: 'insensitive' } } } } },
			{ reviewer: { email: { contains: q, mode: 'insensitive' } } },
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

function buildStatusFilter(statusFilter?: AdminReviewStatusFilter): Prisma.ProductReviewWhereInput {
	if (!statusFilter || statusFilter === 'ALL') {
		return { deletedAt: null };
	}
	if (statusFilter === 'DELETED') {
		return { deletedAt: { not: null } };
	}
	if (statusFilter === 'PENDING') {
		return { deletedAt: null, isApproved: false, isBlocked: false };
	}
	if (statusFilter === 'APPROVED') {
		return { deletedAt: null, isApproved: true, isBlocked: false };
	}
	if (statusFilter === 'BLOCKED') {
		return { deletedAt: null, isBlocked: true };
	}
	if (statusFilter === 'FLAGGED') {
		return {
			deletedAt: null,
			complaints: { some: { status: { in: ['NEW', 'IN_REVIEW'] } } },
		};
	}
	return { deletedAt: null };
}

export async function getAdminReviewStats() {
	const base = { deletedAt: null };
	const monthStart = new Date();
	monthStart.setDate(1);
	monthStart.setHours(0, 0, 0, 0);

	const [total, pending, flagged, approved, blocked, deleted, newThisMonth] = await Promise.all([
		prisma.productReview.count({ where: base }),
		prisma.productReview.count({ where: { ...base, isApproved: false, isBlocked: false } }),
		prisma.productReview.count({
			where: {
				...base,
				complaints: { some: { status: { in: ['NEW', 'IN_REVIEW'] } } },
			},
		}),
		prisma.productReview.count({ where: { ...base, isApproved: true, isBlocked: false } }),
		prisma.productReview.count({ where: { ...base, isBlocked: true } }),
		prisma.productReview.count({ where: { deletedAt: { not: null } } }),
		prisma.productReview.count({ where: { ...base, createdAt: { gte: monthStart } } }),
	]);

	return { total, pending, flagged, approved, blocked, deleted, newThisMonth };
}

export async function getAdminReviewTabCounts() {
	const base = { deletedAt: null };
	const [all, pending, flagged, approved, blocked, deleted] = await Promise.all([
		prisma.productReview.count({ where: base }),
		prisma.productReview.count({ where: { ...base, isApproved: false, isBlocked: false } }),
		prisma.productReview.count({
			where: {
				...base,
				complaints: { some: { status: { in: ['NEW', 'IN_REVIEW'] } } },
			},
		}),
		prisma.productReview.count({ where: { ...base, isApproved: true, isBlocked: false } }),
		prisma.productReview.count({ where: { ...base, isBlocked: true } }),
		prisma.productReview.count({ where: { deletedAt: { not: null } } }),
	]);
	return { all, pending, flagged, approved, blocked, deleted };
}

export async function findAllAdminReviews({
	statusFilter = 'ALL',
	ratingFilter,
	search,
	page = 1,
	pageSize = 25,
}: {
	statusFilter?: AdminReviewStatusFilter;
	ratingFilter?: string;
	search?: string;
	page?: number;
	pageSize?: number;
}) {
	const skip = (page - 1) * pageSize;
	const where: Prisma.ProductReviewWhereInput = {
		...buildStatusFilter(statusFilter),
		...buildRatingFilter(ratingFilter),
		...buildSearchFilter(search),
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

export async function findAdminReviewById(id: string) {
	return prisma.productReview.findUnique({ where: { id }, include: REVIEW_INCLUDE });
}

export async function updateAdminReviewStatus(
	id: string,
	data: { isApproved: boolean; isBlocked: boolean }
) {
	return prisma.productReview.update({
		where: { id },
		data,
		include: REVIEW_INCLUDE,
	});
}

export async function softDeleteAdminReviewRecord(id: string) {
	return prisma.productReview.update({
		where: { id },
		data: { deletedAt: new Date(), isBlocked: true, isApproved: false },
		include: REVIEW_INCLUDE,
	});
}
