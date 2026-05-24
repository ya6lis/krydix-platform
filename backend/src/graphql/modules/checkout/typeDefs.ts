export const checkoutTypeDefs = `#graphql
	enum DeliveryMethod {
		COURIER
		BRANCH_PICKUP
		SELF_PICKUP
	}

	enum OrderStatus {
		PENDING
		CONFIRMED
		SHIPPED
		DELIVERED
		CANCELLED
		REFUNDED
	}

	enum PaymentStatus {
		PENDING
		AUTHORIZED
		PAID
		FAILED
		REFUNDED
	}

	enum DeliveryStatus {
		PENDING
		PACKED
		SENT
		IN_TRANSIT
		DELIVERED
		NOT_RECEIVED
		RETURNED
	}

	type OrderItemOut {
		id: ID!
		productId: ID!
		variantId: ID
		quantity: Int!
		unitPrice: Float!
		totalPrice: Float!
		productTitle: String!
	}

	type PaymentOut {
		id: ID!
		status: PaymentStatus!
		amount: Float!
		method: PaymentMethod
	}

	type DeliveryOut {
		id: ID!
		status: DeliveryStatus!
		method: DeliveryMethod!
		address: String
		trackingCode: String
	}

	type OrderOut {
		id: ID!
		status: OrderStatus!
		totalAmount: Float!
		discount: Float
		items: [OrderItemOut!]!
		payment: PaymentOut
		delivery: DeliveryOut
		createdAt: String!
	}

	extend type Mutation {
		createOrder(
			paymentMethod: PaymentMethod!
			deliveryMethod: DeliveryMethod!
			deliveryAddress: String
			promoCode: String
			notes: String
		): OrderOut!
	}
`;
