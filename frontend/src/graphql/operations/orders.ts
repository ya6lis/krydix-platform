import { gql } from '@apollo/client';

const ORDER_FIELDS = `
	id
	status
	totalAmount
	discount
	notes
	createdAt
	updatedAt
	items {
		id
		productId
		variantId
		sellerId
		quantity
		unitPrice
		totalPrice
		productTitle
	}
	payment {
		id
		amount
		method
		status
		transactionId
		createdAt
	}
	delivery {
		id
		method
		status
		address
		trackingCode
		createdAt
	}
	promoCode {
		id
		code
		discount
	}
`;

export const MY_ORDERS_QUERY = gql`
	query MyOrders($filter: MyOrdersFilter) {
		myOrders(filter: $filter) {
			items {
				${ORDER_FIELDS}
			}
			total
			page
			pageSize
		}
	}
`;

export const MY_ORDER_QUERY = gql`
	query MyOrder($id: ID!) {
		myOrder(id: $id) {
			${ORDER_FIELDS}
		}
	}
`;

export const MY_ORDER_STATS_QUERY = gql`
	query MyOrderStats {
		myOrderStats {
			all
			pending
			confirmed
			shipped
			delivered
			cancelled
			refunded
		}
	}
`;

export const CANCEL_ORDER_MUTATION = gql`
	mutation CancelOrder($orderId: ID!) {
		cancelOrder(orderId: $orderId) {
			${ORDER_FIELDS}
		}
	}
`;

export const CONFIRM_DELIVERY_MUTATION = gql`
	mutation ConfirmDelivery($orderId: ID!) {
		confirmDelivery(orderId: $orderId) {
			${ORDER_FIELDS}
		}
	}
`;

export const REQUEST_REFUND_MUTATION = gql`
	mutation RequestRefund($orderId: ID!) {
		requestRefund(orderId: $orderId) {
			${ORDER_FIELDS}
		}
	}
`;
