import { gql } from '@apollo/client';

const CATALOG_PRODUCT_FIELDS = `
	id
	slug
	sku
	brand
	basePrice
	status
	isAvailable
	title
	description
	metaTitle
	metaDescription
	mainImage
	rating
	reviewCount
	totalStock
	createdAt
	media {
		id
		url
		type
		isMain
		sortOrder
	}
	variants {
		id
		sku
		options
		price
		stock
		isActive
	}
	categories {
		id
		slug
		name
	}
	seller {
		id
		name
	}
`;

export const CATEGORIES_QUERY = gql`
	query Categories($language: Language) {
		categories(language: $language) {
			id
			slug
			parentId
			name
			description
			productCount
			children {
				id
				slug
				parentId
				name
				productCount
				children {
					id
					slug
					parentId
					name
					productCount
				}
			}
		}
	}
`;

export const PRODUCT_BRANDS_QUERY = gql`
	query ProductBrands {
		productBrands
	}
`;

export const PRODUCTS_QUERY = gql`
	query Products(
		$filter: ProductFilterInput
		$sort: ProductSort
		$page: Int
		$pageSize: Int
		$language: Language
	) {
		products(
			filter: $filter
			sort: $sort
			page: $page
			pageSize: $pageSize
			language: $language
		) {
			total
			page
			pageSize
			items {
				${CATALOG_PRODUCT_FIELDS}
			}
		}
	}
`;

export const PRODUCT_QUERY = gql`
	query Product($slug: String!, $language: Language) {
		product(slug: $slug, language: $language) {
			${CATALOG_PRODUCT_FIELDS}
		}
	}
`;
