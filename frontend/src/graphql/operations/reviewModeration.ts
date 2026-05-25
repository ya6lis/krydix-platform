import { gql } from '@apollo/client';

export const MODERATION_REVIEWS_QUERY = gql`
	query ModerationReviews($input: ModerationReviewsInput) {
		moderationReviews(input: $input) {
			total
			page
			pageSize
			pendingCount
			flaggedCount
			approvedCount
			hiddenCount
			items {
				id
				reviewType
				rating
				text
				photos
				isApproved
				isBlocked
				isFlagged
				flagReason
				reviewerName
				reviewerInitials
				reviewerAvatarUrl
				reviewerReviewCount
				targetTitle
				targetRef
				targetImageUrl
				targetSlug
				orderId
				submittedAt
			}
		}
	}
`;

export const APPROVE_REVIEW_MUTATION = gql`
	mutation ApproveReview($id: ID!) {
		approveReview(id: $id) {
			id
			isApproved
			isBlocked
		}
	}
`;

export const HIDE_REVIEW_MUTATION = gql`
	mutation HideReview($id: ID!) {
		hideReview(id: $id) {
			id
			isApproved
			isBlocked
		}
	}
`;

export type ModerationReviewTab = 'PENDING' | 'FLAGGED' | 'APPROVED' | 'HIDDEN';
export type ModerationReviewTarget = 'ALL' | 'PRODUCT' | 'SELLER' | 'BUYER';

export interface ModerationReviewItem {
	id: string;
	reviewType: string;
	rating: number;
	text: string | null;
	photos: string[];
	isApproved: boolean;
	isBlocked: boolean;
	isFlagged: boolean;
	flagReason: string | null;
	reviewerName: string;
	reviewerInitials: string;
	reviewerAvatarUrl: string | null;
	reviewerReviewCount: number;
	targetTitle: string;
	targetRef: string;
	targetImageUrl: string | null;
	targetSlug: string;
	orderId: string | null;
	submittedAt: string;
}

export interface ModerationReviewsData {
	moderationReviews: {
		items: ModerationReviewItem[];
		total: number;
		page: number;
		pageSize: number;
		pendingCount: number;
		flaggedCount: number;
		approvedCount: number;
		hiddenCount: number;
	};
}

export interface ModerationReviewsVars {
	input?: {
		tab?: ModerationReviewTab;
		search?: string;
		ratingFilter?: string;
		target?: ModerationReviewTarget;
		page?: number;
		pageSize?: number;
	};
}
