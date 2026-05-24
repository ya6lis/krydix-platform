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
	}

	extend type Query {
		myProduct(id: ID!): SellerProduct
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
	}
`;
