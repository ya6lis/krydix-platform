import { gql } from '@apollo/client';

export const CATEGORY_TREE_FRAGMENT = gql`
	fragment CategoryTreeFields on CategoryTreeItem {
		id
		slug
		parentId
		icon
		isActive
		sortOrder
		depth
		productCount
		translations {
			language
			name
			description
			metaTitle
			metaDescription
		}
	}
`;

export const CATEGORY_TREE_QUERY = gql`
	${CATEGORY_TREE_FRAGMENT}
	query CategoryTree {
		categoryTree {
			...CategoryTreeFields
			children {
				...CategoryTreeFields
				children {
					...CategoryTreeFields
					children {
						...CategoryTreeFields
					}
				}
			}
		}
	}
`;

export const CREATE_CATEGORY_MUTATION = gql`
	${CATEGORY_TREE_FRAGMENT}
	mutation CreateCategory($input: CreateCategoryInput!) {
		createCategory(input: $input) {
			...CategoryTreeFields
		}
	}
`;

export const UPDATE_CATEGORY_MUTATION = gql`
	${CATEGORY_TREE_FRAGMENT}
	mutation UpdateCategory($id: ID!, $input: UpdateCategoryInput!) {
		updateCategory(id: $id, input: $input) {
			...CategoryTreeFields
		}
	}
`;

export const MOVE_CATEGORY_MUTATION = gql`
	${CATEGORY_TREE_FRAGMENT}
	mutation MoveCategory($input: MoveCategoryInput!) {
		moveCategory(input: $input) {
			...CategoryTreeFields
		}
	}
`;

export const DELETE_CATEGORY_MUTATION = gql`
	mutation DeleteCategory($id: ID!) {
		deleteCategory(id: $id)
	}
`;

export interface CategoryTranslationItem {
	language: string;
	name: string;
	description: string | null;
	metaTitle: string | null;
	metaDescription: string | null;
}

export interface CategoryTreeItem {
	id: string;
	slug: string;
	parentId: string | null;
	icon: string | null;
	isActive: boolean;
	sortOrder: number;
	depth: number;
	productCount: number;
	translations: CategoryTranslationItem[];
	children: CategoryTreeItem[];
}

export interface CategoryTreeData {
	categoryTree: CategoryTreeItem[];
}

export interface CreateCategoryInput {
	slug: string;
	parentId?: string | null;
	icon?: string | null;
	isActive?: boolean;
	nameEn: string;
	nameUk?: string | null;
	descriptionEn?: string | null;
	descriptionUk?: string | null;
	metaTitleEn?: string | null;
	metaTitleUk?: string | null;
	metaDescriptionEn?: string | null;
	metaDescriptionUk?: string | null;
}

export interface UpdateCategoryInput {
	slug?: string;
	parentId?: string | null;
	icon?: string | null;
	isActive?: boolean;
	nameEn?: string;
	nameUk?: string | null;
	descriptionEn?: string | null;
	descriptionUk?: string | null;
	metaTitleEn?: string | null;
	metaTitleUk?: string | null;
	metaDescriptionEn?: string | null;
	metaDescriptionUk?: string | null;
}
