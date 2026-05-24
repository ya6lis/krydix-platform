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
