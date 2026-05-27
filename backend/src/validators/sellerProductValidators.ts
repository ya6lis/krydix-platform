import { z } from 'zod';

export const VariantInputSchema = z.object({
	sku: z.string().max(100).optional().nullable(),
	options: z.record(z.string()),
	price: z.number().positive().optional().nullable(),
	stock: z.number().int().min(0).default(0),
});

export const CreateProductSchema = z.object({
	titleEn: z.string().min(1).max(500),
	titleUk: z.string().min(1).max(500),
	descriptionEn: z.string().min(1).max(10000),
	descriptionUk: z.string().min(1).max(10000),
	slug: z
		.string()
		.min(1)
		.max(255)
		.regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
	sku: z.string().min(1).max(100),
	brand: z.string().max(200).optional().nullable(),
	basePrice: z.number().positive(),
	comparePrice: z.number().positive().optional().nullable(),
	isAvailable: z.boolean().optional(),
	submitForReview: z.boolean().optional(),
	categoryIds: z.array(z.string().min(1)).min(1, 'At least one category required'),
	variants: z.array(VariantInputSchema).optional(),
	metaTitleEn: z.string().max(200).optional().nullable(),
	metaTitleUk: z.string().max(200).optional().nullable(),
	metaDescriptionEn: z.string().max(500).optional().nullable(),
	metaDescriptionUk: z.string().max(500).optional().nullable(),
});

export const UpdateProductSchema = CreateProductSchema.partial().extend({
	isAvailable: z.boolean().optional(),
	statusAction: z.enum(['SUBMIT_FOR_REVIEW', 'MAKE_DRAFT']).optional(),
});

export const UploadMediaSchema = z.object({
	productId: z.string().min(1),
	dataUrl: z.string().min(1),
	isMain: z.boolean().optional().default(false),
	mediaType: z.enum(['IMAGE', 'VIDEO']).optional().default('IMAGE'),
});

export const ProductListFilterSchema = z.object({
	status: z.enum(['DRAFT', 'PENDING_MODERATION', 'APPROVED', 'REJECTED', 'ARCHIVED', 'BLOCKED', 'DISABLED', 'ENABLED']).optional(),
	search: z.string().max(200).optional(),
});

export const ProductListPaginationSchema = z.object({
	page: z.number().int().min(1).default(1),
	pageSize: z.number().int().min(1).max(100).default(20),
});

export const ImportPreviewSchema = z.object({
	dataUrl: z.string().min(1),
	fileType: z.enum(['xlsx', 'csv']).default('xlsx'),
	mode: z.enum(['CREATE_ONLY', 'UPDATE_ONLY', 'UPSERT']).default('UPSERT'),
});

export const ImportRowInputSchema = z.object({
	rowIndex: z.number().int().positive().optional(),
	nameEn: z.string().min(1).max(500),
	nameUk: z.string().min(1).max(500),
	descriptionEn: z.string().min(1).max(10000),
	descriptionUk: z.string().min(1).max(10000),
	slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
	sku: z.string().min(1).max(100),
	brand: z.string().max(200).optional().nullable(),
	price: z.number().positive(),
	currency: z.string().min(3).max(3),
	quantity: z.number().int().min(0),
	category: z.string().min(1).max(500),
	status: z.string().min(1).max(50),
	images: z.string().max(5000),
	isActive: z.boolean(),
	discountPrice: z.number().positive().optional().nullable(),
	seoTitle: z.string().max(500).optional().nullable(),
	seoDescription: z.string().max(1000).optional().nullable(),
});

export const ConfirmImportSchema = z.object({
	rows: z.array(ImportRowInputSchema).min(1).max(500),
	mode: z.enum(['CREATE_ONLY', 'UPDATE_ONLY', 'UPSERT']).default('UPSERT'),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type UploadMediaInput = z.infer<typeof UploadMediaSchema>;
export type ProductListFilterInput = z.infer<typeof ProductListFilterSchema>;
export type ProductListPaginationInput = z.infer<typeof ProductListPaginationSchema>;
export type ImportRowInput = z.infer<typeof ImportRowInputSchema>;
export type ConfirmImportInput = z.infer<typeof ConfirmImportSchema>;
