export type OrderStatus =
	| 'PENDING'
	| 'CONFIRMED'
	| 'SHIPPED'
	| 'DELIVERED'
	| 'CANCELLED'
	| 'REFUNDED';

export type PaymentStatus = 'PENDING' | 'AUTHORIZED' | 'PAID' | 'FAILED' | 'REFUNDED';
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
	id: string;
	amount: number;
	method: PaymentMethod;
	status: PaymentStatus;
	transactionId?: string | null;
	createdAt: string;
}

export interface DeliveryRecord {
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

export interface Order {
	id: string;
	status: OrderStatus;
	totalAmount: number;
	discount?: number | null;
	notes?: string | null;
	items: OrderItem[];
	payment?: PaymentRecord | null;
	delivery?: DeliveryRecord | null;
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
