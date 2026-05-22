import { z } from 'zod';
import { ProductSort } from '../constants/enums.js';
import { PAGINATION_DEFAULT_PAGE, PAGINATION_DEFAULT_LIMIT } from '../constants/constants.js';

export const ProductFilterSchema = z.object({
	search: z.string().trim().max(200).optional(),
	categorySlug: z.string().trim().max(200).optional(),
	brands: z.array(z.string().trim().max(120)).max(50).optional(),
	minPrice: z.number().nonnegative().optional(),
	maxPrice: z.number().nonnegative().optional(),
	minRating: z.number().min(1).max(5).optional(),
	inStockOnly: z.boolean().optional(),
	sellerId: z.string().trim().max(60).optional(),
});

export const ProductQuerySchema = z.object({
	filter: ProductFilterSchema.optional(),
	sort: z.nativeEnum(ProductSort).default(ProductSort.NEWEST),
	page: z.number().int().min(1).default(PAGINATION_DEFAULT_PAGE),
	pageSize: z.number().int().min(1).max(96).default(PAGINATION_DEFAULT_LIMIT),
});

export type ProductFilterInput = z.infer<typeof ProductFilterSchema>;
export type ProductQueryInput = z.infer<typeof ProductQuerySchema>;
