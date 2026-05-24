export interface CartItemOut {
	id: string;
	productId: string;
	variantId: string | null;
	sellerId: string;
	sellerName: string;
	quantity: number;
	unitPrice: number;
	totalPrice: number;
	productTitle: string;
	productImage: string | null;
	variantOptions: Record<string, string> | null;
	stock: number;
}

export interface CartOut {
	items: CartItemOut[];
	subtotal: number;
}

export interface PromoValidationResult {
	valid: boolean;
	discount: number;
	message: string | null;
}

export interface OrderItemOut {
	id: string;
	productId: string;
	variantId: string | null;
	productTitle: string;
	quantity: number;
	unitPrice: number;
	totalPrice: number;
}

export interface OrderOut {
	id: string;
	status: string;
	totalAmount: number;
	discount: number | null;
	notes: string | null;
	createdAt: string;
	items: OrderItemOut[];
}
