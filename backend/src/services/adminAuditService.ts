import * as repo from '../repositories/auditLogRepository.js';
import {
	ALL_AUDIT_ACTION_KEYS,
	AuditActionKey,
	type AuditActionKeyValue,
} from '../constants/auditActionKeys.js';
import { deriveAuditActionKey, deriveAuditActionVariant } from '../utils/auditLogHelpers.js';
import type { RawAuditLog } from '../repositories/auditLogRepository.js';

function buildDisplayName(actor: RawAuditLog['actor']): string {
	const profile = actor.profile;
	if (!profile) return actor.email;
	return `${profile.firstName} ${profile.lastName}`.trim();
}

function buildInitials(actor: RawAuditLog['actor']): string {
	const profile = actor.profile;
	if (!profile) return '??';
	return `${profile.firstName[0] ?? ''}${profile.lastName[0] ?? ''}`.toUpperCase();
}

function buildEventRef(id: string): string {
	return `#AL-${id.slice(-4).toUpperCase()}`;
}

function buildProductRef(id: string): string {
	return `#PR-${id.slice(-4).toUpperCase()}`;
}

function buildUserRef(id: string): string {
	return `#US-${id.slice(-4).toUpperCase()}`;
}

function buildReviewRef(id: string): string {
	return `#RV-${id.slice(-4).toUpperCase()}`;
}

function buildVerificationRef(id: string): string {
	return `#VR-${id.slice(-4).toUpperCase()}`;
}

function buildComplaintRef(id: string): string {
	return `#C-${id.slice(-4).toUpperCase()}`;
}

function pickTitle(
	translations: Array<{ language: string; title?: string; name?: string }>
): string {
	const en = translations.find((t) => t.language === 'EN');
	const uk = translations.find((t) => t.language === 'UK');
	return en?.title ?? en?.name ?? uk?.title ?? uk?.name ?? '—';
}

function extractTargetIds(items: RawAuditLog[]): string[] {
	const ids = new Set<string>();
	for (const item of items) {
		for (const part of item.targetId.split(',')) {
			const trimmed = part.trim();
			if (trimmed) ids.add(trimmed);
		}
	}
	return [...ids];
}

function asMeta(metadata: unknown): Record<string, unknown> {
	if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
		return {};
	}
	return metadata as Record<string, unknown>;
}

function buildNote(
	actionKey: AuditActionKeyValue,
	metadata: Record<string, unknown>
): string | null {
	if (typeof metadata.reason === 'string' && metadata.reason.trim()) {
		return metadata.reason.trim();
	}
	if (metadata.bulk === true && typeof metadata.count === 'number') {
		return `Bulk action · ${metadata.count} items`;
	}
	if (actionKey === AuditActionKey.USER_BAN && metadata.reason) {
		return String(metadata.reason);
	}
	return null;
}

type TargetMaps = {
	products: Map<string, Awaited<ReturnType<typeof repo.findProductsByIds>>[number]>;
	users: Map<string, Awaited<ReturnType<typeof repo.findUsersByIds>>[number]>;
	categories: Map<string, Awaited<ReturnType<typeof repo.findCategoriesByIds>>[number]>;
	reviews: Map<string, Awaited<ReturnType<typeof repo.findReviewsByIds>>[number]>;
	applications: Map<string, Awaited<ReturnType<typeof repo.findSellerApplicationsByIds>>[number]>;
	complaints: Map<string, Awaited<ReturnType<typeof repo.findComplaintsByIds>>[number]>;
};

