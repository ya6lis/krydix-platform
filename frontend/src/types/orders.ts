export type OrderStatus =
	| 'PENDING'
	| 'CONFIRMED'
	| 'SHIPPED'
	| 'DELIVERED'
	| 'CANCELLED'
	| 'REFUNDED';

export type PaymentStatus =
	| 'PENDING'
	| 'AUTHORIZED'
	| 'PAID'
	| 'IN_ESCROW'
	| 'FAILED'
	| 'REFUNDED'
	| 'CHARGEBACK'
	| 'CANCELED';
export type ReturnRequestStatus =
	| 'REQUESTED'
	| 'UNDER_REVIEW'
	| 'APPROVED'
	| 'AWAITING_RETURN_SHIPPING'
	| 'RECEIVED'
	| 'REJECTED'
	| 'REFUNDED'
	| 'CLOSED';
export type DeliveryStatus =
	| 'PENDING'
	| 'PACKED'
	| 'SENT'
	| 'IN_TRANSIT'
	| 'DELIVERED'
	| 'NOT_RECEIVED'
	| 'RETURNED';

export type DeliveryMethod = 'COURIER' | 'BRANCH_PICKUP' | 'SELF_PICKUP';
export type PaymentMethod = 'CARD' | 'CASH_ON_DELIVERY' | 'BANK_TRANSFER';

export interface OrderItem {
	__typename?: string;
	id: string;
	productId: string;
	variantId?: string | null;
	sellerId: string;
	quantity: number;
	unitPrice: number;
	totalPrice: number;
	productTitle: string;
	productMainImage?: string | null;
}

export interface PaymentRecord {
	__typename?: string;
	id: string;
	amount: number;
	method: PaymentMethod;
	status: PaymentStatus;
	transactionId?: string | null;
	createdAt: string;
	// optional card details (store only safe parts)
	cardBrand?: string | null;
	cardLast4?: string | null;
}

export interface DeliveryRecord {
	__typename?: string;
	id: string;
	method: DeliveryMethod;
	status: DeliveryStatus;
	address?: string | null;
	trackingCode?: string | null;
	createdAt: string;
}

export interface OrderPromoCode {
	id: string;
	code: string;
	discount: number;
}

export interface ReturnRequest {
	__typename?: string;
	id: string;
	orderId: string;
	buyerId: string;
	sellerId: string;
	status: ReturnRequestStatus;
	reason: string;
	details?: string | null;
	resolution?: string | null;
	reviewedById?: string | null;
	reviewedAt?: string | null;
	refundedAt?: string | null;
	closedAt?: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface Order {
	__typename?: string;
	id: string;
	status: OrderStatus;
	totalAmount: number;
	discount?: number | null;
	notes?: string | null;
	items: OrderItem[];
	payment?: PaymentRecord | null;
	delivery?: DeliveryRecord | null;
	returnRequest?: ReturnRequest | null;
	promoCode?: OrderPromoCode | null;
	createdAt: string;
	updatedAt: string;
}

export interface PaginatedOrders {
	items: Order[];
	total: number;
	page: number;
	pageSize: number;
}

export interface OrderStats {
	all: number;
	pending: number;
	confirmed: number;
	shipped: number;
	delivered: number;
	cancelled: number;
	refunded: number;
}

export interface MyOrdersFilter {
	status?: OrderStatus;
	dateFrom?: string;
	dateTo?: string;
	search?: string;
	page?: number;
	pageSize?: number;
}

export interface SellerOrderBuyer {
	id: string;
	name: string;
	email: string;
	phone?: string | null;
}

export interface SellerOrder {
	__typename?: string;
	id: string;
	status: OrderStatus;
	sellerSubtotal: number;
	itemCount: number;
	buyer: SellerOrderBuyer;
	items: OrderItem[];
	payment?: PaymentRecord | null;
	delivery?: DeliveryRecord | null;
	returnRequest?: ReturnRequest | null;
	createdAt: string;
	updatedAt: string;
}

export interface PaginatedSellerOrders {
	items: SellerOrder[];
	total: number;
	page: number;
	pageSize: number;
}
