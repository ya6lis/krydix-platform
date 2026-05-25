export const ordersTypeDefs = `#graphql
	type OrderItem {
		id: ID!
		productId: String!
		variantId: String
		sellerId: String!
		quantity: Int!
		unitPrice: Float!
		totalPrice: Float!
		productTitle: String!
		productMainImage: String
	}

	type PaymentRecord {
		id: ID!
		amount: Float!
		method: PaymentMethod!
		status: PaymentStatus!
		transactionId: String
		createdAt: String!
	}

	type DeliveryRecord {
		id: ID!
		method: DeliveryMethod!
		status: DeliveryStatus!
		address: String
		trackingCode: String
		createdAt: String!
	}

	type OrderPromoCode {
		id: ID!
		code: String!
		discount: Float!
	}

	type Order {
		id: ID!
		status: OrderStatus!
		totalAmount: Float!
		discount: Float
		notes: String
		items: [OrderItem!]!
		payment: PaymentRecord
		delivery: DeliveryRecord
		promoCode: OrderPromoCode
		createdAt: String!
		updatedAt: String!
	}

	type PaginatedOrders {
		items: [Order!]!
		total: Int!
		page: Int!
		pageSize: Int!
	}

	type OrderStats {
		all: Int!
		pending: Int!
		confirmed: Int!
		shipped: Int!
		delivered: Int!
		cancelled: Int!
		refunded: Int!
	}

	input MyOrdersFilter {
		status: OrderStatus
		dateFrom: String
		dateTo: String
		search: String
		page: Int
		pageSize: Int
	}

	extend type Query {
		myOrders(filter: MyOrdersFilter): PaginatedOrders!
		myOrder(id: ID!): Order!
		myOrderStats: OrderStats!
	}

	extend type Mutation {
		cancelOrder(orderId: ID!): Order!
		confirmDelivery(orderId: ID!): Order!
		requestRefund(orderId: ID!): Order!
	}
`;
