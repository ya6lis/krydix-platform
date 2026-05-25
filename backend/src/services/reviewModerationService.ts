import { GraphQLError } from 'graphql';
import * as repo from '../repositories/reviewModerationRepository.js';
import * as auditLog from './auditLogService.js';
import { Role } from '../constants/enums.js';

type RawReview = repo.RawModerationReview;

function parsePhotos(raw: unknown): string[] {
	if (!raw || !Array.isArray(raw)) return [];
	return (raw as { url?: string }[]).map((p) => p.url).filter(Boolean) as string[];
}

function buildReviewerName(review: RawReview): string {
	const p = review.reviewer.profile;
	if (!p) return 'Anonymous';
	return `${p.firstName} ${p.lastName}`;
}

function buildReviewerInitials(review: RawReview): string {
	const p = review.reviewer.profile;
	if (!p) return '??';
	return `${p.firstName[0] ?? ''}${p.lastName[0] ?? ''}`.toUpperCase();
}

export async function serializeModerationReview(review: RawReview) {
	const reviewerReviewCount = await repo.countReviewerApprovedReviews(review.reviewerId);
	const complaint = review.complaints[0];
	const productTitle = review.product.translations[0]?.title ?? review.product.sku;

	return {
		id: review.id,
		reviewType: 'PRODUCT' as const,
		rating: Number(review.rating),
		text: review.text ?? null,
		photos: parsePhotos(review.photos),
		isApproved: review.isApproved,
		isBlocked: review.isBlocked,
		isFlagged: review.complaints.length > 0,
		flagReason: complaint?.reason ?? null,
		reviewerName: buildReviewerName(review),
		reviewerInitials: buildReviewerInitials(review),
		reviewerAvatarUrl: review.reviewer.profile?.avatarUrl ?? null,
		reviewerReviewCount,
		targetTitle: productTitle,
		targetRef: review.product.sku,
		targetImageUrl: review.product.media[0]?.url ?? null,
		targetSlug: review.product.slug,
		orderId: review.orderId ?? null,
		submittedAt: review.createdAt.toISOString(),
	};
}

export async function getModerationReviews(input: {
	tab?: repo.ModerationReviewTab;
	search?: string;
	ratingFilter?: string;
	target?: repo.ModerationReviewTarget;
	page?: number;
	pageSize?: number;
}) {
	const [data, counts] = await Promise.all([
		repo.findModerationReviews(input),
		repo.countModerationReviewsByTab(),
	]);

	const items = await Promise.all(data.items.map(serializeModerationReview));

	return {
		items,
		total: data.total,
		page: data.page,
		pageSize: data.pageSize,
		pendingCount: counts.pending,
		flaggedCount: counts.flagged,
		approvedCount: counts.approved,
		hiddenCount: counts.hidden,
	};
}

export async function approveReview(reviewId: string, moderatorId: string) {
	const existing = await repo.findModerationReviewById(reviewId);
	if (!existing || existing.deletedAt) {
		throw new GraphQLError('Review not found', { extensions: { code: 'NOT_FOUND' } });
	}

	const updated = await repo.approveReviewRecord(reviewId);

	await auditLog.log({
		actorId: moderatorId,
		action: 'REVIEW_DELETED',
		targetType: 'ProductReview',
		targetId: reviewId,
		metadata: { action: 'APPROVED' },
	});

	return serializeModerationReview(updated);
}

export async function hideReview(reviewId: string, moderatorId: string) {
	const existing = await repo.findModerationReviewById(reviewId);
	if (!existing || existing.deletedAt) {
		throw new GraphQLError('Review not found', { extensions: { code: 'NOT_FOUND' } });
	}

	const updated = await repo.hideReviewRecord(reviewId);

	await auditLog.log({
		actorId: moderatorId,
		action: 'REVIEW_DELETED',
		targetType: 'ProductReview',
		targetId: reviewId,
		metadata: { action: 'HIDDEN' },
	});

	return serializeModerationReview(updated);
}

export async function deleteReview(reviewId: string, actorId: string, actorRole: Role) {
	if (actorRole !== Role.ADMIN) {
		throw new GraphQLError('Administrator access required', { extensions: { code: 'FORBIDDEN' } });
	}

	const existing = await repo.findModerationReviewById(reviewId);
	if (!existing || existing.deletedAt) {
		throw new GraphQLError('Review not found', { extensions: { code: 'NOT_FOUND' } });
	}

	await repo.softDeleteReviewRecord(reviewId);

	await auditLog.log({
		actorId,
		action: 'REVIEW_DELETED',
		targetType: 'ProductReview',
		targetId: reviewId,
		metadata: { action: 'DELETED' },
	});

	return true;
}
