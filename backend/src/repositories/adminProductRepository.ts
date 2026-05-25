import { prisma } from '../utils/prisma.js';
import type { Prisma, ProductStatus } from '@prisma/client';

export type AdminProductStatusFilter =
	| 'ALL'
	| 'DRAFT'
	| 'PENDING_MODERATION'
	| 'APPROVED'
	| 'REJECTED'
	| 'BLOCKED'
	| 'ARCHIVED'
	| 'DELETED';

export type AdminProductAvailabilityFilter = 'ALL' | 'AVAILABLE' | 'UNAVAILABLE';

const PRODUCT_INCLUDE = {
	translations: true,
	seller: {
		select: {
			id: true,
			email: true,
			profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
		},
	},
	media: {
		orderBy: [{ isMain: 'desc' as const }, { sortOrder: 'asc' as const }],
		take: 1,
	},
	categories: {
		include: {
			category: {
				include: {
					translations: { where: { language: 'EN' as const }, take: 1 },
					parent: {
						include: {
							translations: { where: { language: 'EN' as const }, take: 1 },
						},
					},
				},
			},
		},
		take: 1,
	},
	variants: {
		select: { stock: true },
	},
} as const;

export type RawAdminProduct = Prisma.ProductGetPayload<{ include: typeof PRODUCT_INCLUDE }>;

function buildSearchFilter(search?: string): Prisma.ProductWhereInput | undefined {
	if (!search?.trim()) return undefined;
	const q = search.trim();
	return {
		OR: [
			{ sku: { contains: q, mode: 'insensitive' } },
			{ slug: { contains: q, mode: 'insensitive' } },
			{ id: { contains: q, mode: 'insensitive' } },
			{ brand: { contains: q, mode: 'insensitive' } },
			{
				translations: {
					some: { title: { contains: q, mode: 'insensitive' } },
				},
			},
			{
				seller: {
					OR: [
						{ email: { contains: q, mode: 'insensitive' } },
						{
							profile: {
								OR: [
									{ firstName: { contains: q, mode: 'insensitive' } },
									{ lastName: { contains: q, mode: 'insensitive' } },
								],
							},
						},
					],
				},
			},
		],
	};
}

function buildStatusFilter(statusFilter?: AdminProductStatusFilter): Prisma.ProductWhereInput {
	if (!statusFilter || statusFilter === 'ALL') {
		return { deletedAt: null };
	}
	if (statusFilter === 'DELETED') {
		return { deletedAt: { not: null } };
	}
	if (statusFilter === 'APPROVED') {
		return { deletedAt: null, status: { in: ['APPROVED', 'ENABLED'] } };
	}
	return { deletedAt: null, status: statusFilter as ProductStatus };
}

function buildAvailabilityFilter(
	availabilityFilter?: AdminProductAvailabilityFilter,
): Prisma.ProductWhereInput | undefined {
	if (!availabilityFilter || availabilityFilter === 'ALL') return undefined;
	if (availabilityFilter === 'AVAILABLE') return { isAvailable: true };
	return { isAvailable: false };
}

export async function getAdminProductStats() {
	const base = { deletedAt: null };
	const monthStart = new Date();
	monthStart.setDate(1);
	monthStart.setHours(0, 0, 0, 0);

	const [total, draft, pending, approved, rejected, blocked, archived, deleted, newThisMonth] =
		await Promise.all([
			prisma.product.count({ where: base }),
			prisma.product.count({ where: { ...base, status: 'DRAFT' } }),
			prisma.product.count({ where: { ...base, status: 'PENDING_MODERATION' } }),
			prisma.product.count({ where: { ...base, status: { in: ['APPROVED', 'ENABLED'] } } }),
			prisma.product.count({ where: { ...base, status: 'REJECTED' } }),
			prisma.product.count({ where: { ...base, status: 'BLOCKED' } }),
			prisma.product.count({ where: { ...base, status: 'ARCHIVED' } }),
			prisma.product.count({ where: { deletedAt: { not: null } } }),
			prisma.product.count({ where: { ...base, createdAt: { gte: monthStart } } }),
		]);

	return { total, draft, pending, approved, rejected, blocked, archived, deleted, newThisMonth };
}

export async function getAdminProductTabCounts() {
	const base = { deletedAt: null };
	const [all, draft, pending, approved, rejected, blocked, archived, deleted] = await Promise.all([
		prisma.product.count({ where: base }),
		prisma.product.count({ where: { ...base, status: 'DRAFT' } }),
		prisma.product.count({ where: { ...base, status: 'PENDING_MODERATION' } }),
		prisma.product.count({ where: { ...base, status: { in: ['APPROVED', 'ENABLED'] } } }),
		prisma.product.count({ where: { ...base, status: 'REJECTED' } }),
		prisma.product.count({ where: { ...base, status: 'BLOCKED' } }),
		prisma.product.count({ where: { ...base, status: 'ARCHIVED' } }),
		prisma.product.count({ where: { deletedAt: { not: null } } }),
	]);
	return { all, draft, pending, approved, rejected, blocked, archived, deleted };
}

export async function findAllAdminProducts({
	statusFilter = 'ALL',
	availabilityFilter,
	search,
	page = 1,
	pageSize = 25,
}: {
	statusFilter?: AdminProductStatusFilter;
	availabilityFilter?: AdminProductAvailabilityFilter;
	search?: string;
	page?: number;
	pageSize?: number;
}) {
	const skip = (page - 1) * pageSize;
	const where: Prisma.ProductWhereInput = {
		...buildStatusFilter(statusFilter),
		...buildAvailabilityFilter(availabilityFilter),
		...buildSearchFilter(search),
	};

	const [items, total] = await Promise.all([
		prisma.product.findMany({
			where,
			include: PRODUCT_INCLUDE,
			orderBy: { updatedAt: 'desc' },
			skip,
			take: pageSize,
		}),
		prisma.product.count({ where }),
	]);

	return { items, total, page, pageSize };
}

export async function findAdminProductById(id: string) {
	return prisma.product.findUnique({ where: { id }, include: PRODUCT_INCLUDE });
}

export async function updateAdminProductStatus(id: string, status: ProductStatus) {
	return prisma.product.update({
		where: { id },
		data: { status },
		include: PRODUCT_INCLUDE,
	});
}

export async function softDeleteAdminProductRecord(id: string) {
	return prisma.product.update({
		where: { id },
		data: {
			deletedAt: new Date(),
			isAvailable: false,
			status: 'ARCHIVED',
		},
		include: PRODUCT_INCLUDE,
	});
}
