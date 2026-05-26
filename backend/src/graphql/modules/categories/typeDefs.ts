export const categoriesTypeDefs = `#graphql
	type CategoryTranslationItem {
		language: Language!
		name: String!
		description: String
		metaTitle: String
		metaDescription: String
	}

	type CategoryTreeItem {
		id: ID!
		slug: String!
		parentId: ID
		icon: String
		isActive: Boolean!
		sortOrder: Int!
		depth: Int!
		productCount: Int!
		translations: [CategoryTranslationItem!]!
		children: [CategoryTreeItem!]!
	}

	input CreateCategoryInput {
		slug: String!
		parentId: ID
		icon: String
		isActive: Boolean
		nameEn: String!
		nameUk: String
		descriptionEn: String
		descriptionUk: String
		metaTitleEn: String
		metaTitleUk: String
		metaDescriptionEn: String
		metaDescriptionUk: String
	}

	input UpdateCategoryInput {
		slug: String
		parentId: ID
		icon: String
		isActive: Boolean
		nameEn: String
		nameUk: String
		descriptionEn: String
		descriptionUk: String
		metaTitleEn: String
		metaTitleUk: String
		metaDescriptionEn: String
		metaDescriptionUk: String
	}

	input MoveCategoryInput {
		id: ID!
		parentId: ID
		sortOrder: Int!
	}

	input UpdateCategoryTranslationInput {
		categoryId: ID!
		language: Language!
		name: String!
		description: String
		metaTitle: String
		metaDescription: String
	}

	extend type Query {
		categoryTree: [CategoryTreeItem!]!
		adminCategory(id: ID!): CategoryTreeItem
	}

	extend type Mutation {
		createCategory(input: CreateCategoryInput!): CategoryTreeItem!
		updateCategory(id: ID!, input: UpdateCategoryInput!): CategoryTreeItem!
		moveCategory(input: MoveCategoryInput!): CategoryTreeItem!
		deleteCategory(id: ID!): Boolean!
		updateCategoryTranslation(input: UpdateCategoryTranslationInput!): CategoryTreeItem!
	}
`;
