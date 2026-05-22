import { prisma } from '../utils/prisma.js';

const categoryInclude = {
	translations: true,
	_count: { select: { products: true } },
} as const;

/** All active, non-deleted categories with translations and product counts. */
export async function findAllCategories() {
	return prisma.category.findMany({
		where: { isActive: true, deletedAt: null },
		include: categoryInclude,
		orderBy: { sortOrder: 'asc' },
	});
}

/** Single active category by slug. */
export async function findCategoryBySlug(slug: string) {
	return prisma.category.findFirst({
		where: { slug, isActive: true, deletedAt: null },
		include: categoryInclude,
	});
}

export type CategoryRecord = Awaited<ReturnType<typeof findAllCategories>>[number];
