import { gql } from '@apollo/client';

export const MY_WISHLIST_QUERY = gql`
	query MyWishlist {
		myWishlist {
			count
			items {
				id
				productId
				productTitle
				productSlug
				productImage
				price
				comparePrice
				inStock
				totalStock
				sellerId
				sellerName
			}
		}
	}
`;

export const MY_WISHLIST_PRODUCT_IDS_QUERY = gql`
	query MyWishlistProductIds {
		myWishlistProductIds
	}
`;

export const TOGGLE_WISHLIST_MUTATION = gql`
	mutation ToggleWishlist($productId: ID!) {
		toggleWishlist(productId: $productId) {
			count
			items {
				productId
			}
		}
	}
`;

export const REMOVE_FROM_WISHLIST_MUTATION = gql`
	mutation RemoveFromWishlist($productId: ID!) {
		removeFromWishlist(productId: $productId) {
			count
			items {
				id
				productId
				productTitle
				productSlug
				productImage
				price
				comparePrice
				inStock
				totalStock
				sellerId
				sellerName
			}
		}
	}
`;

export interface WishlistItemData {
	id: string;
	productId: string;
	productTitle: string;
	productSlug: string;
	productImage: string | null;
	price: number;
	comparePrice: number | null;
	inStock: boolean;
	totalStock: number;
	sellerId: string;
	sellerName: string;
}

export interface WishlistData {
	count: number;
	items: WishlistItemData[];
}
