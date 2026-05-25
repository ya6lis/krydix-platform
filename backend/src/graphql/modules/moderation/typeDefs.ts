export const moderationTypeDefs = `#graphql
	type ModerationVariant {
		id: ID!
		sku: String
		options: JSON!
		price: Float
		stock: Int!
		isActive: Boolean!
	}

	type ModerationItem {
		id: ID!
		slug: String!
		titleEn: String!
		titleUk: String!
		descriptionEn: String!
		descriptionUk: String!
		sku: String!
		brand: String
		basePrice: Float!
		comparePrice: Float
		metaTitleEn: String
		metaTitleUk: String
		metaDescriptionEn: String
		metaDescriptionUk: String
		imageUrl: String
		galleryUrls: [String!]!
		status: String!
		categoryPath: String!
		allCategories: [String!]!
		totalStock: Int!
		photoCount: Int!
		variants: [ModerationVariant!]!
		sellerId: String!
		sellerName: String!
		sellerInitials: String!
		sellerAvatarUrl: String
		submittedAt: String!
	}

	type ModerationQueue {
		items: [ModerationItem!]!
		total: Int!
		pendingCount: Int!
		approvedTodayCount: Int!
		rejectedTodayCount: Int!
	}

	type BulkApproveResult {
		approved: Int!
		failed: Int!
	}

	enum ModerationFilterType {
		PENDING
		APPROVED_TODAY
		REJECTED_TODAY
	}

	input ModerationQueueInput {
		filterType: ModerationFilterType
		search: String
		page: Int
		pageSize: Int
	}

	extend type Query {
		moderationQueue(input: ModerationQueueInput): ModerationQueue!
		moderationItem(id: ID!): ModerationItem
	}

	extend type Mutation {
		approveProduct(id: ID!): ModerationItem!
		rejectProduct(id: ID!, reason: String!): ModerationItem!
		bulkApproveProducts(ids: [ID!]!): BulkApproveResult!
	}
`;
