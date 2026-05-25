import { gql } from '@apollo/client';

export const MODERATION_QUEUE_QUERY = gql`
	query ModerationQueue($input: ModerationQueueInput) {
		moderationQueue(input: $input) {
			total
			pendingCount
			approvedTodayCount
			rejectedTodayCount
			items {
				id
				slug
				titleEn
				titleUk
				descriptionEn
				descriptionUk
				sku
				brand
				basePrice
				comparePrice
				metaTitleEn
				metaTitleUk
				metaDescriptionEn
				metaDescriptionUk
				imageUrl
				galleryUrls
				status
				categoryPath
				allCategories
				totalStock
				photoCount
				variants {
					id
					sku
					options
					price
					stock
					isActive
				}
				sellerId
				sellerName
				sellerInitials
				sellerAvatarUrl
				submittedAt
			}
		}
	}
`;

export const APPROVE_PRODUCT_MUTATION = gql`
	mutation ApproveProduct($id: ID!) {
		approveProduct(id: $id) {
			id
			status
		}
	}
`;

export const REJECT_PRODUCT_MUTATION = gql`
	mutation RejectProduct($id: ID!, $reason: String!) {
		rejectProduct(id: $id, reason: $reason) {
			id
			status
		}
	}
`;

export const BULK_APPROVE_MUTATION = gql`
	mutation BulkApproveProducts($ids: [ID!]!) {
		bulkApproveProducts(ids: $ids) {
			approved
			failed
		}
	}
`;

export interface ModerationVariant {
	id: string;
	sku: string | null;
	options: Record<string, string>;
	price: number | null;
	stock: number;
	isActive: boolean;
}

export interface ModerationItem {
	id: string;
	slug: string;
	titleEn: string;
	titleUk: string;
	descriptionEn: string;
	descriptionUk: string;
	sku: string;
	brand: string | null;
	basePrice: number;
	comparePrice: number | null;
	metaTitleEn: string | null;
	metaTitleUk: string | null;
	metaDescriptionEn: string | null;
	metaDescriptionUk: string | null;
	imageUrl: string | null;
	galleryUrls: string[];
	status: string;
	categoryPath: string;
	allCategories: string[];
	totalStock: number;
	photoCount: number;
	variants: ModerationVariant[];
	sellerId: string;
	sellerName: string;
	sellerInitials: string;
	sellerAvatarUrl: string | null;
	submittedAt: string;
}

export type ModerationFilterType = 'PENDING' | 'APPROVED_TODAY' | 'REJECTED_TODAY';

export interface ModerationQueueData {
	moderationQueue: {
		items: ModerationItem[];
		total: number;
		pendingCount: number;
		approvedTodayCount: number;
		rejectedTodayCount: number;
	};
}

export interface ModerationQueueVars {
	input?: {
		filterType?: ModerationFilterType;
		search?: string;
		page?: number;
		pageSize?: number;
	};
}