async function loadTargetMaps(items: RawAuditLog[]): Promise<TargetMaps> {
	const productIds = extractTargetIds(items.filter((i) => i.targetType === 'Product'));
	const userIds = extractTargetIds(items.filter((i) => i.targetType === 'User'));
	const categoryIds = extractTargetIds(items.filter((i) => i.targetType === 'Category'));
	const reviewIds = extractTargetIds(items.filter((i) => i.targetType === 'ProductReview'));
	const applicationIds = extractTargetIds(
		items.filter((i) => i.targetType === 'SellerApplication')
	);
	const complaintIds = extractTargetIds(items.filter((i) => i.targetType === 'Complaint'));

	const [products, users, categories, reviews, applications, complaints] = await Promise.all([
		repo.findProductsByIds(productIds),
		repo.findUsersByIds(userIds),
		repo.findCategoriesByIds(categoryIds),
		repo.findReviewsByIds(reviewIds),
		repo.findSellerApplicationsByIds(applicationIds),
		repo.findComplaintsByIds(complaintIds),
	]);

	return {
		products: new Map(products.map((p) => [p.id, p])),
		users: new Map(users.map((u) => [u.id, u])),
		categories: new Map(categories.map((c) => [c.id, c])),
		reviews: new Map(reviews.map((r) => [r.id, r])),
		applications: new Map(applications.map((a) => [a.id, a])),
		complaints: new Map(complaints.map((c) => [c.id, c])),
	};
}

function resolveTarget(
	item: RawAuditLog,
	maps: TargetMaps
): { label: string; path: string | null } {
	const primaryId = item.targetId.split(',')[0]?.trim() ?? item.targetId;

	if (item.targetType === 'Product') {
		const product = maps.products.get(primaryId);
		if (!product) {
			return { label: buildProductRef(primaryId), path: `/admin/products` };
		}
		return {
			label: `${buildProductRef(product.id)} · ${pickTitle(product.translations)}`,
			path: `/catalog/${product.slug}`,
		};
	}

	if (item.targetType === 'User') {
		const user = maps.users.get(primaryId);
		if (!user) {
			return { label: buildUserRef(primaryId), path: `/admin/users` };
		}
		const name = user.profile
			? `${user.profile.firstName} ${user.profile.lastName}`.trim()
			: user.email;
		return {
			label: `${buildUserRef(user.id)} · ${name}`,
			path: `/admin/users`,
		};
	}

	if (item.targetType === 'Category') {
		const category = maps.categories.get(primaryId);
		const meta = asMeta(item.metadata);
		const slug = typeof meta.slug === 'string' ? meta.slug : category?.slug;
		if (!category) {
			return { label: slug ? `/${slug}` : primaryId, path: '/admin/categories' };
		}
		return {
			label: `/${category.slug} · ${pickTitle(category.translations)}`,
			path: '/admin/categories',
		};
	}

	if (item.targetType === 'ProductReview') {
		const review = maps.reviews.get(primaryId);
		const productTitle = review ? pickTitle(review.product.translations) : 'Review';
		return {
			label: `${buildReviewRef(primaryId)} · ${productTitle}`,
			path: review ? `/catalog/${review.product.slug}` : '/admin/reviews',
		};
	}

	if (item.targetType === 'SellerApplication') {
		const application = maps.applications.get(primaryId);
		return {
			label: `${buildVerificationRef(primaryId)} · ${application?.companyName ?? 'Seller application'}`,
			path: '/moderator/verification',
		};
	}

	if (item.targetType === 'Complaint') {
		const complaint = maps.complaints.get(primaryId);
		return {
			label: `${buildComplaintRef(primaryId)} · ${complaint?.reason ?? 'Complaint'}`,
			path: '/moderator/complaints',
		};
	}

	return { label: primaryId, path: null };
}

function buildDescription(actionKey: AuditActionKeyValue): string {
	const descriptions: Record<AuditActionKeyValue, string> = {
		[AuditActionKey.PRODUCT_APPROVE]: 'approved product',
		[AuditActionKey.PRODUCT_REJECT]: 'rejected product',
		[AuditActionKey.PRODUCT_BLOCK]: 'blocked product',
		[AuditActionKey.PRODUCT_UPDATE]: 'updated product status',
		[AuditActionKey.PRODUCT_DELETE]: 'soft-deleted product',
		[AuditActionKey.SELLER_APPROVE]: 'approved seller verification',
		[AuditActionKey.SELLER_REJECT]: 'rejected seller verification',
		[AuditActionKey.SELLER_UPDATE]: 'updated seller verification',
		[AuditActionKey.USER_ROLE_CHANGE]: 'changed user role',
		[AuditActionKey.USER_BAN]: 'blocked user',
		[AuditActionKey.USER_INVITE]: 'invited user',
		[AuditActionKey.USER_DELETE]: 'soft-deleted user',
		[AuditActionKey.REVIEW_APPROVE]: 'approved review',
		[AuditActionKey.REVIEW_BLOCK]: 'blocked review',
		[AuditActionKey.REVIEW_DELETE]: 'deleted review',
		[AuditActionKey.REVIEW_UPDATE]: 'updated review status',
		[AuditActionKey.COMPLAINT_RESOLVE]: 'resolved complaint',
		[AuditActionKey.CATEGORY_CREATE]: 'created category',
		[AuditActionKey.CATEGORY_UPDATE]: 'updated category',
		[AuditActionKey.CATEGORY_DELETE]: 'deleted category',
		[AuditActionKey.CATEGORY_MOVE]: 'moved category',
		[AuditActionKey.CATEGORY_TRANSLATION]: 'updated category translation',
	};
	return descriptions[actionKey];
}

