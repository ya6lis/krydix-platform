import { useEffect, useMemo, useState } from 'react';
import {
	DndContext,
	DragEndEvent,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Box, Stack, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslation } from 'react-i18next';

import { Icons } from '@/constants/icons';
import { AppButton, AppCard, AppInput, AppSelect, EmptyState } from '@/components/ui';
import { CategoryTreeNode } from '@/components/categories/CategoryTreeNode';
import type { CategoryTreeItem } from '@/graphql/operations/categories';
import { collectCategoryIds, flattenCategoryTree, findCategoryById } from '@/utils/categoryTree';

import styles from './CategoryTreePanel.module.scss';

interface CategoryTreePanelProps {
	tree: CategoryTreeItem[];
	loading?: boolean;
	selectedId: string | null;
	displayLanguage: 'EN' | 'UK';
	onDisplayLanguageChange: (language: 'EN' | 'UK') => void;
	onSelect: (id: string) => void;
	onAddChild: (parentId: string) => void;
	onToggleActive: (id: string, isActive: boolean) => void;
	onMove: (id: string, parentId: string | null, sortOrder: number) => void;
}

export function CategoryTreePanel({
	tree,
	loading,
	selectedId,
	displayLanguage,
	onDisplayLanguageChange,
	onSelect,
	onAddChild,
	onToggleActive,
	onMove,
}: CategoryTreePanelProps) {
	const { t } = useTranslation();
	const [search, setSearch] = useState('');
	const [expandedIds, setExpandedIds] = useState<Set<string>>(
		() => new Set(collectCategoryIds(tree))
	);

	useEffect(() => {
		setExpandedIds((prev) => new Set([...prev, ...collectCategoryIds(tree)]));
	}, [tree]);

	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

	const filteredTree = useMemo(() => {
		if (!search.trim()) return tree;
		const q = search.trim().toLowerCase();

		const filterNodes = (nodes: CategoryTreeItem[]): CategoryTreeItem[] =>
			nodes
				.map((node) => {
					const childMatches = filterNodes(node.children);
					const selfMatch =
						node.slug.toLowerCase().includes(q) ||
						node.translations.some((tr) => tr.name.toLowerCase().includes(q));
					if (selfMatch || childMatches.length > 0) {
						return { ...node, children: childMatches.length > 0 ? childMatches : node.children };
					}
					return null;
				})
				.filter(Boolean) as CategoryTreeItem[];

		return filterNodes(tree);
	}, [tree, search]);

	const flatNodes = useMemo(
		() => flattenCategoryTree(filteredTree, expandedIds),
		[filteredTree, expandedIds]
	);

	const sortableIds = useMemo(() => flatNodes.map((n) => n.id), [flatNodes]);

	const handleToggleExpand = (id: string) => {
		setExpandedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const handleExpandAll = () => setExpandedIds(new Set(collectCategoryIds(tree)));
	const handleCollapseAll = () => setExpandedIds(new Set());

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const activeNode = flatNodes.find((n) => n.id === active.id);
		const overNode = flatNodes.find((n) => n.id === over.id);
		if (!activeNode || !overNode || activeNode.parentId !== overNode.parentId) return;

		const siblings = flatNodes.filter((n) => n.parentId === activeNode.parentId);
		const newIndex = siblings.findIndex((n) => n.id === over.id);
		if (newIndex < 0) return;

		onMove(activeNode.id, activeNode.parentId, newIndex);
	};

	return (
		<AppCard disablePadding className={styles.treeCard} data-testid="category-tree">
			<Box className={styles.toolbar}>
				<Box className={styles.searchField}>
					<FontAwesomeIcon icon={Icons.search} size="sm" color="#8794A1" />
					<AppInput
						placeholder={t('adminCategories.tree.searchPlaceholder')}
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						variant="standard"
						fullWidth
						InputProps={{ disableUnderline: true }}
						sx={{
							minWidth: 0,
							'& .MuiInputBase-root': { p: 0, bgcolor: 'transparent' },
							'& input': { fontSize: 13, p: 0 },
						}}
					/>
				</Box>
				<Box className={styles.toolbarActions}>
					<AppSelect
						className={styles.langSelect}
						options={[
							{ value: 'EN', label: t('adminCategories.tree.languageEn') },
							{ value: 'UK', label: t('adminCategories.tree.languageUk') },
						]}
						value={displayLanguage}
						onChange={(e) => onDisplayLanguageChange(e.target.value as 'EN' | 'UK')}
					/>
					<AppButton
						tone="ghost"
						size="small"
						className={styles.toolbarBtn}
						onClick={handleExpandAll}
					>
						{t('adminCategories.tree.expandAll')}
					</AppButton>
					<AppButton
						tone="ghost"
						size="small"
						className={styles.toolbarBtn}
						onClick={handleCollapseAll}
					>
						{t('adminCategories.tree.collapseAll')}
					</AppButton>
				</Box>
			</Box>

			{loading ? (
				<Stack p={3} alignItems="center">
					<Typography color="text.secondary">{t('common.loading')}</Typography>
				</Stack>
			) : flatNodes.length === 0 ? (
				<EmptyState
					title={t('adminCategories.tree.emptyTitle')}
					description={t('adminCategories.tree.emptyDescription')}
				/>
			) : (
				<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
					<SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
						<Box className={styles.tree}>
							{flatNodes.map((node) => {
								const source = findCategoryById(tree, node.id);
								return (
									<CategoryTreeNode
										key={node.id}
										node={node}
										isSelected={selectedId === node.id}
										isExpanded={expandedIds.has(node.id)}
										hasChildren={(source?.children.length ?? 0) > 0}
										displayLanguage={displayLanguage}
										onSelect={onSelect}
										onToggleExpand={handleToggleExpand}
										onAddChild={onAddChild}
										onToggleActive={onToggleActive}
									/>
								);
							})}
						</Box>
					</SortableContext>
				</DndContext>
			)}
		</AppCard>
	);
}
