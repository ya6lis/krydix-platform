import { Language, Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';

const categoryInclude = {
	translations: true,
	_count: { select: { products: true } },
} as const;

const adminCategoryInclude = {
	translations: true,
	_count: { select: { products: true, children: { where: { deletedAt: null } } } },
} as const;

/** All active, non-deleted categories with translations and product counts. */
export async function findAllCategories() {
	return prisma.category.findMany({
		where: { isActive: true, deletedAt: null },
		include: categoryInclude,
		orderBy: { sortOrder: 'asc' },
	});
}

/** All non-deleted categories for admin management. */
export async function findAllCategoriesAdmin() {
	return prisma.category.findMany({
		where: { deletedAt: null },
		include: adminCategoryInclude,
		orderBy: [{ sortOrder: 'asc' }],
	});
}

/** Single active category by slug. */
export async function findCategoryBySlug(slug: string) {
	return prisma.category.findFirst({
		where: { slug, isActive: true, deletedAt: null },
		include: categoryInclude,
	});
}

/** Single category by id (admin). */
export async function findCategoryById(id: string) {
	return prisma.category.findFirst({
		where: { id, deletedAt: null },
		include: adminCategoryInclude,
	});
}

export async function findCategoryBySlugAdmin(slug: string, excludeId?: string) {
	return prisma.category.findFirst({
		where: {
			slug,
			deletedAt: null,
			...(excludeId ? { NOT: { id: excludeId } } : {}),
		},
	});
}

export async function countCategoryProducts(categoryId: string) {
	return prisma.productCategory.count({ where: { categoryId } });
}

export async function getMaxSortOrder(parentId: string | null) {
	const result = await prisma.category.aggregate({
		where: { parentId, deletedAt: null },
		_max: { sortOrder: true },
	});
	return result._max.sortOrder ?? -1;
}

export async function createCategoryRecord(data: {
	slug: string;
	parentId: string | null;
	icon?: string | null;
	sortOrder: number;
	isActive?: boolean;
	translations: Array<{
		language: Language;
		name: string;
		description?: string | null;
		metaTitle?: string | null;
		metaDescription?: string | null;
	}>;
}) {
	return prisma.category.create({
		data: {
			slug: data.slug,
			parentId: data.parentId,
			icon: data.icon ?? null,
			sortOrder: data.sortOrder,
			isActive: data.isActive ?? true,
			translations: { create: data.translations },
		},
		include: adminCategoryInclude,
	});
}

export async function updateCategoryRecord(
	id: string,
	data: {
		slug?: string;
		parentId?: string | null;
		icon?: string | null;
		sortOrder?: number;
		isActive?: boolean;
	},
) {
	return prisma.category.update({
		where: { id },
		data,
		include: adminCategoryInclude,
	});
}

export async function upsertCategoryTranslation(
	categoryId: string,
	language: Language,
	data: {
		name: string;
		description?: string | null;
		metaTitle?: string | null;
		metaDescription?: string | null;
	},
) {
	return prisma.categoryTranslation.upsert({
		where: { categoryId_language: { categoryId, language } },
		create: { categoryId, language, ...data },
		update: data,
	});
}

export async function softDeleteCategory(id: string) {
	return prisma.category.update({
		where: { id },
		data: { deletedAt: new Date(), isActive: false },
	});
}

export async function reorderSiblings(parentId: string | null, orderedIds: string[]) {
	const updates = orderedIds.map((id, index) =>
		prisma.category.update({
			where: { id },
			data: { sortOrder: index, parentId },
		}),
	);
	await prisma.$transaction(updates);
}

export type CategoryRecord = Awaited<ReturnType<typeof findAllCategories>>[number];
export type AdminCategoryRecord = Awaited<ReturnType<typeof findAllCategoriesAdmin>>[number];
