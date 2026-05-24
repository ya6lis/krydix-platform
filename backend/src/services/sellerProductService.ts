import { GraphQLError } from 'graphql';
import { v2 as cloudinary } from 'cloudinary';
import { ProductStatus } from '@prisma/client';
import { env } from '../config/env.js';
import * as repo from '../repositories/sellerProductRepository.js';
import * as categoryRepo from '../repositories/categoryRepository.js';
import type {
	CreateProductInput,
	UpdateProductInput,
	UploadMediaInput,
} from '../validators/sellerProductValidators.js';

if (env.CLOUDINARY_CLOUD_NAME) {
	cloudinary.config({
		cloud_name: env.CLOUDINARY_CLOUD_NAME,
		api_key: env.CLOUDINARY_API_KEY,
		api_secret: env.CLOUDINARY_API_SECRET,
	});
}

function mapProduct(p: repo.SellerProductRecord) {
	const enT = p.translations.find((t) => t.language === 'EN');
	const ukT = p.translations.find((t) => t.language === 'UK');
	return {
		id: p.id,
		slug: p.slug,
		sku: p.sku,
		brand: p.brand ?? null,
		basePrice: Number(p.basePrice),
		comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
		status: p.status,
		isAvailable: p.isAvailable,
		createdAt: p.createdAt.toISOString(),
		updatedAt: p.updatedAt.toISOString(),
		titleEn: enT?.title ?? '',
		titleUk: ukT?.title ?? '',
		descriptionEn: enT?.description ?? '',
		descriptionUk: ukT?.description ?? '',
		metaTitleEn: enT?.metaTitle ?? null,
		metaTitleUk: ukT?.metaTitle ?? null,
		metaDescriptionEn: enT?.metaDescription ?? null,
		metaDescriptionUk: ukT?.metaDescription ?? null,
		categories: p.categories.map((pc) => ({
			id: pc.category.id,
			slug: pc.category.slug,
			nameEn: pc.category.translations.find((t) => t.language === 'EN')?.name ?? '',
			nameUk: pc.category.translations.find((t) => t.language === 'UK')?.name ?? '',
		})),
		variants: p.variants.map((v) => ({
			id: v.id,
			sku: v.sku ?? null,
			options: v.options as Record<string, string>,
			price: v.price ? Number(v.price) : null,
			stock: v.stock,
			isActive: v.isActive,
		})),
		media: p.media.map((m) => ({
			id: m.id,
			url: m.url,
			publicId: m.publicId,
			type: m.type,
			isMain: m.isMain,
			sortOrder: m.sortOrder,
		})),
	};
}

export async function getMyProduct(id: string, sellerId: string) {
	const product = await repo.findSellerProductById(id, sellerId);
	if (!product) {
		throw new GraphQLError('Product not found', { extensions: { code: 'NOT_FOUND' } });
	}
	return mapProduct(product);
}

async function validateCategories(categoryIds: string[]) {
	const categories = await categoryRepo.findAllCategories();
	const validIds = new Set(categories.map((c) => c.id));
	for (const id of categoryIds) {
		if (!validIds.has(id)) {
			throw new GraphQLError(`Category ${id} not found`, { extensions: { code: 'NOT_FOUND' } });
		}
	}
}

export async function createProduct(sellerId: string, input: CreateProductInput) {
	const slugTaken = await repo.slugExists(input.slug);
	if (slugTaken) {
		throw new GraphQLError('Slug already taken', { extensions: { code: 'SLUG_TAKEN' } });
	}

	await validateCategories(input.categoryIds);

	const product = await repo.createProduct({
		sellerId,
		slug: input.slug,
		sku: input.sku,
		brand: input.brand,
		basePrice: input.basePrice,
		comparePrice: input.comparePrice,
		categoryIds: input.categoryIds,
		translations: [
			{
				language: 'EN',
				title: input.titleEn,
				description: input.descriptionEn,
				metaTitle: input.metaTitleEn,
				metaDescription: input.metaDescriptionEn,
			},
			{
				language: 'UK',
				title: input.titleUk,
				description: input.descriptionUk,
				metaTitle: input.metaTitleUk,
				metaDescription: input.metaDescriptionUk,
			},
		],
		variants: input.variants,
	});

	return mapProduct(product);
}

