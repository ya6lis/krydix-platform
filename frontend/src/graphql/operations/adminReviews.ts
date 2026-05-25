import { gql } from '@apollo/client';

export const ADMIN_REVIEW_STATS_QUERY = gql`
	query AdminReviewStats {
		adminReviewStats {
			total
			pending
			flagged
			approved
			blocked
			deleted
			newThisMonth
		}
	}
`;

export const ALL_REVIEWS_QUERY = gql`
	query AllReviews($input: AllReviewsInput) {
		allReviews(input: $input) {
			total
			page
			pageSize
			tabCounts {
				all
				pending
				flagged
				approved
				blocked
				deleted
			}
			items {
				id
				reviewRef
				rating
				text
				reviewerId
				reviewerName
				reviewerEmail
				reviewerAvatarUrl
				productId
				productTitle
				productSlug
				productSku
				productImageUrl
				status
				isFlagged
				flagReason
				orderId
				createdAt
				updatedAt
				isDeleted
			}
		}
	}
`;

export const CHANGE_ADMIN_REVIEW_STATUS_MUTATION = gql`
	mutation ChangeAdminReviewStatus($id: ID!, $status: String!) {
		changeAdminReviewStatus(id: $id, status: $status) {
			id
			status
		}
	}
`;

export const ADMIN_DELETE_REVIEW_MUTATION = gql`
	mutation AdminDeleteReview($id: ID!) {
		adminDeleteReview(id: $id)
	}
`;

export type AdminReviewStatusFilter =
	| 'ALL'
	| 'PENDING'
	| 'FLAGGED'
	| 'APPROVED'
	| 'BLOCKED'
	| 'DELETED';

export interface AdminReviewItem {
	id: string;
	reviewRef: string;
	rating: number;
	text: string | null;
	reviewerId: string;
	reviewerName: string;
	reviewerEmail: string;
	reviewerAvatarUrl: string | null;
	productId: string;
	productTitle: string;
	productSlug: string;
	productSku: string;
	productImageUrl: string | null;
	status: string;
	isFlagged: boolean;
	flagReason: string | null;
	orderId: string | null;
	createdAt: string;
	updatedAt: string;
	isDeleted: boolean;
}

export interface AdminReviewStatsData {
	adminReviewStats: {
		total: number;
		pending: number;
		flagged: number;
		approved: number;
		blocked: number;
		deleted: number;
		newThisMonth: number;
	};
}

export interface AllReviewsData {
	allReviews: {
		items: AdminReviewItem[];
		total: number;
		page: number;
		pageSize: number;
		tabCounts: {
			all: number;
			pending: number;
			flagged: number;
			approved: number;
			blocked: number;
			deleted: number;
		};
	};
}

export interface AllReviewsVars {
	input?: {
		statusFilter?: AdminReviewStatusFilter;
		ratingFilter?: string;
		search?: string;
		page?: number;
		pageSize?: number;
	};
}
