export const reviewModerationTypeDefs = `#graphql
	enum ModerationReviewTab {
		PENDING
		FLAGGED
		APPROVED
		HIDDEN
	}

	enum ModerationReviewTarget {
		ALL
		PRODUCT
		SELLER
		BUYER
	}

	type ModerationReviewItem {
		id: ID!
		reviewType: String!
		rating: Float!
		text: String
		photos: [String!]!
		isApproved: Boolean!
		isBlocked: Boolean!
		isFlagged: Boolean!
		flagReason: String
		reviewerName: String!
		reviewerInitials: String!
		reviewerAvatarUrl: String
		reviewerReviewCount: Int!
		targetTitle: String!
		targetRef: String!
		targetImageUrl: String
		targetSlug: String!
		orderId: String
		submittedAt: String!
	}

	type ModerationReviewList {
		items: [ModerationReviewItem!]!
		total: Int!
		page: Int!
		pageSize: Int!
		pendingCount: Int!
		flaggedCount: Int!
		approvedCount: Int!
		hiddenCount: Int!
	}

	input ModerationReviewsInput {
		tab: ModerationReviewTab
		search: String
		ratingFilter: String
		target: ModerationReviewTarget
		page: Int
		pageSize: Int
	}

	extend type Query {
		moderationReviews(input: ModerationReviewsInput): ModerationReviewList!
	}

	extend type Mutation {
		approveReview(id: ID!): ModerationReviewItem!
		hideReview(id: ID!): ModerationReviewItem!
		deleteReview(id: ID!): Boolean!
	}
`;
