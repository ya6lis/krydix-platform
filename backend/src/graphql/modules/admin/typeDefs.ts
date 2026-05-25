export const adminTypeDefs = `#graphql
	type AdminUserStats {
		total: Int!
		buyers: Int!
		sellers: Int!
		moderators: Int!
		administrators: Int!
		blocked: Int!
		newThisMonth: Int!
	}

	type AdminUserTabCounts {
		all: Int!
		buyers: Int!
		sellers: Int!
		moderators: Int!
		administrators: Int!
		blocked: Int!
	}

	type AdminUserItem {
		id: ID!
		email: String!
		displayName: String!
		initials: String!
		avatarUrl: String
		role: String!
		country: String
		joinedAt: String!
		lastSeenAt: String!
		isOnline: Boolean!
		status: String!
		userRef: String!
		isActive: Boolean!
		isEmailVerified: Boolean!
	}

	type AdminUserList {
		items: [AdminUserItem!]!
		total: Int!
		page: Int!
		pageSize: Int!
		tabCounts: AdminUserTabCounts!
	}

	enum AdminUserRoleFilter {
		ALL
		BUYER
		SELLER
		MODERATOR
		ADMIN
		BLOCKED
	}

	enum AdminUserStatusFilter {
		ALL
		ACTIVE
		PENDING_EMAIL
		BLOCKED
	}

	input AllUsersInput {
		roleFilter: AdminUserRoleFilter
		statusFilter: AdminUserStatusFilter
		search: String
		page: Int
		pageSize: Int
	}

	input InviteUserInput {
		email: String!
		firstName: String!
		lastName: String!
		role: String!
	}

	extend type Query {
		adminStats: AdminUserStats!
		allUsers(input: AllUsersInput): AdminUserList!
	}

	extend type Mutation {
		changeUserRole(id: ID!, role: String!): AdminUserItem!
		softDeleteUser(id: ID!): Boolean!
		softBanUser(id: ID!, reason: String): AdminUserItem!
		softUnbanUser(id: ID!): AdminUserItem!
		inviteUser(input: InviteUserInput!): AdminUserItem!
	}

	type AdminProductStats {
		total: Int!
		draft: Int!
		pending: Int!
		approved: Int!
		rejected: Int!
		blocked: Int!
		archived: Int!
		deleted: Int!
		newThisMonth: Int!
	}

	type AdminProductTabCounts {
		all: Int!
		draft: Int!
		pending: Int!
		approved: Int!
		rejected: Int!
		blocked: Int!
		archived: Int!
		deleted: Int!
	}

	type AdminProductItem {
		id: ID!
		title: String!
		sku: String!
		slug: String!
		productRef: String!
		imageUrl: String
		sellerId: ID!
		sellerName: String!
		sellerEmail: String!
		basePrice: Float!
		brand: String
		categoryPath: String
		status: String!
		isAvailable: Boolean!
		totalStock: Int!
		createdAt: String!
		updatedAt: String!
		isDeleted: Boolean!
	}

	type AdminProductList {
		items: [AdminProductItem!]!
		total: Int!
		page: Int!
		pageSize: Int!
		tabCounts: AdminProductTabCounts!
	}

	enum AdminProductStatusFilter {
		ALL
		DRAFT
		PENDING_MODERATION
		APPROVED
		REJECTED
		BLOCKED
		ARCHIVED
		DELETED
	}

	enum AdminProductAvailabilityFilter {
		ALL
		AVAILABLE
		UNAVAILABLE
	}

	input AllProductsInput {
		statusFilter: AdminProductStatusFilter
		availabilityFilter: AdminProductAvailabilityFilter
		search: String
		page: Int
		pageSize: Int
	}

	extend type Query {
		adminProductStats: AdminProductStats!
		allProducts(input: AllProductsInput): AdminProductList!
	}

	extend type Mutation {
		changeAdminProductStatus(id: ID!, status: String!): AdminProductItem!
		adminDeleteProduct(id: ID!): Boolean!
	}

	type AdminReviewStats {
		total: Int!
		pending: Int!
		flagged: Int!
		approved: Int!
		blocked: Int!
		deleted: Int!
		newThisMonth: Int!
	}

	type AdminReviewTabCounts {
		all: Int!
		pending: Int!
		flagged: Int!
		approved: Int!
		blocked: Int!
		deleted: Int!
	}

	type AdminReviewItem {
		id: ID!
		reviewRef: String!
		rating: Float!
		text: String
		reviewerId: ID!
		reviewerName: String!
		reviewerEmail: String!
		reviewerAvatarUrl: String
		productId: ID!
		productTitle: String!
		productSlug: String!
		productSku: String!
		productImageUrl: String
		status: String!
		isFlagged: Boolean!
		flagReason: String
		orderId: String
		createdAt: String!
		updatedAt: String!
		isDeleted: Boolean!
	}

	type AdminReviewList {
		items: [AdminReviewItem!]!
		total: Int!
		page: Int!
		pageSize: Int!
		tabCounts: AdminReviewTabCounts!
	}

	enum AdminReviewStatusFilter {
		ALL
		PENDING
		FLAGGED
		APPROVED
		BLOCKED
		DELETED
	}

	input AllReviewsInput {
		statusFilter: AdminReviewStatusFilter
		ratingFilter: String
		search: String
		page: Int
		pageSize: Int
	}

	extend type Query {
		adminReviewStats: AdminReviewStats!
		allReviews(input: AllReviewsInput): AdminReviewList!
	}

	extend type Mutation {
		changeAdminReviewStatus(id: ID!, status: String!): AdminReviewItem!
		adminDeleteReview(id: ID!): Boolean!
	}
`;
