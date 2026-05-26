import { z } from 'zod';
import { Language } from '../constants/enums.js';

const slugSchema = z
	.string()
	.min(1)
	.max(120)
	.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens');

export const CreateCategorySchema = z.object({
	slug: slugSchema,
	parentId: z.string().cuid().nullable().optional(),
	icon: z.string().max(64).nullable().optional(),
	isActive: z.boolean().optional(),
	nameEn: z.string().min(1).max(200),
	nameUk: z.string().max(200).nullable().optional(),
	descriptionEn: z.string().max(2000).nullable().optional(),
	descriptionUk: z.string().max(2000).nullable().optional(),
	metaTitleEn: z.string().max(200).nullable().optional(),
	metaTitleUk: z.string().max(200).nullable().optional(),
	metaDescriptionEn: z.string().max(500).nullable().optional(),
	metaDescriptionUk: z.string().max(500).nullable().optional(),
});

export const UpdateCategorySchema = z.object({
	slug: slugSchema.optional(),
	parentId: z.string().cuid().nullable().optional(),
	icon: z.string().max(64).nullable().optional(),
	isActive: z.boolean().optional(),
	nameEn: z.string().min(1).max(200).optional(),
	nameUk: z.string().max(200).nullable().optional(),
	descriptionEn: z.string().max(2000).nullable().optional(),
	descriptionUk: z.string().max(2000).nullable().optional(),
	metaTitleEn: z.string().max(200).nullable().optional(),
	metaTitleUk: z.string().max(200).nullable().optional(),
	metaDescriptionEn: z.string().max(500).nullable().optional(),
	metaDescriptionUk: z.string().max(500).nullable().optional(),
});

export const MoveCategorySchema = z.object({
	id: z.string().cuid(),
	parentId: z.string().cuid().nullable(),
	sortOrder: z.number().int().min(0),
});

export const UpdateCategoryTranslationSchema = z.object({
	categoryId: z.string().cuid(),
	language: z.nativeEnum(Language),
	name: z.string().min(1).max(200),
	description: z.string().max(2000).nullable().optional(),
	metaTitle: z.string().max(200).nullable().optional(),
	metaDescription: z.string().max(500).nullable().optional(),
});

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
export type MoveCategoryInput = z.infer<typeof MoveCategorySchema>;
export type UpdateCategoryTranslationInput = z.infer<typeof UpdateCategoryTranslationSchema>;
