export const ordersTypeDefs = `#graphql
	enum ReturnRequestStatus {
		REQUESTED
		UNDER_REVIEW
		APPROVED
		AWAITING_RETURN_SHIPPING
		RECEIVED
		REJECTED
		REFUNDED
		CLOSED
	}

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
		cardBrand: String
		cardLast4: String
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

	type ReturnRequest {
		id: ID!
		orderId: ID!
		buyerId: ID!
		sellerId: ID!
		status: ReturnRequestStatus!
		reason: String!
		details: String
		resolution: String
		reviewedById: ID
		reviewedAt: String
		refundedAt: String
		closedAt: String
		createdAt: String!
		updatedAt: String!
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
		returnRequest: ReturnRequest
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

	type SellerOrderBuyer {
		id: ID!
		name: String!
		email: String!
		phone: String
	}

	type SellerOrder {
		id: ID!
		status: OrderStatus!
		sellerSubtotal: Float!
		itemCount: Int!
		buyer: SellerOrderBuyer!
		items: [OrderItem!]!
		payment: PaymentRecord
		delivery: DeliveryRecord
		returnRequest: ReturnRequest
		createdAt: String!
		updatedAt: String!
	}

	type PaginatedSellerOrders {
		items: [SellerOrder!]!
		total: Int!
		page: Int!
		pageSize: Int!
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
		mySellerOrders(filter: MyOrdersFilter): PaginatedSellerOrders!
		mySellerOrder(id: ID!): SellerOrder!
		mySellerOrderStats: OrderStats!
	}

	extend type Mutation {
		cancelOrder(orderId: ID!): Order!
		confirmDelivery(orderId: ID!): Order!
		requestRefund(orderId: ID!): Order!
		requestReturn(orderId: ID!, reason: String!, details: String): ReturnRequest!
		confirmSellerOrder(orderId: ID!): SellerOrder!
		markSellerOrderPacked(orderId: ID!): SellerOrder!
		shipSellerOrder(orderId: ID!, trackingCode: String): SellerOrder!
		markSellerOrderInTransit(orderId: ID!): SellerOrder!
		markSellerOrderDelivered(orderId: ID!): SellerOrder!
		cancelSellerOrder(orderId: ID!, reason: String): SellerOrder!
		updateSellerOrderTracking(orderId: ID!, trackingCode: String!): SellerOrder!
		reviewSellerReturnRequest(orderId: ID!, approve: Boolean!, resolution: String): SellerOrder!
		markSellerReturnReceived(orderId: ID!): SellerOrder!
		processSellerReturnRefund(orderId: ID!): SellerOrder!
	}
`;
