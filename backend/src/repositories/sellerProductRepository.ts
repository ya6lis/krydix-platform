import { Prisma, ProductStatus } from '@prisma/client';
import { prisma } from '../utils/prisma.js';

const sellerProductInclude = {
	translations: true,
	media: { orderBy: { sortOrder: 'asc' as const } },
	variants: { where: { isActive: true } },
	categories: { include: { category: { include: { translations: true } } } },
} satisfies Prisma.ProductInclude;

export type SellerProductRecord = Prisma.ProductGetPayload<{
	include: typeof sellerProductInclude;
}>;

export async function findSellerProducts(
	sellerId: string,
	where: Prisma.ProductWhereInput,
	skip: number,
	take: number
): Promise<SellerProductRecord[]> {
	return prisma.product.findMany({
		where: { sellerId, deletedAt: null, ...where },
		include: sellerProductInclude,
		orderBy: { createdAt: 'desc' },
		skip,
		take,
	});
}

export async function countSellerProducts(
	sellerId: string,
	where: Prisma.ProductWhereInput
): Promise<number> {
	return prisma.product.count({ where: { sellerId, deletedAt: null, ...where } });
}

export async function findSellerProductById(
	id: string,
	sellerId: string
): Promise<SellerProductRecord | null> {
	return prisma.product.findFirst({
		where: { id, sellerId, deletedAt: null },
		include: sellerProductInclude,
	});
}

export async function slugExists(slug: string, excludeId?: string): Promise<boolean> {
	const product = await prisma.product.findFirst({
		where: { slug, deletedAt: null, ...(excludeId ? { id: { not: excludeId } } : {}) },
		select: { id: true },
	});
	return product !== null;
}

export interface CreateProductData {
	sellerId: string;
	slug: string;
	sku: string;
	brand?: string | null;
	basePrice: number;
	comparePrice?: number | null;
	categoryIds: string[];
	translations: Array<{
		language: 'EN' | 'UK';
		title: string;
		description: string;
		metaTitle?: string | null;
		metaDescription?: string | null;
	}>;
	variants?: Array<{
		sku?: string | null;
		options: Record<string, string>;
		price?: number | null;
		stock: number;
	}>;
}

export async function createProduct(data: CreateProductData): Promise<SellerProductRecord> {
	return prisma.product.create({
		data: {
			sellerId: data.sellerId,
			slug: data.slug,
			sku: data.sku,
			brand: data.brand ?? null,
			basePrice: data.basePrice,
			comparePrice: data.comparePrice ?? null,
			status: ProductStatus.DRAFT,
			isAvailable: true,
			translations: {
				create: data.translations,
			},
			categories: {
				create: data.categoryIds.map((categoryId) => ({ categoryId })),
			},
			variants:
				data.variants && data.variants.length > 0
					? {
							create: data.variants.map((v) => ({
								sku: v.sku ?? null,
								options: v.options,
								price: v.price ?? null,
								stock: v.stock,
							})),
						}
					: undefined,
		},
		include: sellerProductInclude,
	});
}

export interface UpdateProductData {
	slug?: string;
	sku?: string;
	brand?: string | null;
	basePrice?: number;
	comparePrice?: number | null;
	isAvailable?: boolean;
	status?: ProductStatus;
	categoryIds?: string[];
	translations?: Array<{
		language: 'EN' | 'UK';
		title: string;
		description: string;
		metaTitle?: string | null;
		metaDescription?: string | null;
	}>;
	variants?: Array<{
		sku?: string | null;
		options: Record<string, string>;
		price?: number | null;
		stock: number;
	}>;
}

export async function updateProduct(
	id: string,
	data: UpdateProductData
): Promise<SellerProductRecord> {
	return prisma.$transaction(async (tx) => {
		if (data.categoryIds !== undefined) {
			await tx.productCategory.deleteMany({ where: { productId: id } });
		}
		if (data.variants !== undefined) {
			await tx.productVariant.updateMany({ where: { productId: id }, data: { isActive: false } });
		}

		return tx.product.update({
			where: { id },
			data: {
				slug: data.slug,
				sku: data.sku,
				brand: data.brand,
				basePrice: data.basePrice,
				comparePrice: data.comparePrice,
				isAvailable: data.isAvailable,
				status: data.status,
				translations:
					data.translations !== undefined
						? {
								upsert: data.translations.map((t) => ({
									where: { productId_language: { productId: id, language: t.language } },
									create: t,
									update: t,
								})),
							}
						: undefined,
				categories:
					data.categoryIds !== undefined
						? { create: data.categoryIds.map((categoryId) => ({ categoryId })) }
						: undefined,
				variants:
					data.variants !== undefined
						? {
								create: data.variants.map((v) => ({
									sku: v.sku ?? null,
									options: v.options,
									price: v.price ?? null,
									stock: v.stock,
								})),
							}
						: undefined,
			},
			include: sellerProductInclude,
		});
	});
}

export interface MediaRecord {
	id: string;
	productId: string;
	url: string;
	publicId: string;
	type: string;
	isMain: boolean;
	sortOrder: number;
	createdAt: Date;
}

export async function addProductMedia(data: {
	productId: string;
	url: string;
	publicId: string;
	type: 'IMAGE' | 'VIDEO';
	isMain: boolean;
}): Promise<MediaRecord> {
	if (data.isMain) {
		await prisma.media.updateMany({
			where: { productId: data.productId, isMain: true },
			data: { isMain: false },
		});
	}
	const count = await prisma.media.count({ where: { productId: data.productId } });
	return prisma.media.create({
		data: {
			productId: data.productId,
			url: data.url,
			publicId: data.publicId,
			type: data.type,
			isMain: data.isMain,
			sortOrder: count,
		},
	});
}

export async function findMediaById(id: string): Promise<MediaRecord | null> {
	return prisma.media.findUnique({ where: { id } });
}

export async function deleteMediaById(id: string): Promise<void> {
	await prisma.media.delete({ where: { id } });
}
