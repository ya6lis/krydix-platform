import { gql } from '@apollo/client';

const SELLER_PRODUCT_FIELDS = `
	id
	slug
	sku
	brand
	basePrice
	comparePrice
	status
	isAvailable
	createdAt
	updatedAt
	titleEn
	titleUk
	descriptionEn
	descriptionUk
	metaTitleEn
	metaTitleUk
	metaDescriptionEn
	metaDescriptionUk
	categories {
		id
		slug
		nameEn
		nameUk
	}
	variants {
		id
		sku
		options
		price
		stock
		isActive
	}
	media {
		id
		url
		publicId
		type
		isMain
		sortOrder
	}
`;

export const MY_PRODUCT_QUERY = gql`
	query MyProduct($id: ID!) {
		myProduct(id: $id) {
			${SELLER_PRODUCT_FIELDS}
		}
	}
`;

export const CREATE_PRODUCT_MUTATION = gql`
	mutation CreateProduct($input: CreateProductInput!) {
		createProduct(input: $input) {
			${SELLER_PRODUCT_FIELDS}
		}
	}
`;

export const UPDATE_PRODUCT_MUTATION = gql`
	mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {
		updateProduct(id: $id, input: $input) {
			${SELLER_PRODUCT_FIELDS}
		}
	}
`;

export const UPLOAD_PRODUCT_MEDIA_MUTATION = gql`
	mutation UploadProductMedia(
		$productId: ID!
		$dataUrl: String!
		$isMain: Boolean
		$mediaType: String
	) {
		uploadProductMedia(
			productId: $productId
			dataUrl: $dataUrl
			isMain: $isMain
			mediaType: $mediaType
		) {
			id
			url
			publicId
			type
			isMain
			sortOrder
		}
	}
`;

export const DELETE_PRODUCT_MEDIA_MUTATION = gql`
	mutation DeleteProductMedia($mediaId: ID!) {
		deleteProductMedia(mediaId: $mediaId)
	}
`;

const SELLER_PRODUCT_LIST_FIELDS = `
	id
	slug
	sku
	brand
	basePrice
	comparePrice
	status
	isAvailable
	createdAt
	updatedAt
	titleEn
	titleUk
	categories {
		id
		slug
		nameEn
		nameUk
	}
	variants {
		id
		stock
		isActive
	}
	media {
		id
		url
		isMain
	}
`;

export const MY_PRODUCTS_QUERY = gql`
	query MyProducts($filter: ProductListFilterInput, $pagination: ProductListPaginationInput!) {
		myProducts(filter: $filter, pagination: $pagination) {
			items {
				${SELLER_PRODUCT_LIST_FIELDS}
			}
			total
			page
			pageSize
		}
	}
`;

export const DUPLICATE_PRODUCT_MUTATION = gql`
	mutation DuplicateProduct($id: ID!) {
		duplicateProduct(id: $id) {
			id
			slug
			status
			titleEn
		}
	}
`;

export const ARCHIVE_PRODUCT_MUTATION = gql`
	mutation ArchiveProduct($id: ID!) {
		archiveProduct(id: $id) {
			id
			status
		}
	}
`;

export const DEACTIVATE_PRODUCT_MUTATION = gql`
	mutation DeactivateProduct($id: ID!) {
		deactivateProduct(id: $id) {
			id
			isAvailable
		}
	}
`;

export const ACTIVATE_PRODUCT_MUTATION = gql`
	mutation ActivateProduct($id: ID!) {
		activateProduct(id: $id) {
			id
			isAvailable
		}
	}
`;

export const PREVIEW_IMPORT_MUTATION = gql`
	mutation PreviewImport($dataUrl: String!, $fileType: String) {
		previewImport(dataUrl: $dataUrl, fileType: $fileType) {
			rowIndex
			titleEn
			titleUk
			sku
			slug
			basePrice
			brand
			isValid
			errors
		}
	}
`;

export const CONFIRM_IMPORT_MUTATION = gql`
	mutation ConfirmImport($rows: [ImportRowInput!]!) {
		confirmImport(rows: $rows) {
			created
			updated
			failed
			errors {
				rowIndex
				error
			}
		}
	}
`;

// ─── TypeScript interfaces ────────────────────────────────────────────────────

export interface SellerProductListItem {
	id: string;
	slug: string;
	sku: string;
	brand: string | null;
	basePrice: number;
	comparePrice: number | null;
	status: string;
	isAvailable: boolean;
	createdAt: string;
	updatedAt: string;
	titleEn: string;
	titleUk: string;
	categories: Array<{ id: string; slug: string; nameEn: string; nameUk: string }>;
	variants: Array<{ id: string; stock: number; isActive: boolean }>;
	media: Array<{ id: string; url: string; isMain: boolean }>;
}

export interface MyProductsResult {
	myProducts: {
		items: SellerProductListItem[];
		total: number;
		page: number;
		pageSize: number;
	};
}

export interface ImportPreviewRow {
	rowIndex: number;
	titleEn: string;
	titleUk: string;
	sku: string;
	slug: string;
	basePrice: number;
	brand: string | null;
	isValid: boolean;
	errors: string[];
}

export interface ImportResultData {
	confirmImport: {
		created: number;
		updated: number;
		failed: number;
		errors: Array<{ rowIndex: number; error: string }>;
	};
}
