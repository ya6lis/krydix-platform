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
	categoryIds: z.array(z.string().min(1)).min(1, 'At least one category required'),
	variants: z.array(VariantInputSchema).optional(),
	metaTitleEn: z.string().max(200).optional().nullable(),
	metaTitleUk: z.string().max(200).optional().nullable(),
	metaDescriptionEn: z.string().max(500).optional().nullable(),
	metaDescriptionUk: z.string().max(500).optional().nullable(),
});

export const UpdateProductSchema = CreateProductSchema.partial().extend({
	isAvailable: z.boolean().optional(),
});

export const UploadMediaSchema = z.object({
	productId: z.string().min(1),
	dataUrl: z.string().min(1),
	isMain: z.boolean().optional().default(false),
	mediaType: z.enum(['IMAGE', 'VIDEO']).optional().default('IMAGE'),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type UploadMediaInput = z.infer<typeof UploadMediaSchema>;
