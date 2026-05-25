import { GraphQLError } from 'graphql';
import * as repo from '../repositories/moderationRepository.js';
import * as auditLog from './auditLogService.js';
import type { ModerationQueueFilterType } from '../repositories/moderationRepository.js';

type RawProduct = Awaited<ReturnType<typeof repo.getModerationItem>>;

function buildCategoryPath(product: NonNullable<RawProduct>): string {
	const first = product.categories[0]?.category;
	if (!first) return '';
	const name = first.translations[0]?.name ?? '';
	const parentName = first.parent?.translations[0]?.name ?? '';
	return parentName ? `${parentName} › ${name}` : name;
}

function buildAllCategories(product: NonNullable<RawProduct>): string[] {
	return product.categories.map((pc) => {
		const cat = pc.category;
		const name = cat.translations[0]?.name ?? '';
		const parentName = cat.parent?.translations[0]?.name ?? '';
		return parentName ? `${parentName} › ${name}` : name;
	});
}

function buildSellerName(product: NonNullable<RawProduct>): string {
	const p = product.seller.profile;
	if (!p) return product.seller.id;
	return `${p.firstName} ${p.lastName}`;
}

function buildSellerInitials(product: NonNullable<RawProduct>): string {
	const p = product.seller.profile;
	if (!p) return '??';
	return `${p.firstName[0] ?? ''}${p.lastName[0] ?? ''}`.toUpperCase();
}

export function serializeModerationItem(product: NonNullable<RawProduct>) {
	const enTrans = product.translations.find((t) => t.language === 'EN');
	const ukTrans = product.translations.find((t) => t.language === 'UK');
	const totalStock = product.variants.reduce((s, v) => s + v.stock, 0);

	const sortedMedia = [...product.media].sort((a, b) => {
		if (a.isMain && !b.isMain) return -1;
		if (!a.isMain && b.isMain) return 1;
		return a.sortOrder - b.sortOrder;
	});
	const imageUrls = sortedMedia.filter((m) => m.type === 'IMAGE').map((m) => m.url);
	const imageUrl = imageUrls[0] ?? null;

	return {
		id: product.id,
		slug: product.slug,
		titleEn: enTrans?.title ?? ukTrans?.title ?? product.sku,
		titleUk: ukTrans?.title ?? enTrans?.title ?? product.sku,
		descriptionEn: enTrans?.description ?? ukTrans?.description ?? '',
		descriptionUk: ukTrans?.description ?? enTrans?.description ?? '',
		sku: product.sku,
		brand: product.brand ?? null,
		basePrice: Number(product.basePrice),
		comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
		metaTitleEn: enTrans?.metaTitle ?? null,
		metaTitleUk: ukTrans?.metaTitle ?? null,
		metaDescriptionEn: enTrans?.metaDescription ?? null,
		metaDescriptionUk: ukTrans?.metaDescription ?? null,
		imageUrl,
		galleryUrls: imageUrls,
		status: product.status,
		categoryPath: buildCategoryPath(product),
		allCategories: buildAllCategories(product),
		totalStock,
		photoCount: imageUrls.length,
		variants: product.variants.map((v) => ({
			id: v.id,
			sku: v.sku ?? null,
			options: v.options as Record<string, string>,
			price: v.price ? Number(v.price) : null,
			stock: v.stock,
			isActive: v.isActive,
		})),
		sellerId: product.seller.id,
		sellerName: buildSellerName(product),
		sellerInitials: buildSellerInitials(product),
		sellerAvatarUrl: product.seller.profile?.avatarUrl ?? null,
		submittedAt: product.updatedAt.toISOString(),
	};
}

export async function getModerationQueue({
	filterType = 'PENDING',
	search,
	page = 1,
	pageSize = 20,
}: {
	filterType?: ModerationQueueFilterType;
	search?: string;
	page?: number;
	pageSize?: number;
}) {
	const [queueData, pendingCount, approvedTodayCount, rejectedTodayCount] = await Promise.all([
		repo.getModerationQueue({ filterType, search, page, pageSize }),
		repo.countByStatus('PENDING_MODERATION'),
		repo.countApprovedToday(),
		repo.countRejectedToday(),
	]);

	return {
		items: queueData.items.map(serializeModerationItem),
		total: queueData.total,
		pendingCount,
		approvedTodayCount,
		rejectedTodayCount,
	};
}

export async function getModerationItem(id: string) {
	const product = await repo.getModerationItem(id);
	if (!product) {
		throw new GraphQLError('Product not found', { extensions: { code: 'NOT_FOUND' } });
	}
	return serializeModerationItem(product);
}

export async function approveProduct(id: string, moderatorId: string) {
	const existing = await repo.getModerationItem(id);
	if (!existing) {
		throw new GraphQLError('Product not found', { extensions: { code: 'NOT_FOUND' } });
	}
	if (existing.status !== 'PENDING_MODERATION') {
		throw new GraphQLError('Product is not pending moderation', {
			extensions: { code: 'BAD_USER_INPUT' },
		});
	}

	const updated = await repo.setProductStatus(id, 'APPROVED');

	await auditLog.log({
		actorId: moderatorId,
		action: 'PRODUCT_STATUS_CHANGE',
		targetType: 'Product',
		targetId: id,
		metadata: { from: 'PENDING_MODERATION', to: 'APPROVED' },
	});

	return serializeModerationItem(updated);
}

export async function rejectProduct(id: string, moderatorId: string, reason: string) {
	const trimmedReason = reason.trim();
	if (!trimmedReason) {
		throw new GraphQLError('Rejection reason is required', {
			extensions: { code: 'BAD_USER_INPUT' },
		});
	}

	const existing = await repo.getModerationItem(id);
	if (!existing) {
		throw new GraphQLError('Product not found', { extensions: { code: 'NOT_FOUND' } });
	}
	if (existing.status !== 'PENDING_MODERATION') {
		throw new GraphQLError('Product is not pending moderation', {
			extensions: { code: 'BAD_USER_INPUT' },
		});
	}

	const updated = await repo.setProductStatus(id, 'REJECTED');

	await auditLog.log({
		actorId: moderatorId,
		action: 'PRODUCT_STATUS_CHANGE',
		targetType: 'Product',
		targetId: id,
		metadata: { from: 'PENDING_MODERATION', to: 'REJECTED', reason: trimmedReason },
	});

	return serializeModerationItem(updated);
}

export async function bulkApproveProducts(ids: string[], moderatorId: string) {
	if (ids.length === 0) return { approved: 0, failed: 0 };

	// Update all eligible items in one query
	const result = await repo.setProductsStatus(ids, 'APPROVED');
	const approved = result.count;
	const failed = ids.length - approved;

	// Single audit log entry for the bulk action
	await auditLog.log({
		actorId: moderatorId,
		action: 'PRODUCT_STATUS_CHANGE',
		targetType: 'Product',
		targetId: ids.join(','),
		metadata: { from: 'PENDING_MODERATION', to: 'APPROVED', bulk: true, count: approved },
	});

	return { approved, failed };
}
