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
	mutation PreviewImport($dataUrl: String!, $fileType: String, $mode: ImportMode) {
		previewImport(dataUrl: $dataUrl, fileType: $fileType, mode: $mode) {
			rowIndex
			nameEn
			nameUk
			descriptionEn
			descriptionUk
			sku
			slug
			price
			currency
			quantity
			category
			status
			brand
			images
			isActive
			discountPrice
			seoTitle
			seoDescription
			isValid
			errors
			willCreate
			willUpdate
		}
	}
`;

export const CONFIRM_IMPORT_MUTATION = gql`
	mutation ConfirmImport($rows: [ImportRowInput!]!, $mode: ImportMode) {
		confirmImport(rows: $rows, mode: $mode) {
			created
			updated
			failed
			skipped
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
	nameEn: string;
	nameUk: string;
	descriptionEn: string;
	descriptionUk: string;
	sku: string;
	slug: string;
	price: number;
	currency: string;
	quantity: number;
	category: string;
	status: string;
	brand: string | null;
	images: string;
	isActive: boolean;
	discountPrice: number | null;
	seoTitle: string | null;
	seoDescription: string | null;
	isValid: boolean;
	errors: string[];
	willCreate: boolean;
	willUpdate: boolean;
}

export interface ImportResultData {
	confirmImport: {
		created: number;
		updated: number;
		failed: number;
		skipped: number;
		errors: Array<{ rowIndex: number; error: string }>;
	};
}
