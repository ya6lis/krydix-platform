export const paymentsTypeDefs = `#graphql
	enum PayoutStatus {
		ON_HOLD
		ELIGIBLE_FOR_RELEASE
		RELEASED
		WITHDRAWN
		BLOCKED
		REFUNDED
	}

	type SellerFinanceSummary {
		currency: String!
		onHold: Float!
		eligibleForRelease: Float!
		released: Float!
		withdrawable: Float!
		withdrawnLifetime: Float!
		minimumWithdrawal: Float!
		blockedCount: Int!
	}

	type SellerPayout {
		id: ID!
		orderId: ID!
		orderItemId: ID!
		productTitle: String!
		amountGross: Float!
		platformFeeAmount: Float!
		withdrawalFeeAmount: Float!
		amountNet: Float!
		currency: String!
		status: PayoutStatus!
		availableAt: String
		releasedAt: String
		withdrawnAt: String
		createdAt: String!
	}

	type PaginatedSellerPayouts {
		items: [SellerPayout!]!
		total: Int!
		page: Int!
		pageSize: Int!
	}

	type WithdrawPayoutResult {
		withdrawnCount: Int!
		totalNet: Float!
		withdrawalFee: Float!
		netReceived: Float!
		currency: String!
		payouts: [SellerPayout!]!
	}

	input SellerPayoutsFilter {
		status: PayoutStatus
		page: Int
		pageSize: Int
	}

	extend type Query {
		sellerFinanceSummary: SellerFinanceSummary!
		sellerPayouts(filter: SellerPayoutsFilter): PaginatedSellerPayouts!
	}

	extend type Mutation {
		withdrawSellerPayouts(payoutIds: [ID!]): WithdrawPayoutResult!
	}
`;
