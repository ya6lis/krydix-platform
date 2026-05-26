import type { CategoryTreeItem } from '@/graphql/operations/categories';

export interface FlatCategoryNode extends CategoryTreeItem {
	treeDepth: number;
}

export function getTranslationName(
	category: CategoryTreeItem,
	language: 'EN' | 'UK' = 'EN',
): string {
	return (
		category.translations.find((tr) => tr.language === language)?.name ??
		category.translations.find((tr) => tr.language === 'EN')?.name ??
		category.slug
	);
}

export function flattenCategoryTree(
	nodes: CategoryTreeItem[],
	expandedIds: Set<string>,
	treeDepth = 1,
): FlatCategoryNode[] {
	const result: FlatCategoryNode[] = [];
	for (const node of nodes) {
		result.push({ ...node, treeDepth });
		if (expandedIds.has(node.id) && node.children.length > 0) {
			result.push(...flattenCategoryTree(node.children, expandedIds, treeDepth + 1));
		}
	}
	return result;
}

export function collectCategoryIds(nodes: CategoryTreeItem[]): string[] {
	const ids: string[] = [];
	const walk = (items: CategoryTreeItem[]) => {
		for (const item of items) {
			ids.push(item.id);
			if (item.children.length > 0) walk(item.children);
		}
	};
	walk(nodes);
	return ids;
}

export function findCategoryById(
	nodes: CategoryTreeItem[],
	id: string,
): CategoryTreeItem | undefined {
	for (const node of nodes) {
		if (node.id === id) return node;
		const found = findCategoryById(node.children, id);
		if (found) return found;
	}
	return undefined;
}

export function collectDescendantIds(nodes: CategoryTreeItem[], rootId: string): Set<string> {
	const ids = new Set<string>([rootId]);
	const root = findCategoryById(nodes, rootId);
	if (!root) return ids;

	const walk = (items: CategoryTreeItem[]) => {
		for (const item of items) {
			ids.add(item.id);
			walk(item.children);
		}
	};
	walk(root.children);
	return ids;
}

export function buildParentPath(
	nodes: CategoryTreeItem[],
	categoryId: string,
	language: 'EN' | 'UK' = 'EN',
): string {
	const path: string[] = [];
	let current = findCategoryById(nodes, categoryId);
	while (current) {
		path.unshift(getTranslationName(current, language));
		current = current.parentId ? findCategoryById(nodes, current.parentId) : undefined;
	}
	return path.join(' › ');
}

export function buildParentOptions(
	nodes: CategoryTreeItem[],
	excludeIds: Set<string>,
	language: 'EN' | 'UK' = 'EN',
): Array<{ value: string; label: string; depth: number }> {
	const options: Array<{ value: string; label: string; depth: number }> = [
		{ value: '', label: '—', depth: 0 },
	];

	const walk = (items: CategoryTreeItem[], prefix = '') => {
		for (const item of items) {
			if (excludeIds.has(item.id) || item.depth >= 4) continue;
			const name = getTranslationName(item, language);
			const label = prefix ? `${prefix} › ${name}` : name;
			options.push({ value: item.id, label, depth: item.depth });
			walk(item.children, label);
		}
	};

	walk(nodes);
	return options;
}

export function slugifyName(value: string): string {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-');
}
