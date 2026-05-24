export const cartTypeDefs = `#graphql
	enum PaymentMethod {
		CARD
		CASH_ON_DELIVERY
		BANK_TRANSFER
	}

	type CartItemOut {
		id: ID!
		productId: ID!
		variantId: ID
		quantity: Int!
		unitPrice: Float!
		totalPrice: Float!
		productTitle: String!
		productImage: String
		variantOptions: JSON
		stock: Int!
	}

	type CartOut {
		items: [CartItemOut!]!
		subtotal: Float!
	}

	extend type Query {
		myCart: CartOut!
	}

	extend type Mutation {
		addToCart(productId: ID!, variantId: ID, quantity: Int!): CartOut!
		updateCartItem(cartItemId: ID!, quantity: Int!): CartOut!
		removeFromCart(cartItemId: ID!): CartOut!
		clearCart: CartOut!
		applyPromoCode(code: String!): PromoValidationResult!
	}

	type PromoValidationResult {
		valid: Boolean!
		discount: Float!
		message: String
	}
`;
