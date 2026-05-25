import { gql } from '@apollo/client';

export const PRODUCT_REVIEWS_QUERY = gql`
	query ProductReviews($input: ProductReviewsInput!) {
		productReviews(input: $input) {
			total
			page
			pageSize
			averageRating
			reviewCount
			items {
				id
				productId
				rating
				text
				photos
				sellerReply
				isApproved
				isOwn
				isPending
				reviewerName
				reviewerInitials
				reviewerAvatarUrl
				reviewerReviewCount
				orderId
				createdAt
				updatedAt
			}
		}
	}
`;

export const REVIEW_ELIGIBILITY_QUERY = gql`
	query ReviewEligibility($productId: ID!) {
		reviewEligibility(productId: $productId) {
			canWrite
			orderId
			existingReviewId
		}
	}
`;

export const CREATE_PRODUCT_REVIEW_MUTATION = gql`
	mutation CreateProductReview($input: CreateProductReviewInput!) {
		createProductReview(input: $input) {
			id
			rating
			text
			photos
			isApproved
			isOwn
			isPending
			reviewerName
			createdAt
		}
	}
`;

export const RESPOND_TO_REVIEW_MUTATION = gql`
	mutation RespondToReview($reviewId: ID!, $reply: String!) {
		respondToReview(reviewId: $reviewId, reply: $reply) {
			id
			sellerReply
		}
	}
`;

export interface ProductReviewItem {
	id: string;
	productId: string;
	rating: number;
	text: string | null;
	photos: string[];
	sellerReply: string | null;
	isApproved: boolean;
	isOwn: boolean;
	isPending: boolean;
	reviewerName: string;
	reviewerInitials: string;
	reviewerAvatarUrl: string | null;
	reviewerReviewCount: number;
	orderId: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface ProductReviewsData {
	productReviews: {
		items: ProductReviewItem[];
		total: number;
		page: number;
		pageSize: number;
		averageRating: number;
		reviewCount: number;
	};
}

export interface ProductReviewsVars {
	input: { productId: string; page?: number; pageSize?: number };
}

export interface ReviewEligibilityData {
	reviewEligibility: {
		canWrite: boolean;
		orderId: string | null;
		existingReviewId: string | null;
	};
}
