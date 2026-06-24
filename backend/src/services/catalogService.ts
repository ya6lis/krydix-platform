import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import * as categoryRepo from '../repositories/categoryRepository.js';
import * as productRepo from '../repositories/productRepository.js';
import { Language, ProductSort, ProductStatus } from '../constants/enums.js';
import type { ProductQueryInput } from '../validators/catalogValidators.js';

/** Products visible in the public catalog. */
const VISIBLE_STATUSES: ProductStatus[] = [ProductStatus.APPROVED, ProductStatus.ENABLED];
const VISIBLE_PRODUCT_WHERE: Prisma.ProductWhereInput = {
	deletedAt: null,
	status: { in: VISIBLE_STATUSES },
};

interface TranslationLike {
	language: string;
	name?: string;
	title?: string;
	description?: string | null;
	metaTitle?: string | null;
	metaDescription?: string | null;
}

/** Picks the translation for `language`, falling back to EN then the first available. */
function pickTranslation<T extends TranslationLike>(
	translations: T[],
	language: Language
): T | undefined {
	return (
		translations.find((t) => t.language === language) ??
		translations.find((t) => t.language === Language.EN) ??
		translations[0]
	);
}

// ─── Categories ───────────────────────────────────────────────────────────────

export interface CategoryNode {
	id: string;
	slug: string;
	parentId: string | null;
	name: string;
	description: string | null;
	productCount: number;
	children: CategoryNode[];
}

function mapCategory(
	cat: categoryRepo.CategoryRecord,
	language: Language,
	productCount?: number
): Omit<CategoryNode, 'children'> {
	const tr = pickTranslation(cat.translations, language);
	return {
		id: cat.id,
		slug: cat.slug,
		parentId: cat.parentId,
		name: tr?.name ?? cat.slug,
		description: tr?.description ?? null,
		productCount: productCount ?? cat._count.products,
	};
}

function pruneSellerCategories(nodes: CategoryNode[]): CategoryNode[] {
	return nodes
		.map((node) => ({ ...node, children: pruneSellerCategories(node.children) }))
		.filter((node) => node.productCount > 0 || node.children.length > 0);
}

/** Returns the full category tree (roots with nested children). */
export async function getCategories(
	language: Language = Language.EN,
	sellerId?: string
): Promise<CategoryNode[]> {
	const flat = await categoryRepo.findAllCategories();
	const sellerCounts = sellerId
		? await productRepo.categoryCountsBySeller(sellerId, VISIBLE_PRODUCT_WHERE)
		: null;

	const nodes = new Map<string, CategoryNode>();
	for (const cat of flat) {
		const count = sellerCounts?.get(cat.id);
		nodes.set(cat.id, {
			...mapCategory(cat, language, count),
			children: [],
		});
	}
	const roots: CategoryNode[] = [];
	for (const node of nodes.values()) {
		if (node.parentId && nodes.has(node.parentId)) {
			nodes.get(node.parentId)!.children.push(node);
		} else {
			roots.push(node);
		}
	}
	return sellerId ? pruneSellerCategories(roots) : roots;
}

export async function getCategoryBySlug(
	slug: string,
	language: Language = Language.EN
): Promise<CategoryNode | null> {
	const cat = await categoryRepo.findCategoryBySlug(slug);
	if (!cat) return null;
	return { ...mapCategory(cat, language), children: [] };
}

// ─── Products ─────────────────────────────────────────────────────────────────

export interface CatalogProduct {
	id: string;
	slug: string;
	sku: string;
	brand: string | null;
	basePrice: number;
	comparePrice: number | null;
	status: string;
	isAvailable: boolean;
	title: string;
	description: string;
	metaTitle: string | null;
	metaDescription: string | null;
	media: { id: string; url: string; type: string; isMain: boolean; sortOrder: number }[];
	mainImage: string | null;
	variants: {
		id: string;
		sku: string | null;
		options: Prisma.JsonValue;
		price: number | null;
		stock: number;
		isActive: boolean;
	}[];
	categories: { id: string; slug: string; name: string }[];
	seller: { id: string; name: string };
	rating: number;
	reviewCount: number;
	totalStock: number;
	createdAt: string;
}

function mapProduct(
	product: productRepo.ProductRecord,
	language: Language,
	rating: { avg: number; count: number }
): CatalogProduct {
	const tr = pickTranslation(product.translations, language);
	const media = product.media.map((m) => ({
		id: m.id,
		url: m.url,
		type: m.type,
		isMain: m.isMain,
		sortOrder: m.sortOrder,
	}));
	return {
		id: product.id,
		slug: product.slug,
		sku: product.sku,
		brand: product.brand,
		basePrice: Number(product.basePrice),
		comparePrice: product.comparePrice !== null ? Number(product.comparePrice) : null,
		status: product.status,
		isAvailable: product.isAvailable,
		title: tr?.title ?? product.slug,
		description: tr?.description ?? '',
		metaTitle: tr?.metaTitle ?? null,
		metaDescription: tr?.metaDescription ?? null,
		media,
		mainImage: media.find((m) => m.isMain)?.url ?? media[0]?.url ?? null,
		variants: product.variants.map((v) => ({
			id: v.id,
			sku: v.sku,
			options: v.options,
			price: v.price === null ? null : Number(v.price),
			stock: v.stock,
			isActive: v.isActive,
		})),
		categories: product.categories.map((pc) => {
			const cTr = pickTranslation(pc.category.translations, language);
			return { id: pc.category.id, slug: pc.category.slug, name: cTr?.name ?? pc.category.slug };
		}),
		seller: {
			id: product.seller.id,
			name: product.seller.profile
				? `${product.seller.profile.firstName} ${product.seller.profile.lastName}`.trim()
				: product.seller.email,
		},
		rating: rating.avg,
		reviewCount: rating.count,
		totalStock: product.variants.reduce((sum, v) => sum + v.stock, 0),
		createdAt: product.createdAt.toISOString(),
	};
}

