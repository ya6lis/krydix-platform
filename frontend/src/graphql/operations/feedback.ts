import { gql } from '@apollo/client';
import { FeedbackCategory, FeedbackStatus } from '@/constants/enums';

export interface FeedbackAttachment {
	url: string;
	publicId: string;
}

export interface UserFeedbackItem {
	id: string;
	category: FeedbackCategory;
	subject: string;
	message: string;
	attachments: FeedbackAttachment[];
	status: FeedbackStatus;
	adminNotes: string | null;
	authorName: string;
	authorEmail: string;
	authorRole: string;
	handledByName: string | null;
	handledAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface FeedbackStats {
	total: number;
	newCount: number;
	underReviewCount: number;
	acknowledgedCount: number;
	plannedCount: number;
	resolvedCount: number;
	dismissedCount: number;
}

export interface AdminFeedbacksData {
	adminFeedbacks: {
		items: UserFeedbackItem[];
		total: number;
		page: number;
		pageSize: number;
	};
}

export interface AdminFeedbacksVars {
	input?: {
		page?: number;
		pageSize?: number;
		status?: FeedbackStatus;
		category?: FeedbackCategory;
		search?: string;
	};
}

export const SUBMIT_FEEDBACK_MUTATION = gql`
	mutation SubmitFeedback($input: SubmitFeedbackInput!) {
		submitFeedback(input: $input) {
			id
			subject
			status
		}
	}
`;

export const ADMIN_FEEDBACKS_QUERY = gql`
	query AdminFeedbacks($input: AdminFeedbacksInput) {
		adminFeedbacks(input: $input) {
			total
			page
			pageSize
			items {
				id
				category
				subject
				message
				status
				adminNotes
				authorName
				authorEmail
				authorRole
				attachments {
					url
					publicId
				}
				handledByName
				handledAt
				createdAt
			}
		}
	}
`;

export const ADMIN_FEEDBACK_STATS_QUERY = gql`
	query AdminFeedbackStats {
		adminFeedbackStats {
			total
			newCount
			underReviewCount
			acknowledgedCount
			plannedCount
			resolvedCount
			dismissedCount
		}
	}
`;

export const ADMIN_FEEDBACK_QUERY = gql`
	query AdminFeedback($id: ID!) {
		adminFeedback(id: $id) {
			id
			category
			subject
			message
			status
			adminNotes
			authorName
			authorEmail
			authorRole
			attachments {
				url
				publicId
			}
			handledByName
			handledAt
			createdAt
			updatedAt
		}
	}
`;

export const UPDATE_FEEDBACK_MUTATION = gql`
	mutation UpdateFeedback($input: UpdateFeedbackInput!) {
		updateFeedback(input: $input) {
			id
			status
			adminNotes
			handledByName
			handledAt
		}
	}
`;
