import { gql } from '@apollo/client';

const CART_ITEM_FIELDS = `
	id
	productId
	variantId
	sellerId
	sellerName
	quantity
	unitPrice
	totalPrice
	productTitle
	productImage
	variantOptions
	stock
`;

export const MY_CART_QUERY = gql`
	query MyCart {
		myCart {
			items {
				${CART_ITEM_FIELDS}
			}
			subtotal
		}
	}
`;

export const ADD_TO_CART_MUTATION = gql`
	mutation AddToCart($productId: ID!, $variantId: ID, $quantity: Int!) {
		addToCart(productId: $productId, variantId: $variantId, quantity: $quantity) {
			items {
				${CART_ITEM_FIELDS}
			}
			subtotal
		}
	}
`;

export const UPDATE_CART_ITEM_MUTATION = gql`
	mutation UpdateCartItem($cartItemId: ID!, $quantity: Int!) {
		updateCartItem(cartItemId: $cartItemId, quantity: $quantity) {
			items {
				${CART_ITEM_FIELDS}
			}
			subtotal
		}
	}
`;

export const REMOVE_FROM_CART_MUTATION = gql`
	mutation RemoveFromCart($cartItemId: ID!) {
		removeFromCart(cartItemId: $cartItemId) {
			items {
				${CART_ITEM_FIELDS}
			}
			subtotal
		}
	}
`;

export const CLEAR_CART_MUTATION = gql`
	mutation ClearCart {
		clearCart {
			items {
				${CART_ITEM_FIELDS}
			}
			subtotal
		}
	}
`;

export const APPLY_PROMO_CODE_MUTATION = gql`
	mutation ApplyPromoCode($code: String!) {
		applyPromoCode(code: $code) {
			valid
			discount
			message
		}
	}
`;

export const CREATE_ORDER_MUTATION = gql`
	mutation CreateOrder(
		$paymentMethod: PaymentMethod!
		$deliveryMethod: DeliveryMethod!
		$deliveryAddress: String
		$promoCode: String
		$notes: String
	) {
		createOrder(
			paymentMethod: $paymentMethod
			deliveryMethod: $deliveryMethod
			deliveryAddress: $deliveryAddress
			promoCode: $promoCode
			notes: $notes
		) {
			id
			status
			totalAmount
			discount
			notes
			createdAt
			items {
				id
				productId
				variantId
				productTitle
				quantity
				unitPrice
				totalPrice
			}
		}
	}
`;