function buildOrderBy(sort: ProductSort): Prisma.ProductOrderByWithRelationInput {
	switch (sort) {
		case ProductSort.PRICE_ASC:
			return { basePrice: 'asc' };
		case ProductSort.PRICE_DESC:
			return { basePrice: 'desc' };
		case ProductSort.POPULARITY:
		case ProductSort.RATING:
			return { reviews: { _count: 'desc' } };
		case ProductSort.NEWEST:
		default:
			return { createdAt: 'desc' };
	}
}

async function buildWhere(filter: ProductQueryInput['filter']): Promise<Prisma.ProductWhereInput> {
	const where: Prisma.ProductWhereInput = { ...VISIBLE_PRODUCT_WHERE };
	if (!filter) return where;

	const and: Prisma.ProductWhereInput[] = [];

	if (filter.search) {
		const q = filter.search;
		and.push({
			OR: [
				{ sku: { contains: q, mode: 'insensitive' } },
				{ brand: { contains: q, mode: 'insensitive' } },
				{ translations: { some: { title: { contains: q, mode: 'insensitive' } } } },
				{ translations: { some: { description: { contains: q, mode: 'insensitive' } } } },
			],
		});
	}
	if (filter.categorySlug) {
		and.push({ categories: { some: { category: { slug: filter.categorySlug } } } });
	}
	if (filter.brands && filter.brands.length > 0) {
		and.push({ brand: { in: filter.brands } });
	}
	if (filter.minPrice !== undefined) and.push({ basePrice: { gte: filter.minPrice } });
	if (filter.maxPrice !== undefined) and.push({ basePrice: { lte: filter.maxPrice } });
	if (filter.inStockOnly) and.push({ isAvailable: true });
	if (filter.sellerId) and.push({ sellerId: filter.sellerId });

	if (filter.minRating !== undefined) {
		const rated = await prisma.productReview.groupBy({
			by: ['productId'],
			where: { isApproved: true, isBlocked: false, deletedAt: null },
			_avg: { rating: true },
			having: { rating: { _avg: { gte: filter.minRating } } },
		});
		and.push({ id: { in: rated.map((r) => r.productId) } });
	}

	if (and.length > 0) where.AND = and;
	return where;
}

export interface ProductList {
	items: CatalogProduct[];
	total: number;
	page: number;
	pageSize: number;
}

export async function getProducts(
	input: ProductQueryInput,
	language: Language = Language.EN
): Promise<ProductList> {
	const where = await buildWhere(input.filter);
	const orderBy = buildOrderBy(input.sort);
	const skip = (input.page - 1) * input.pageSize;

	const [products, total] = await Promise.all([
		productRepo.findProducts(where, orderBy, skip, input.pageSize),
		productRepo.countProducts(where),
	]);

	const ratings = await productRepo.ratingsByProductIds(products.map((p) => p.id));
	const ratingMap = new Map(
		ratings.map((r) => [r.productId, { avg: Number(r._avg.rating ?? 0), count: r._count._all }])
	);

	return {
		items: products.map((p) =>
			mapProduct(p, language, ratingMap.get(p.id) ?? { avg: 0, count: 0 })
		),
		total,
		page: input.page,
		pageSize: input.pageSize,
	};
}

export async function getProductBySlug(
	slug: string,
	language: Language = Language.EN
): Promise<CatalogProduct | null> {
	const product = await productRepo.findProductBySlug(slug);
	if (!product) return null;
	if (product.deletedAt || !VISIBLE_STATUSES.includes(product.status as ProductStatus)) {
		return null;
	}
	const ratings = await productRepo.ratingsByProductIds([product.id]);
	const rating = ratings[0]
		? { avg: Number(ratings[0]._avg.rating ?? 0), count: ratings[0]._count._all }
		: { avg: 0, count: 0 };
	return mapProduct(product, language, rating);
}

/** Distinct brand names across the visible catalog. */
export async function getProductBrands(): Promise<string[]> {
	return productRepo.distinctBrands(VISIBLE_PRODUCT_WHERE);
}

/** Brand names with product counts across the visible catalog. */
export async function getProductBrandsWithCounts(
	sellerId?: string
): Promise<{ name: string; count: number }[]> {
	const where: Prisma.ProductWhereInput = sellerId
		? { ...VISIBLE_PRODUCT_WHERE, sellerId }
		: VISIBLE_PRODUCT_WHERE;
	return productRepo.brandsWithCounts(where);
}
