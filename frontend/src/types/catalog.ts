/** Mirrors the backend catalog GraphQL schema. */

export type CatalogLanguage = 'EN' | 'UK';

export type ProductSort = 'NEWEST' | 'POPULARITY' | 'PRICE_ASC' | 'PRICE_DESC' | 'RATING';

export interface CategoryNode {
	id: string;
	slug: string;
	parentId: string | null;
	name: string;
	description: string | null;
	productCount: number;
	children: CategoryNode[];
}

export interface ProductMedia {
	id: string;
	url: string;
	type: string;
	isMain: boolean;
	sortOrder: number;
}

export interface CatalogProductVariant {
	id: string;
	sku: string | null;
	options: Record<string, unknown>;
	price: number | null;
	stock: number;
	isActive: boolean;
}

export interface ProductCategoryRef {
	id: string;
	slug: string;
	name: string;
}

export interface ProductSellerRef {
	id: string;
	name: string;
}

export interface CatalogProduct {
	id: string;
	slug: string;
	sku: string;
	brand: string | null;
	basePrice: number;
	status: string;
	isAvailable: boolean;
	title: string;
	description: string;
	metaTitle: string | null;
	metaDescription: string | null;
	media: ProductMedia[];
	mainImage: string | null;
	variants: CatalogProductVariant[];
	categories: ProductCategoryRef[];
	seller: ProductSellerRef;
	rating: number;
	reviewCount: number;
	totalStock: number;
	createdAt: string;
}

export interface ProductListResult {
	items: CatalogProduct[];
	total: number;
	page: number;
	pageSize: number;
}

export interface ProductFilterInput {
	search?: string;
	categorySlug?: string;
	brands?: string[];
	minPrice?: number;
	maxPrice?: number;
	minRating?: number;
	inStockOnly?: boolean;
	sellerId?: string;
}
