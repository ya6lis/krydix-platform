import { GraphQLError } from 'graphql';
import { v2 as cloudinary } from 'cloudinary';
import type { Prisma } from '@prisma/client';
import { env } from '../config/env.js';
import * as repo from '../repositories/reviewRepository.js';

type ReviewPhoto = { url: string; publicId: string };

function configureCloudinary() {
	if (env.CLOUDINARY_CLOUD_NAME) {
		cloudinary.config({
			cloud_name: env.CLOUDINARY_CLOUD_NAME,
			api_key: env.CLOUDINARY_API_KEY,
			api_secret: env.CLOUDINARY_API_SECRET,
		});
	}
}

async function uploadReviewPhotos(dataUrls: string[]): Promise<ReviewPhoto[]> {
	if (dataUrls.length === 0) return [];
	if (dataUrls.length > 5) {
		throw new GraphQLError('Maximum 5 review photos allowed', {
			extensions: { code: 'BAD_USER_INPUT' },
		});
	}

	configureCloudinary();
	const uploaded: ReviewPhoto[] = [];

	for (const dataUrl of dataUrls) {
		if (env.CLOUDINARY_CLOUD_NAME) {
			const result = await cloudinary.uploader.upload(dataUrl, {
				folder: 'krydix/reviews',
				resource_type: 'image',
			});
			uploaded.push({ url: result.secure_url, publicId: result.public_id });
		} else {
			uploaded.push({ url: dataUrl, publicId: `local_${Date.now()}_${uploaded.length}` });
		}
	}

	return uploaded;
}

function parsePhotos(raw: unknown): string[] {
	if (!raw || !Array.isArray(raw)) return [];
	return (raw as ReviewPhoto[]).map((p) => p.url).filter(Boolean);
}

function buildReviewerName(review: repo.RawProductReview): string {
	const p = review.reviewer.profile;
	if (!p) return 'Anonymous';
	return `${p.firstName} ${p.lastName}`;
}

function buildReviewerInitials(review: repo.RawProductReview): string {
	const p = review.reviewer.profile;
	if (!p) return '??';
	return `${p.firstName[0] ?? ''}${p.lastName[0] ?? ''}`.toUpperCase();
}

export async function serializeReview(review: repo.RawProductReview, viewerId?: string) {
	const reviewerReviewCount = await repo.countReviewerReviews(review.reviewerId);
	return {
		id: review.id,
		productId: review.productId,
		rating: Number(review.rating),
		text: review.text ?? null,
		photos: parsePhotos(review.photos),
		sellerReply: review.sellerReply ?? null,
		isApproved: review.isApproved,
		isOwn: viewerId === review.reviewerId,
		isPending: !review.isApproved && !review.isBlocked,
		reviewerName: buildReviewerName(review),
		reviewerInitials: buildReviewerInitials(review),
		reviewerAvatarUrl: review.reviewer.profile?.avatarUrl ?? null,
		reviewerReviewCount,
		orderId: review.orderId ?? null,
		createdAt: review.createdAt.toISOString(),
		updatedAt: review.updatedAt.toISOString(),
	};
}

export async function getProductReviews(
	productId: string,
	pagination: { page?: number; pageSize?: number },
	viewerId?: string
) {
	const page = pagination.page ?? 1;
	const pageSize = pagination.pageSize ?? 10;
	const [data, stats] = await Promise.all([
		repo.findProductReviews(productId, { page, pageSize }, viewerId),
		repo.getApprovedRatingStats(productId),
	]);

	const items = await Promise.all(data.items.map((r) => serializeReview(r, viewerId)));

	return {
		items,
		total: data.total,
		page: data.page,
		pageSize: data.pageSize,
		averageRating: stats.averageRating,
		reviewCount: stats.reviewCount,
	};
}

export async function getReviewEligibility(productId: string, userId: string) {
	const order = await repo.findDeliveredOrderForProduct(userId, productId);
	if (!order) {
		return { canWrite: false, orderId: null, existingReviewId: null };
	}

	const existing = await repo.findExistingReview(productId, userId, order.id);
	if (existing) {
		return { canWrite: false, orderId: order.id, existingReviewId: existing.id };
	}

	return { canWrite: true, orderId: order.id, existingReviewId: null };
}

