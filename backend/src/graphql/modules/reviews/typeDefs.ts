export const reviewsTypeDefs = `#graphql
	type ProductReviewItem {
		id: ID!
		productId: ID!
		rating: Float!
		text: String
		photos: [String!]!
		sellerReply: String
		isApproved: Boolean!
		isOwn: Boolean!
		isPending: Boolean!
		reviewerName: String!
		reviewerInitials: String!
		reviewerAvatarUrl: String
		reviewerReviewCount: Int!
		orderId: String
		createdAt: String!
		updatedAt: String!
	}

	type ProductReviewList {
		items: [ProductReviewItem!]!
		total: Int!
		page: Int!
		pageSize: Int!
		averageRating: Float!
		reviewCount: Int!
	}

	type ReviewEligibility {
		canWrite: Boolean!
		orderId: ID
		existingReviewId: ID
	}

	input ProductReviewsInput {
		productId: ID!
		page: Int
		pageSize: Int
	}

	input CreateProductReviewInput {
		productId: ID!
		orderId: ID!
		rating: Float!
		text: String
		photoDataUrls: [String!]
	}

	input EditProductReviewInput {
		reviewId: ID!
		rating: Float
		text: String
		photoDataUrls: [String!]
	}

	extend type Query {
		productReviews(input: ProductReviewsInput!): ProductReviewList!
		reviewEligibility(productId: ID!): ReviewEligibility!
	}

	extend type Mutation {
		createProductReview(input: CreateProductReviewInput!): ProductReviewItem!
		editProductReview(input: EditProductReviewInput!): ProductReviewItem!
		respondToReview(reviewId: ID!, reply: String!): ProductReviewItem!
		flagReview(reviewId: ID!, reason: String!): Boolean!
	}
`;
