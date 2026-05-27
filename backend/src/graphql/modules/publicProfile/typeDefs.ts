export const publicProfileTypeDefs = `#graphql
	type PublicSellerProfile {
		id: ID!
		displayName: String!
		firstName: String!
		lastName: String!
		avatarUrl: String
		bio: String
		companyName: String
		country: String
		city: String
		isVerifiedSeller: Boolean!
		memberSince: String!
		productCount: Int!
		averageRating: Float!
		reviewCount: Int!
	}

	type PublicUserProfile {
		id: ID!
		displayName: String!
		firstName: String!
		lastName: String!
		avatarUrl: String
		bio: String
		country: String
		city: String
		role: String!
		memberSince: String!
	}

	extend type Query {
		publicSellerProfile(sellerId: ID!): PublicSellerProfile!
		publicUserProfile(userId: ID!): PublicUserProfile!
	}
`;
