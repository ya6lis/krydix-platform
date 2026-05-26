export const catalogTypeDefs = `#graphql
	scalar JSON

	enum Language {
		EN
		UK
	}

	enum ProductSort {
		NEWEST
		POPULARITY
		PRICE_ASC
		PRICE_DESC
		RATING
	}

	type CategoryNode {
		id: ID!
		slug: String!
		parentId: ID
		name: String!
		description: String
		productCount: Int!
		children: [CategoryNode!]!
	}

	type ProductMedia {
		id: ID!
		url: String!
		type: String!
		isMain: Boolean!
		sortOrder: Int!
	}

	type CatalogProductVariant {
		id: ID!
		sku: String
		options: JSON!
		price: Float
		stock: Int!
		isActive: Boolean!
	}

	type ProductCategoryRef {
		id: ID!
		slug: String!
		name: String!
	}

	type ProductSellerRef {
		id: ID!
		name: String!
	}

	type BrandCount {
		name: String!
		count: Int!
	}

	type CatalogProduct {
		id: ID!
		slug: String!
		sku: String!
		brand: String
		basePrice: Float!
		comparePrice: Float
		status: String!
		isAvailable: Boolean!
		title: String!
		description: String!
		metaTitle: String
		metaDescription: String
		media: [ProductMedia!]!
		mainImage: String
		variants: [CatalogProductVariant!]!
		categories: [ProductCategoryRef!]!
		seller: ProductSellerRef!
		rating: Float!
		reviewCount: Int!
		totalStock: Int!
		createdAt: String!
	}

	type ProductList {
		items: [CatalogProduct!]!
		total: Int!
		page: Int!
		pageSize: Int!
	}

	input ProductFilterInput {
		search: String
		categorySlug: String
		brands: [String!]
		minPrice: Float
		maxPrice: Float
		minRating: Float
		inStockOnly: Boolean
		sellerId: ID
	}

	extend type Query {
		categories(language: Language, sellerId: ID): [CategoryNode!]!
		category(slug: String!, language: Language): CategoryNode
		products(
			filter: ProductFilterInput
			sort: ProductSort
			page: Int
			pageSize: Int
			language: Language
		): ProductList!
		product(slug: String!, language: Language): CatalogProduct
		productBrands: [String!]!
		productBrandsWithCounts(sellerId: ID): [BrandCount!]!
	}
`;
