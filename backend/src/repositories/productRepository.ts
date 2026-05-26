import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';

const productInclude = {
	translations: true,
	media: { orderBy: { sortOrder: 'asc' } },
	variants: { where: { isActive: true } },
	categories: { include: { category: { include: { translations: true } } } },
	seller: { include: { profile: true } },
} satisfies Prisma.ProductInclude;

export type ProductRecord = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

export async function findProducts(
	where: Prisma.ProductWhereInput,
	orderBy: Prisma.ProductOrderByWithRelationInput,
	skip: number,
	take: number
): Promise<ProductRecord[]> {
	return prisma.product.findMany({ where, include: productInclude, orderBy, skip, take });
}

export async function countProducts(where: Prisma.ProductWhereInput): Promise<number> {
	return prisma.product.count({ where });
}

export async function findProductBySlug(slug: string): Promise<ProductRecord | null> {
	return prisma.product.findFirst({
		where: { slug, deletedAt: null },
		include: productInclude,
	});
}

/** Aggregated rating + count for many products in one query. */
export async function ratingsByProductIds(productIds: string[]) {
	if (productIds.length === 0) return [];
	return prisma.productReview.groupBy({
		by: ['productId'],
		where: {
			productId: { in: productIds },
			isApproved: true,
			isBlocked: false,
			deletedAt: null,
		},
		_avg: { rating: true },
		_count: { _all: true },
	});
}

/** Distinct non-null brand names across visible products. */
export async function distinctBrands(visibleWhere: Prisma.ProductWhereInput): Promise<string[]> {
	const rows = await prisma.product.findMany({
		where: { ...visibleWhere, brand: { not: null } },
		distinct: ['brand'],
		select: { brand: true },
		orderBy: { brand: 'asc' },
	});
	return rows.map((r) => r.brand).filter((b): b is string => Boolean(b));
}

/** Find a product by id (for cart/checkout validation). */
export async function findProductById(id: string): Promise<ProductRecord | null> {
	return prisma.product.findFirst({
		where: { id, deletedAt: null },
		include: productInclude,
	});
}

/** Find an active variant by id. */
export async function findVariantById(id: string): Promise<{
	id: string;
	productId: string;
	stock: number;
	price: Prisma.Decimal | null;
	sku: string | null;
} | null> {
	return prisma.productVariant.findFirst({
		where: { id, isActive: true },
		select: { id: true, productId: true, stock: true, price: true, sku: true },
	});
}

/** Product counts per category for a seller's visible catalog listings. */
export async function categoryCountsBySeller(
	sellerId: string,
	visibleWhere: Prisma.ProductWhereInput
): Promise<Map<string, number>> {
	const rows = await prisma.productCategory.groupBy({
		by: ['categoryId'],
		where: {
			product: { ...visibleWhere, sellerId },
			category: { isActive: true, deletedAt: null },
		},
		_count: { productId: true },
	});
	return new Map(rows.map((row) => [row.categoryId, row._count.productId]));
}

/** Brand names with product counts across visible products. */
export async function brandsWithCounts(
	visibleWhere: Prisma.ProductWhereInput
): Promise<{ name: string; count: number }[]> {
	const rows = await prisma.product.groupBy({
		by: ['brand'],
		where: { ...visibleWhere, brand: { not: null } },
		_count: { id: true },
		orderBy: { brand: 'asc' },
	});
	return rows
		.filter((r): r is typeof r & { brand: string } => Boolean(r.brand))
		.map((r) => ({ name: r.brand, count: r._count.id }));
}
