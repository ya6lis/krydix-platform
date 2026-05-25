import { gql } from '@apollo/client';

export const ADMIN_PRODUCT_STATS_QUERY = gql`
	query AdminProductStats {
		adminProductStats {
			total
			draft
			pending
			approved
			rejected
			blocked
			archived
			deleted
			newThisMonth
		}
	}
`;

export const ALL_PRODUCTS_QUERY = gql`
	query AllProducts($input: AllProductsInput) {
		allProducts(input: $input) {
			total
			page
			pageSize
			tabCounts {
				all
				draft
				pending
				approved
				rejected
				blocked
				archived
				deleted
			}
			items {
				id
				title
				sku
				slug
				productRef
				imageUrl
				sellerId
				sellerName
				sellerEmail
				basePrice
				brand
				categoryPath
				status
				isAvailable
				totalStock
				createdAt
				updatedAt
				isDeleted
			}
		}
	}
`;

export const CHANGE_ADMIN_PRODUCT_STATUS_MUTATION = gql`
	mutation ChangeAdminProductStatus($id: ID!, $status: String!) {
		changeAdminProductStatus(id: $id, status: $status) {
			id
			status
		}
	}
`;

export const ADMIN_DELETE_PRODUCT_MUTATION = gql`
	mutation AdminDeleteProduct($id: ID!) {
		adminDeleteProduct(id: $id)
	}
`;

export type AdminProductStatusFilter =
	| 'ALL'
	| 'DRAFT'
	| 'PENDING_MODERATION'
	| 'APPROVED'
	| 'REJECTED'
	| 'BLOCKED'
	| 'ARCHIVED'
	| 'DELETED';

export type AdminProductAvailabilityFilter = 'ALL' | 'AVAILABLE' | 'UNAVAILABLE';

export interface AdminProductItem {
	id: string;
	title: string;
	sku: string;
	slug: string;
	productRef: string;
	imageUrl: string | null;
	sellerId: string;
	sellerName: string;
	sellerEmail: string;
	basePrice: number;
	brand: string | null;
	categoryPath: string | null;
	status: string;
	isAvailable: boolean;
	totalStock: number;
	createdAt: string;
	updatedAt: string;
	isDeleted: boolean;
}

export interface AdminProductStatsData {
	adminProductStats: {
		total: number;
		draft: number;
		pending: number;
		approved: number;
		rejected: number;
		blocked: number;
		archived: number;
		deleted: number;
		newThisMonth: number;
	};
}

export interface AllProductsData {
	allProducts: {
		items: AdminProductItem[];
		total: number;
		page: number;
		pageSize: number;
		tabCounts: {
			all: number;
			draft: number;
			pending: number;
			approved: number;
			rejected: number;
			blocked: number;
			archived: number;
			deleted: number;
		};
	};
}

export interface AllProductsVars {
	input?: {
		statusFilter?: AdminProductStatusFilter;
		availabilityFilter?: AdminProductAvailabilityFilter;
		search?: string;
		page?: number;
		pageSize?: number;
	};
}
