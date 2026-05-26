import { gql } from '@apollo/client';

const SELLER_ORDER_FIELDS = `
	id
	status
	sellerSubtotal
	itemCount
	createdAt
	updatedAt
	buyer {
		id
		name
		email
		phone
	}
	items {
		id
		productId
		variantId
		sellerId
		quantity
		unitPrice
		totalPrice
		productTitle
		productMainImage
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
	returnRequest {
		id
		orderId
		buyerId
		sellerId
		status
		reason
		details
		resolution
		reviewedAt
		refundedAt
		createdAt
		updatedAt
	}
`;

export const MY_SELLER_ORDERS_QUERY = gql`
	query MySellerOrders($filter: MyOrdersFilter) {
		mySellerOrders(filter: $filter) {
			items {
				${SELLER_ORDER_FIELDS}
			}
			total
			page
			pageSize
		}
	}
`;

export const MY_SELLER_ORDER_QUERY = gql`
	query MySellerOrder($id: ID!) {
		mySellerOrder(id: $id) {
			${SELLER_ORDER_FIELDS}
		}
	}
`;

export const MY_SELLER_ORDER_STATS_QUERY = gql`
	query MySellerOrderStats {
		mySellerOrderStats {
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

export const CONFIRM_SELLER_ORDER_MUTATION = gql`
	mutation ConfirmSellerOrder($orderId: ID!) {
		confirmSellerOrder(orderId: $orderId) {
			${SELLER_ORDER_FIELDS}
		}
	}
`;

export const MARK_SELLER_ORDER_PACKED_MUTATION = gql`
	mutation MarkSellerOrderPacked($orderId: ID!) {
		markSellerOrderPacked(orderId: $orderId) {
			${SELLER_ORDER_FIELDS}
		}
	}
`;

export const SHIP_SELLER_ORDER_MUTATION = gql`
	mutation ShipSellerOrder($orderId: ID!, $trackingCode: String) {
		shipSellerOrder(orderId: $orderId, trackingCode: $trackingCode) {
			${SELLER_ORDER_FIELDS}
		}
	}
`;

export const MARK_SELLER_ORDER_IN_TRANSIT_MUTATION = gql`
	mutation MarkSellerOrderInTransit($orderId: ID!) {
		markSellerOrderInTransit(orderId: $orderId) {
			${SELLER_ORDER_FIELDS}
		}
	}
`;

export const MARK_SELLER_ORDER_DELIVERED_MUTATION = gql`
	mutation MarkSellerOrderDelivered($orderId: ID!) {
		markSellerOrderDelivered(orderId: $orderId) {
			${SELLER_ORDER_FIELDS}
		}
	}
`;

export const CANCEL_SELLER_ORDER_MUTATION = gql`
	mutation CancelSellerOrder($orderId: ID!, $reason: String) {
		cancelSellerOrder(orderId: $orderId, reason: $reason) {
			${SELLER_ORDER_FIELDS}
		}
	}
`;

export const UPDATE_SELLER_ORDER_TRACKING_MUTATION = gql`
	mutation UpdateSellerOrderTracking($orderId: ID!, $trackingCode: String!) {
		updateSellerOrderTracking(orderId: $orderId, trackingCode: $trackingCode) {
			${SELLER_ORDER_FIELDS}
		}
	}
`;

export const REVIEW_SELLER_RETURN_MUTATION = gql`
	mutation ReviewSellerReturnRequest($orderId: ID!, $approve: Boolean!, $resolution: String) {
		reviewSellerReturnRequest(orderId: $orderId, approve: $approve, resolution: $resolution) {
			${SELLER_ORDER_FIELDS}
		}
	}
`;

export const MARK_SELLER_RETURN_RECEIVED_MUTATION = gql`
	mutation MarkSellerReturnReceived($orderId: ID!) {
		markSellerReturnReceived(orderId: $orderId) {
			${SELLER_ORDER_FIELDS}
		}
	}
`;

export const PROCESS_SELLER_RETURN_REFUND_MUTATION = gql`
	mutation ProcessSellerReturnRefund($orderId: ID!) {
		processSellerReturnRefund(orderId: $orderId) {
			${SELLER_ORDER_FIELDS}
		}
	}
`;
