export const feedbackTypeDefs = `#graphql
	enum FeedbackCategory {
		BUG
		FEATURE
		UX
		OTHER
	}

	enum FeedbackStatus {
		NEW
		UNDER_REVIEW
		ACKNOWLEDGED
		PLANNED
		RESOLVED
		DISMISSED
	}

	type FeedbackAttachment {
		url: String!
		publicId: String!
	}

	type UserFeedbackItem {
		id: ID!
		category: FeedbackCategory!
		subject: String!
		message: String!
		attachments: [FeedbackAttachment!]!
		status: FeedbackStatus!
		adminNotes: String
		authorName: String!
		authorEmail: String!
		authorRole: String!
		handledByName: String
		handledAt: String
		createdAt: String!
		updatedAt: String!
	}

	type UserFeedbackList {
		items: [UserFeedbackItem!]!
		total: Int!
		page: Int!
		pageSize: Int!
	}

	type FeedbackStats {
		total: Int!
		newCount: Int!
		underReviewCount: Int!
		acknowledgedCount: Int!
		plannedCount: Int!
		resolvedCount: Int!
		dismissedCount: Int!
	}

	input SubmitFeedbackInput {
		category: FeedbackCategory!
		subject: String!
		message: String!
		photoDataUrls: [String!]
	}

	input AdminFeedbacksInput {
		page: Int
		pageSize: Int
		status: FeedbackStatus
		category: FeedbackCategory
		search: String
	}

	input UpdateFeedbackInput {
		id: ID!
		status: FeedbackStatus!
		adminNotes: String
	}

	extend type Query {
		adminFeedbacks(input: AdminFeedbacksInput): UserFeedbackList!
		adminFeedbackStats: FeedbackStats!
		adminFeedback(id: ID!): UserFeedbackItem
	}

	extend type Mutation {
		submitFeedback(input: SubmitFeedbackInput!): UserFeedbackItem!
		updateFeedback(input: UpdateFeedbackInput!): UserFeedbackItem!
	}
`;
