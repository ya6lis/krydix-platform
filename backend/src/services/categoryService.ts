import { GraphQLError } from 'graphql';
import { Language, Role } from '../constants/enums.js';
import { MAX_CATEGORY_DEPTH } from '../constants/constants.js';
import * as repo from '../repositories/categoryRepository.js';
import * as auditLog from './auditLogService.js';
import type {
	CreateCategoryInput,
	MoveCategoryInput,
	UpdateCategoryInput,
	UpdateCategoryTranslationInput,
} from '../validators/categoryValidators.js';

export interface CategoryTranslationItem {
	language: Language;
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

type FlatCategory = repo.AdminCategoryRecord;

function assertAdminRole(actorRole: Role) {
	if (actorRole !== Role.ADMIN) {
		throw new GraphQLError('Administrator access required', { extensions: { code: 'FORBIDDEN' } });
	}
}

function mapTranslations(category: FlatCategory): CategoryTranslationItem[] {
	return category.translations.map((tr) => ({
		language: tr.language as Language,
		name: tr.name,
		description: tr.description ?? null,
		metaTitle: tr.metaTitle ?? null,
		metaDescription: tr.metaDescription ?? null,
	}));
}

function buildParentMap(categories: FlatCategory[]) {
	const parentMap = new Map<string, string | null>();
	for (const cat of categories) {
		parentMap.set(cat.id, cat.parentId);
	}
	return parentMap;
}

function getDepth(id: string, parentMap: Map<string, string | null>): number {
	let depth = 1;
	let current = parentMap.get(id) ?? null;
	while (current) {
		depth += 1;
		current = parentMap.get(current) ?? null;
	}
	return depth;
}

function getSubtreeMaxDepth(
	id: string,
	categories: FlatCategory[],
	_parentMap: Map<string, string | null>
): number {
	const childrenByParent = new Map<string | null, string[]>();
	for (const cat of categories) {
		const list = childrenByParent.get(cat.parentId) ?? [];
		list.push(cat.id);
		childrenByParent.set(cat.parentId, list);
	}

	let maxRelative = 1;
	const stack: Array<{ nodeId: string; relativeDepth: number }> = [
		{ nodeId: id, relativeDepth: 1 },
	];
	while (stack.length > 0) {
		const { nodeId, relativeDepth } = stack.pop()!;
		maxRelative = Math.max(maxRelative, relativeDepth);
		for (const childId of childrenByParent.get(nodeId) ?? []) {
			stack.push({ nodeId: childId, relativeDepth: relativeDepth + 1 });
		}
	}
	return maxRelative;
}

function isDescendant(
	candidateId: string,
	ancestorId: string,
	parentMap: Map<string, string | null>
): boolean {
	let current = parentMap.get(candidateId) ?? null;
	while (current) {
		if (current === ancestorId) return true;
		current = parentMap.get(current) ?? null;
	}
	return false;
}

function buildTree(categories: FlatCategory[]): CategoryTreeItem[] {
	const parentMap = buildParentMap(categories);
	const nodes = new Map<string, CategoryTreeItem>();

	for (const cat of categories) {
		nodes.set(cat.id, {
			id: cat.id,
			slug: cat.slug,
			parentId: cat.parentId,
			icon: cat.icon ?? null,
			isActive: cat.isActive,
			sortOrder: cat.sortOrder,
			depth: getDepth(cat.id, parentMap),
			productCount: cat._count.products,
			translations: mapTranslations(cat),
			children: [],
		});
	}

	const roots: CategoryTreeItem[] = [];
	for (const node of nodes.values()) {
		if (node.parentId && nodes.has(node.parentId)) {
			nodes.get(node.parentId)!.children.push(node);
		} else {
			roots.push(node);
		}
	}

	const sortRecursive = (items: CategoryTreeItem[]) => {
		items.sort((a, b) => a.sortOrder - b.sortOrder);
		for (const item of items) sortRecursive(item.children);
	};
	sortRecursive(roots);
	return roots;
}

function serializeCategory(category: FlatCategory, categories: FlatCategory[]): CategoryTreeItem {
	const parentMap = buildParentMap(categories);
	const tree = buildTree(categories);
	const findInTree = (items: CategoryTreeItem[]): CategoryTreeItem | undefined => {
		for (const item of items) {
			if (item.id === category.id) return item;
			const found = findInTree(item.children);
			if (found) return found;
		}
		return undefined;
	};
	return (
		findInTree(tree) ?? {
			id: category.id,
			slug: category.slug,
			parentId: category.parentId,
			icon: category.icon ?? null,
			isActive: category.isActive,
			sortOrder: category.sortOrder,
			depth: getDepth(category.id, parentMap),
			productCount: category._count.products,
			translations: mapTranslations(category),
			children: [],
		}
	);
}

async function loadCategoriesOrThrow() {
	const categories = await repo.findAllCategoriesAdmin();
	return categories;
}

function validateParentDepth(
	categoryId: string | null,
	parentId: string | null,
	categories: FlatCategory[]
) {
	if (!parentId) return;

	const parentMap = buildParentMap(categories);
	if (categoryId && (parentId === categoryId || isDescendant(parentId, categoryId, parentMap))) {
		throw new GraphQLError('Category cannot be moved under itself or its descendant', {
			extensions: { code: 'VALIDATION_ERROR' },
		});
	}

	const parentDepth = getDepth(parentId, parentMap);
	const subtreeHeight = categoryId ? getSubtreeMaxDepth(categoryId, categories, parentMap) : 1;
	const newRootDepth = parentDepth + 1;
	if (newRootDepth + subtreeHeight - 1 > MAX_CATEGORY_DEPTH) {
		throw new GraphQLError(`Category nesting cannot exceed ${MAX_CATEGORY_DEPTH} levels`, {
			extensions: { code: 'VALIDATION_ERROR' },
		});
	}
}

function buildTranslationCreates(input: CreateCategoryInput | UpdateCategoryInput) {
	const translations: Array<{
		language: Language;
		name: string;
		description?: string | null;
		metaTitle?: string | null;
		metaDescription?: string | null;
	}> = [];

	if ('nameEn' in input && input.nameEn) {
		translations.push({
			language: Language.EN,
			name: input.nameEn,
			description: input.descriptionEn ?? null,
			metaTitle: input.metaTitleEn ?? null,
			metaDescription: input.metaDescriptionEn ?? null,
		});
	}

	if ('nameUk' in input && input.nameUk) {
		translations.push({
			language: Language.UK,
			name: input.nameUk,
			description: input.descriptionUk ?? null,
			metaTitle: input.metaTitleUk ?? null,
			metaDescription: input.metaDescriptionUk ?? null,
		});
	}

	return translations;
}

export async function getCategoryTree(): Promise<CategoryTreeItem[]> {
	const categories = await loadCategoriesOrThrow();
	return buildTree(categories);
}

export async function getCategoryById(id: string): Promise<CategoryTreeItem | null> {
	const categories = await loadCategoriesOrThrow();
	const category = categories.find((c) => c.id === id);
	if (!category) return null;
	return serializeCategory(category, categories);
}

export async function createCategory(actorId: string, actorRole: Role, input: CreateCategoryInput) {
	assertAdminRole(actorRole);

	const categories = await loadCategoriesOrThrow();
	const parentId = input.parentId ?? null;
	validateParentDepth(null, parentId, categories);

	const existingSlug = await repo.findCategoryBySlugAdmin(input.slug);
	if (existingSlug) {
		throw new GraphQLError('Category slug already exists', {
			extensions: { code: 'VALIDATION_ERROR' },
		});
	}

	if (parentId) {
		const parent = categories.find((c) => c.id === parentId);
		if (!parent) {
			throw new GraphQLError('Parent category not found', { extensions: { code: 'NOT_FOUND' } });
		}
	}

	const sortOrder = (await repo.getMaxSortOrder(parentId)) + 1;
	const translations = buildTranslationCreates(input);
	if (translations.length === 0) {
		throw new GraphQLError('English name is required', {
			extensions: { code: 'VALIDATION_ERROR' },
		});
	}

	const created = await repo.createCategoryRecord({
		slug: input.slug,
		parentId,
		icon: input.icon ?? null,
		sortOrder,
		isActive: input.isActive ?? true,
		translations,
	});

	await auditLog.log({
		actorId,
		action: 'CATEGORY_CHANGE',
		targetType: 'Category',
		targetId: created.id,
		metadata: { operation: 'create', slug: created.slug },
	});

	const refreshed = await loadCategoriesOrThrow();
	return serializeCategory(created, refreshed);
}

export async function updateCategory(
	actorId: string,
	actorRole: Role,
	id: string,
	input: UpdateCategoryInput
) {
	assertAdminRole(actorRole);

	const categories = await loadCategoriesOrThrow();
	const existing = categories.find((c) => c.id === id);
	if (!existing) {
		throw new GraphQLError('Category not found', { extensions: { code: 'NOT_FOUND' } });
	}

	if (input.slug && input.slug !== existing.slug) {
		const slugConflict = await repo.findCategoryBySlugAdmin(input.slug, id);
		if (slugConflict) {
			throw new GraphQLError('Category slug already exists', {
				extensions: { code: 'VALIDATION_ERROR' },
			});
		}
	}

	if (input.parentId !== undefined) {
		validateParentDepth(id, input.parentId, categories);
	}

	const updateData: Parameters<typeof repo.updateCategoryRecord>[1] = {};
	if (input.slug !== undefined) updateData.slug = input.slug;
	if (input.parentId !== undefined) updateData.parentId = input.parentId;
	if (input.icon !== undefined) updateData.icon = input.icon;
	if (input.isActive !== undefined) updateData.isActive = input.isActive;

	const updated = await repo.updateCategoryRecord(id, updateData);

	const translations = buildTranslationCreates(input);
	for (const tr of translations) {
		await repo.upsertCategoryTranslation(id, tr.language, {
			name: tr.name,
			description: tr.description ?? null,
			metaTitle: tr.metaTitle ?? null,
			metaDescription: tr.metaDescription ?? null,
		});
	}

	await auditLog.log({
		actorId,
		action: 'CATEGORY_CHANGE',
		targetType: 'Category',
		targetId: id,
		metadata: { operation: 'update' },
	});

	const refreshed = await loadCategoriesOrThrow();
	const latest = refreshed.find((c) => c.id === updated.id) ?? updated;
	return serializeCategory(latest, refreshed);
}

export async function moveCategory(actorId: string, actorRole: Role, input: MoveCategoryInput) {
	assertAdminRole(actorRole);

	const categories = await loadCategoriesOrThrow();
	const existing = categories.find((c) => c.id === input.id);
	if (!existing) {
		throw new GraphQLError('Category not found', { extensions: { code: 'NOT_FOUND' } });
	}

	validateParentDepth(input.id, input.parentId, categories);

	if (input.parentId) {
		const parent = categories.find((c) => c.id === input.parentId);
		if (!parent) {
			throw new GraphQLError('Parent category not found', { extensions: { code: 'NOT_FOUND' } });
		}
	}

	const siblings = categories
		.filter((c) => c.parentId === input.parentId && c.id !== input.id)
		.sort((a, b) => a.sortOrder - b.sortOrder)
		.map((c) => c.id);

	const insertAt = Math.min(input.sortOrder, siblings.length);
	siblings.splice(insertAt, 0, input.id);
	await repo.reorderSiblings(input.parentId, siblings);

	await auditLog.log({
		actorId,
		action: 'CATEGORY_CHANGE',
		targetType: 'Category',
		targetId: input.id,
		metadata: { operation: 'move', parentId: input.parentId, sortOrder: input.sortOrder },
	});

	const refreshed = await loadCategoriesOrThrow();
	const moved = refreshed.find((c) => c.id === input.id);
	if (!moved) {
		throw new GraphQLError('Category not found after move', { extensions: { code: 'NOT_FOUND' } });
	}
	return serializeCategory(moved, refreshed);
}

export async function deleteCategory(actorId: string, actorRole: Role, id: string) {
	assertAdminRole(actorRole);

	const categories = await loadCategoriesOrThrow();
	const existing = categories.find((c) => c.id === id);
	if (!existing) {
		throw new GraphQLError('Category not found', { extensions: { code: 'NOT_FOUND' } });
	}

	const productCount = await repo.countCategoryProducts(id);
	if (productCount > 0) {
		throw new GraphQLError('Cannot delete category with assigned products', {
			extensions: { code: 'VALIDATION_ERROR' },
		});
	}

	if (existing._count.children > 0) {
		throw new GraphQLError('Cannot delete category with child categories', {
			extensions: { code: 'VALIDATION_ERROR' },
		});
	}

	await repo.softDeleteCategory(id);

	await auditLog.log({
		actorId,
		action: 'CATEGORY_CHANGE',
		targetType: 'Category',
		targetId: id,
		metadata: { operation: 'delete' },
	});

	return true;
}

export async function updateCategoryTranslation(
	actorId: string,
	actorRole: Role,
	input: UpdateCategoryTranslationInput
) {
	assertAdminRole(actorRole);

	const category = await repo.findCategoryById(input.categoryId);
	if (!category) {
		throw new GraphQLError('Category not found', { extensions: { code: 'NOT_FOUND' } });
	}

	await repo.upsertCategoryTranslation(input.categoryId, input.language, {
		name: input.name,
		description: input.description ?? null,
		metaTitle: input.metaTitle ?? null,
		metaDescription: input.metaDescription ?? null,
	});

	await auditLog.log({
		actorId,
		action: 'CATEGORY_CHANGE',
		targetType: 'Category',
		targetId: input.categoryId,
		metadata: { operation: 'translation', language: input.language },
	});

	const categories = await loadCategoriesOrThrow();
	const refreshed = categories.find((c) => c.id === input.categoryId)!;
	return serializeCategory(refreshed, categories);
}