export async function updateProduct(id: string, sellerId: string, input: UpdateProductInput) {
	const existing = await repo.findSellerProductById(id, sellerId);
	if (!existing) {
		throw new GraphQLError('Product not found', { extensions: { code: 'NOT_FOUND' } });
	}

	if (input.slug && input.slug !== existing.slug) {
		const slugTaken = await repo.slugExists(input.slug, id);
		if (slugTaken) {
			throw new GraphQLError('Slug already taken', { extensions: { code: 'SLUG_TAKEN' } });
		}
	}

	if (input.categoryIds) {
		await validateCategories(input.categoryIds);
	}

	const translations: repo.UpdateProductData['translations'] = [];
	if (input.titleEn !== undefined || input.descriptionEn !== undefined) {
		const enT = existing.translations.find((t) => t.language === 'EN');
		translations.push({
			language: 'EN',
			title: input.titleEn ?? enT?.title ?? '',
			description: input.descriptionEn ?? enT?.description ?? '',
			metaTitle: input.metaTitleEn ?? enT?.metaTitle ?? null,
			metaDescription: input.metaDescriptionEn ?? enT?.metaDescription ?? null,
		});
	}
	if (input.titleUk !== undefined || input.descriptionUk !== undefined) {
		const ukT = existing.translations.find((t) => t.language === 'UK');
		translations.push({
			language: 'UK',
			title: input.titleUk ?? ukT?.title ?? '',
			description: input.descriptionUk ?? ukT?.description ?? '',
			metaTitle: input.metaTitleUk ?? ukT?.metaTitle ?? null,
			metaDescription: input.metaDescriptionUk ?? ukT?.metaDescription ?? null,
		});
	}

	const updated = await repo.updateProduct(id, {
		slug: input.slug,
		sku: input.sku,
		brand: input.brand,
		basePrice: input.basePrice,
		comparePrice: input.comparePrice,
		isAvailable: input.isAvailable,
		status: ProductStatus.PENDING_MODERATION,
		categoryIds: input.categoryIds,
		translations: translations.length > 0 ? translations : undefined,
		variants: input.variants,
	});

	return mapProduct(updated);
}

export async function uploadProductMedia(sellerId: string, input: UploadMediaInput) {
	const product = await repo.findSellerProductById(input.productId, sellerId);
	if (!product) {
		throw new GraphQLError('Product not found', { extensions: { code: 'NOT_FOUND' } });
	}

	const existingImages = product.media.filter((m) => m.type === 'IMAGE');
	if (input.mediaType === 'IMAGE' && existingImages.length >= 9) {
		throw new GraphQLError('Maximum 9 images allowed (1 main + 8 gallery)', {
			extensions: { code: 'MEDIA_LIMIT_EXCEEDED' },
		});
	}

	let url: string;
	let publicId: string;

	if (env.CLOUDINARY_CLOUD_NAME) {
		const result = await cloudinary.uploader.upload(input.dataUrl, {
			folder: 'krydix/products',
			resource_type: input.mediaType === 'VIDEO' ? 'video' : 'image',
		});
		url = result.secure_url;
		publicId = result.public_id;
	} else {
		// Dev fallback: store data URL directly (no Cloudinary configured)
		url = input.dataUrl;
		publicId = `local_${Date.now()}`;
	}

	const isMain = input.isMain || existingImages.length === 0;

	const media = await repo.addProductMedia({
		productId: input.productId,
		url,
		publicId,
		type: input.mediaType as 'IMAGE' | 'VIDEO',
		isMain,
	});

	return {
		id: media.id,
		url: media.url,
		publicId: media.publicId,
		type: media.type,
		isMain: media.isMain,
		sortOrder: media.sortOrder,
	};
}

export async function deleteProductMedia(mediaId: string, sellerId: string) {
	const media = await repo.findMediaById(mediaId);
	if (!media) {
		throw new GraphQLError('Media not found', { extensions: { code: 'NOT_FOUND' } });
	}

	const product = await repo.findSellerProductById(media.productId, sellerId);
	if (!product) {
		throw new GraphQLError('Not authorized', { extensions: { code: 'FORBIDDEN' } });
	}

	if (env.CLOUDINARY_CLOUD_NAME && !media.publicId.startsWith('local_')) {
		await cloudinary.uploader.destroy(media.publicId, {
			resource_type: media.type === 'VIDEO' ? 'video' : 'image',
		});
	}

	await repo.deleteMediaById(mediaId);
	return true;
}