export async function createProductReview(
	userId: string,
	input: {
		productId: string;
		orderId: string;
		rating: number;
		text?: string;
		photoDataUrls?: string[];
	}
) {
	if (input.rating < 1 || input.rating > 5) {
		throw new GraphQLError('Rating must be between 1 and 5', {
			extensions: { code: 'BAD_USER_INPUT' },
		});
	}

	const order = await repo.findDeliveredOrderForProduct(userId, input.productId);
	if (!order || order.id !== input.orderId) {
		throw new GraphQLError('A delivered order is required to review this product', {
			extensions: { code: 'FORBIDDEN' },
		});
	}

	const existing = await repo.findExistingReview(input.productId, userId, input.orderId);
	if (existing) {
		throw new GraphQLError('You have already reviewed this product for this order', {
			extensions: { code: 'BAD_USER_INPUT' },
		});
	}

	const photos = input.photoDataUrls?.length
		? await uploadReviewPhotos(input.photoDataUrls)
		: undefined;

	const review = await repo.createProductReview({
		productId: input.productId,
		reviewerId: userId,
		orderId: input.orderId,
		rating: input.rating,
		text: input.text?.trim() || undefined,
		photos: photos as unknown as Prisma.InputJsonValue,
	});

	return serializeReview(review, userId);
}

export async function editProductReview(
	userId: string,
	reviewId: string,
	input: { rating?: number; text?: string; photoDataUrls?: string[] }
) {
	const review = await repo.findReviewById(reviewId);
	if (!review) {
		throw new GraphQLError('Review not found', { extensions: { code: 'NOT_FOUND' } });
	}
	if (review.reviewerId !== userId) {
		throw new GraphQLError('You can only edit your own reviews', {
			extensions: { code: 'FORBIDDEN' },
		});
	}

	if (input.rating !== undefined && (input.rating < 1 || input.rating > 5)) {
		throw new GraphQLError('Rating must be between 1 and 5', {
			extensions: { code: 'BAD_USER_INPUT' },
		});
	}

	let photos: Prisma.InputJsonValue | undefined;
	if (input.photoDataUrls !== undefined) {
		const uploaded = await uploadReviewPhotos(input.photoDataUrls);
		photos = uploaded as unknown as Prisma.InputJsonValue;
	}

	const updated = await repo.updateProductReview(reviewId, {
		rating: input.rating,
		text: input.text?.trim(),
		photos,
	});

	return serializeReview(updated, userId);
}

export async function respondToReview(userId: string, reviewId: string, reply: string) {
	const trimmed = reply.trim();
	if (!trimmed) {
		throw new GraphQLError('Reply text is required', { extensions: { code: 'BAD_USER_INPUT' } });
	}

	const review = await repo.findReviewById(reviewId);
	if (!review) {
		throw new GraphQLError('Review not found', { extensions: { code: 'NOT_FOUND' } });
	}
	if (review.product.sellerId !== userId) {
		throw new GraphQLError('Only the product seller can respond to this review', {
			extensions: { code: 'FORBIDDEN' },
		});
	}
	if (review.sellerReply) {
		throw new GraphQLError('A response has already been posted for this review', {
			extensions: { code: 'BAD_USER_INPUT' },
		});
	}

	const updated = await repo.setSellerReply(reviewId, trimmed);
	return serializeReview(updated, userId);
}

export async function flagReview(userId: string, reviewId: string, reason: string) {
	const trimmed = reason.trim();
	if (!trimmed) {
		throw new GraphQLError('Flag reason is required', { extensions: { code: 'BAD_USER_INPUT' } });
	}

	const review = await repo.findReviewById(reviewId);
	if (!review) {
		throw new GraphQLError('Review not found', { extensions: { code: 'NOT_FOUND' } });
	}

	await repo.createReviewComplaint({
		complainantId: userId,
		targetReviewId: reviewId,
		reason: trimmed,
	});

	return true;
}
