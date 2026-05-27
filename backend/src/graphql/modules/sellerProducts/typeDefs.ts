export const sellerProductsTypeDefs = `#graphql
	scalar JSON

	enum ProductStatus {
		DRAFT
		PENDING_MODERATION
		APPROVED
		REJECTED
		ARCHIVED
		BLOCKED
		DISABLED
		ENABLED
	}

	enum ProductStatusAction {
		SUBMIT_FOR_REVIEW
		MAKE_DRAFT
	}

	type CategoryRef {
		id: ID!
		slug: String!
		nameEn: String!
		nameUk: String!
	}

	type SellerVariant {
		id: ID!
		sku: String
		options: JSON!
		price: Float
		stock: Int!
		isActive: Boolean!
	}

	type MediaItem {
		id: ID!
		url: String!
		publicId: String!
		type: String!
		isMain: Boolean!
		sortOrder: Int!
	}

	type SellerProduct {
		id: ID!
		slug: String!
		sku: String!
		brand: String
		basePrice: Float!
		comparePrice: Float
		status: ProductStatus!
		isAvailable: Boolean!
		createdAt: String!
		updatedAt: String!
		titleEn: String!
		titleUk: String!
		descriptionEn: String!
		descriptionUk: String!
		metaTitleEn: String
		metaTitleUk: String
		metaDescriptionEn: String
		metaDescriptionUk: String
		categories: [CategoryRef!]!
		variants: [SellerVariant!]!
		media: [MediaItem!]!
	}

	input VariantInput {
		sku: String
		options: JSON!
		price: Float
		stock: Int!
	}

	input CreateProductInput {
		titleEn: String!
		titleUk: String!
		descriptionEn: String!
		descriptionUk: String!
		slug: String!
		sku: String!
		brand: String
		basePrice: Float!
		comparePrice: Float
		isAvailable: Boolean
		submitForReview: Boolean
		categoryIds: [ID!]!
		variants: [VariantInput!]
		metaTitleEn: String
		metaTitleUk: String
		metaDescriptionEn: String
		metaDescriptionUk: String
	}

	input UpdateProductInput {
		titleEn: String
		titleUk: String
		descriptionEn: String
		descriptionUk: String
		slug: String
		sku: String
		brand: String
		basePrice: Float
		comparePrice: Float
		isAvailable: Boolean
		categoryIds: [ID!]
		variants: [VariantInput!]
		metaTitleEn: String
		metaTitleUk: String
		metaDescriptionEn: String
		metaDescriptionUk: String
		statusAction: ProductStatusAction
	}

	type SellerProductList {
		items: [SellerProduct!]!
		total: Int!
		page: Int!
		pageSize: Int!
	}

	input ProductListFilterInput {
		status: ProductStatus
		search: String
	}

	input ProductListPaginationInput {
		page: Int!
		pageSize: Int!
	}

	type ImportPreviewRow {
		rowIndex: Int!
		nameEn: String!
		nameUk: String!
		descriptionEn: String!
		descriptionUk: String!
		sku: String!
		slug: String!
		price: Float!
		currency: String!
		quantity: Int!
		category: String!
		status: String!
		brand: String
		images: String!
		isActive: Boolean!
		discountPrice: Float
		seoTitle: String
		seoDescription: String
		isValid: Boolean!
		errors: [String!]!
		willCreate: Boolean!
		willUpdate: Boolean!
	}

	input ImportRowInput {
		rowIndex: Int
		nameEn: String!
		nameUk: String!
		descriptionEn: String!
		descriptionUk: String!
		slug: String!
		sku: String!
		brand: String
		price: Float!
		currency: String!
		quantity: Int!
		category: String!
		status: String!
		images: String!
		isActive: Boolean!
		discountPrice: Float
		seoTitle: String
		seoDescription: String
	}

	enum ImportMode {
		CREATE_ONLY
		UPDATE_ONLY
		UPSERT
	}

	type SpreadsheetFile {
		fileName: String!
		mimeType: String!
		base64: String!
	}

	type ImportResult {
		created: Int!
		updated: Int!
		failed: Int!
		skipped: Int!
		errors: [ImportError!]!
	}

	type ImportError {
		rowIndex: Int!
		error: String!
	}

	extend type Query {
		myProducts(filter: ProductListFilterInput, pagination: ProductListPaginationInput!): SellerProductList!
		myProduct(id: ID!): SellerProduct
		exportMyProducts(filter: ProductListFilterInput): SpreadsheetFile!
		downloadProductImportTemplate: SpreadsheetFile!
	}

	extend type Mutation {
		createProduct(input: CreateProductInput!): SellerProduct!
		updateProduct(id: ID!, input: UpdateProductInput!): SellerProduct!
		uploadProductMedia(
			productId: ID!
			dataUrl: String!
			isMain: Boolean
			mediaType: String
		): MediaItem!
		deleteProductMedia(mediaId: ID!): Boolean!
		duplicateProduct(id: ID!): SellerProduct!
		archiveProduct(id: ID!): SellerProduct!
		deactivateProduct(id: ID!): SellerProduct!
		activateProduct(id: ID!): SellerProduct!
		previewImport(dataUrl: String!, fileType: String, mode: ImportMode): [ImportPreviewRow!]!
		confirmImport(rows: [ImportRowInput!]!, mode: ImportMode): ImportResult!
	}
`;
