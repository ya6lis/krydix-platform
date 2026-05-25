import { prisma } from '../utils/prisma.js';
import type { ProductStatus } from '@prisma/client';

function productInclude() {
	return {
		translations: true,
		seller: {
			select: {
				id: true,
				profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
			},
		},
		media: {
			orderBy: [{ isMain: 'desc' as const }, { sortOrder: 'asc' as const }] as {
				isMain?: 'asc' | 'desc';
				sortOrder?: 'asc' | 'desc';
			}[],
		},
		variants: {
			select: { id: true, sku: true, options: true, price: true, stock: true, isActive: true },
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
		},
	};
}

export type ModerationQueueFilterType = 'PENDING' | 'APPROVED_TODAY' | 'REJECTED_TODAY';

function buildWhere(filterType: ModerationQueueFilterType, search?: string) {
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	let base: Record<string, unknown>;
	if (filterType === 'APPROVED_TODAY') {
		base = { status: 'APPROVED' as ProductStatus, updatedAt: { gte: today }, deletedAt: null };
	} else if (filterType === 'REJECTED_TODAY') {
		base = { status: 'REJECTED' as ProductStatus, updatedAt: { gte: today }, deletedAt: null };
	} else {
		base = { status: 'PENDING_MODERATION' as ProductStatus, deletedAt: null };
	}

	if (!search) return base;
	return {
		...base,
		OR: [
			{ translations: { some: { title: { contains: search, mode: 'insensitive' as const } } } },
			{
				seller: {
					profile: {
						OR: [
							{ firstName: { contains: search, mode: 'insensitive' as const } },
							{ lastName: { contains: search, mode: 'insensitive' as const } },
						],
					},
				},
			},
			{ sku: { contains: search, mode: 'insensitive' as const } },
		],
	};
}

export async function getModerationQueue({
	filterType = 'PENDING',
	search,
	page = 1,
	pageSize = 20,
}: {
	filterType?: ModerationQueueFilterType;
	search?: string;
	page?: number;
	pageSize?: number;
}) {
	const skip = (page - 1) * pageSize;
	const where = buildWhere(filterType, search);
	const [items, total] = await Promise.all([
		prisma.product.findMany({
			where,
			include: productInclude(),
			orderBy: { updatedAt: 'asc' },
			skip,
			take: pageSize,
		}),
		prisma.product.count({ where }),
	]);
	return { items, total };
}

export async function getModerationItem(id: string) {
	return prisma.product.findUnique({
		where: { id },
		include: productInclude(),
	});
}

export async function setProductStatus(id: string, status: ProductStatus) {
	return prisma.product.update({
		where: { id },
		data: { status },
		include: productInclude(),
	});
}

export async function setProductsStatus(ids: string[], status: ProductStatus) {
	return prisma.product.updateMany({
		where: { id: { in: ids }, status: 'PENDING_MODERATION', deletedAt: null },
		data: { status },
	});
}

export function countByStatus(status: ProductStatus) {
	return prisma.product.count({ where: { status, deletedAt: null } });
}

export function countApprovedToday() {
	const start = new Date();
	start.setHours(0, 0, 0, 0);
	return prisma.product.count({
		where: { status: 'APPROVED', updatedAt: { gte: start }, deletedAt: null },
	});
}

export function countRejectedToday() {
	const start = new Date();
	start.setHours(0, 0, 0, 0);
	return prisma.product.count({
		where: { status: 'REJECTED', updatedAt: { gte: start }, deletedAt: null },
	});
}
