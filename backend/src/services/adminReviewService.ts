import { GraphQLError } from 'graphql';
import * as repo from '../repositories/adminReviewRepository.js';
import * as auditLog from './auditLogService.js';
import { Role } from '../constants/enums.js';

export type AdminReviewStatus = 'PENDING' | 'APPROVED' | 'BLOCKED';

const STAFF_ROLES: Role[] = [Role.MODERATOR, Role.ADMIN];
const ADMIN_REVIEW_STATUSES: AdminReviewStatus[] = ['PENDING', 'APPROVED', 'BLOCKED'];

function assertStaffRole(actorRole: Role) {
	if (!STAFF_ROLES.includes(actorRole)) {
		throw new GraphQLError('Staff access required', { extensions: { code: 'FORBIDDEN' } });
	}
}

function assertAdminRole(actorRole: Role) {
	if (actorRole !== Role.ADMIN) {
		throw new GraphQLError('Administrator access required', { extensions: { code: 'FORBIDDEN' } });
	}
}

function buildReviewerName(review: repo.RawAdminReview): string {
	const p = review.reviewer.profile;
	if (!p) return review.reviewer.email;
	return `${p.firstName} ${p.lastName}`.trim();
}

function buildReviewRef(id: string): string {
	return `#RV-${id.slice(-4).toUpperCase()}`;
}

function computeStatus(review: repo.RawAdminReview): string {
	if (review.deletedAt) return 'DELETED';
	if (review.isBlocked) return 'BLOCKED';
	if (review.isApproved) return 'APPROVED';
	return 'PENDING';
}

function statusToFlags(status: AdminReviewStatus) {
	if (status === 'APPROVED') return { isApproved: true, isBlocked: false };
	if (status === 'BLOCKED') return { isApproved: false, isBlocked: true };
	return { isApproved: false, isBlocked: false };
}

export function serializeAdminReview(review: repo.RawAdminReview) {
	const productTitle = review.product.translations[0]?.title ?? review.product.sku;
	const complaint = review.complaints[0];

	return {
		id: review.id,
		reviewRef: buildReviewRef(review.id),
		rating: Number(review.rating),
		text: review.text ?? null,
		reviewerId: review.reviewer.id,
		reviewerName: buildReviewerName(review),
		reviewerEmail: review.reviewer.email,
		reviewerAvatarUrl: review.reviewer.profile?.avatarUrl ?? null,
		productId: review.product.id,
		productTitle,
		productSlug: review.product.slug,
		productSku: review.product.sku,
		productImageUrl: review.product.media[0]?.url ?? null,
		status: computeStatus(review),
		isFlagged: review.complaints.length > 0,
		flagReason: complaint?.reason ?? null,
		orderId: review.orderId ?? null,
		createdAt: review.createdAt.toISOString(),
		updatedAt: review.updatedAt.toISOString(),
		isDeleted: review.deletedAt !== null,
	};
}

export async function getAdminReviewStats() {
	return repo.getAdminReviewStats();
}

export async function getAllReviews(input: {
	statusFilter?: repo.AdminReviewStatusFilter;
	ratingFilter?: string;
	search?: string;
	page?: number;
	pageSize?: number;
}) {
	const [data, tabCounts] = await Promise.all([
		repo.findAllAdminReviews(input),
		repo.getAdminReviewTabCounts(),
	]);

	return {
		items: data.items.map(serializeAdminReview),
		total: data.total,
		page: data.page,
		pageSize: data.pageSize,
		tabCounts,
	};
}

export async function changeAdminReviewStatus(
	actorId: string,
	actorRole: Role,
	reviewId: string,
	newStatus: AdminReviewStatus
) {
	assertStaffRole(actorRole);

	if (!ADMIN_REVIEW_STATUSES.includes(newStatus)) {
		throw new GraphQLError('Invalid review status', { extensions: { code: 'BAD_USER_INPUT' } });
	}

	const target = await repo.findAdminReviewById(reviewId);
	if (!target || target.deletedAt) {
		throw new GraphQLError('Review not found', { extensions: { code: 'NOT_FOUND' } });
	}

	const updated = await repo.updateAdminReviewStatus(reviewId, statusToFlags(newStatus));

	await auditLog.log({
		actorId,
		action: 'REVIEW_DELETED',
		targetType: 'ProductReview',
		targetId: reviewId,
		metadata: { from: computeStatus(target), to: newStatus, source: 'ADMIN_REVIEWS' },
	});

	return serializeAdminReview(updated);
}

export async function adminDeleteReview(actorId: string, actorRole: Role, reviewId: string) {
	assertAdminRole(actorRole);

	const target = await repo.findAdminReviewById(reviewId);
	if (!target || target.deletedAt) {
		throw new GraphQLError('Review not found', { extensions: { code: 'NOT_FOUND' } });
	}

	await repo.softDeleteAdminReviewRecord(reviewId);

	await auditLog.log({
		actorId,
		action: 'REVIEW_DELETED',
		targetType: 'ProductReview',
		targetId: reviewId,
		metadata: { action: 'SOFT_DELETE', source: 'ADMIN_REVIEWS' },
	});

	return true;
}