function serializeAuditLog(item: RawAuditLog, maps: TargetMaps) {
	const actionKey = deriveAuditActionKey(item);
	const metadata = asMeta(item.metadata);
	const target = resolveTarget(item, maps);

	return {
		id: item.id,
		eventRef: buildEventRef(item.id),
		actionKey,
		actionVariant: deriveAuditActionVariant(actionKey),
		rawAction: item.action,
		actor: {
			id: item.actor.id,
			displayName: buildDisplayName(item.actor),
			initials: buildInitials(item.actor),
			avatarUrl: item.actor.profile?.avatarUrl ?? null,
			email: item.actor.email,
			role: item.actor.role,
		},
		targetType: item.targetType,
		targetId: item.targetId,
		targetLabel: target.label,
		targetPath: target.path,
		description: buildDescription(actionKey),
		note: buildNote(actionKey, metadata),
		metadata: Object.keys(metadata).length ? metadata : null,
		createdAt: item.createdAt.toISOString(),
	};
}

function buildFilterOptions(rows: Awaited<ReturnType<typeof repo.findAuditLogsForCounts>>) {
	const actionCounts = new Map<AuditActionKeyValue, number>();
	const actorRoleCounts = new Map<string, number>();

	for (const row of rows) {
		const key = deriveAuditActionKey(row);
		actionCounts.set(key, (actionCounts.get(key) ?? 0) + 1);
		actorRoleCounts.set(row.actor.role, (actorRoleCounts.get(row.actor.role) ?? 0) + 1);
	}

	return {
		actionFilterOptions: ALL_AUDIT_ACTION_KEYS.filter(
			(key) => (actionCounts.get(key) ?? 0) > 0
		).map((key) => ({
			key,
			count: actionCounts.get(key) ?? 0,
		})),
		actorRoleFilterOptions: ['ADMIN', 'MODERATOR']
			.filter((role) => (actorRoleCounts.get(role) ?? 0) > 0)
			.map((role) => ({
				role,
				count: actorRoleCounts.get(role) ?? 0,
			})),
	};
}

export async function getAuditLogs(input: {
	actorId?: string;
	actorRoles?: repo.AuditActorRoleFilter[];
	actionKeys?: AuditActionKeyValue[];
	datePreset?: repo.AuditDateRangePreset;
	dateFrom?: string;
	dateTo?: string;
	page?: number;
	pageSize?: number;
}) {
	const page = input.page ?? 1;
	const pageSize = input.pageSize ?? 50;

	const [data, countRows] = await Promise.all([
		repo.findAuditLogs({
			actorId: input.actorId,
			actorRoles: input.actorRoles,
			actionKeys: input.actionKeys,
			datePreset: input.datePreset,
			dateFrom: input.dateFrom,
			dateTo: input.dateTo,
			page,
			pageSize,
		}),
		repo.findAuditLogsForCounts({
			datePreset: input.datePreset,
			dateFrom: input.dateFrom,
			dateTo: input.dateTo,
		}),
	]);

	const targetMaps = await loadTargetMaps(data.items);
	const filterOptions = buildFilterOptions(countRows);

	return {
		items: data.items.map((item) => serializeAuditLog(item, targetMaps)),
		total: data.total,
		page: data.page,
		pageSize: data.pageSize,
		actionFilterOptions: filterOptions.actionFilterOptions,
		actorRoleFilterOptions: filterOptions.actorRoleFilterOptions,
	};
}
