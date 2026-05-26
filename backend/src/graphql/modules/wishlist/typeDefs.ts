export const wishlistTypeDefs = `#graphql
	type WishlistItemOut {
		id: ID!
		productId: ID!
		productTitle: String!
		productSlug: String!
		productImage: String
		price: Float!
		comparePrice: Float
		inStock: Boolean!
		totalStock: Int!
		sellerId: ID!
		sellerName: String!
	}

	type WishlistOut {
		items: [WishlistItemOut!]!
		count: Int!
	}

	extend type Query {
		myWishlist: WishlistOut!
		myWishlistProductIds: [ID!]!
	}

	extend type Mutation {
		addToWishlist(productId: ID!): WishlistOut!
		removeFromWishlist(productId: ID!): WishlistOut!
		toggleWishlist(productId: ID!): WishlistOut!
	}
`;
