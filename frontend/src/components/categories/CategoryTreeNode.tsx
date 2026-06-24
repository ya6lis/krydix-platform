import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box, IconButton, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslation } from 'react-i18next';

import { Icons } from '@/constants/icons';
import { CategoryIcon } from '@/components/categories/CategoryIcon';
import type { FlatCategoryNode } from '@/utils/categoryTree';
import { getTranslationName } from '@/utils/categoryTree';

import styles from './CategoryTreeNode.module.scss';

interface CategoryTreeNodeProps {
	node: FlatCategoryNode;
	isSelected: boolean;
	isExpanded: boolean;
	hasChildren: boolean;
	displayLanguage: 'EN' | 'UK';
	onSelect: (id: string) => void;
	onToggleExpand: (id: string) => void;
	onAddChild: (parentId: string) => void;
	onToggleActive: (id: string, isActive: boolean) => void;
}

export function CategoryTreeNode({
	node,
	isSelected,
	isExpanded,
	hasChildren,
	displayLanguage,
	onSelect,
	onToggleExpand,
	onAddChild,
	onToggleActive,
}: CategoryTreeNodeProps) {
	const { t, i18n } = useTranslation();
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: node.id,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const name = getTranslationName(node, displayLanguage);

	return (
		<Box
			ref={setNodeRef}
			style={style}
			className={[
				styles.node,
				styles[`level${node.treeDepth}`],
				isSelected ? styles.selected : '',
				!node.isActive ? styles.disabled : '',
				isDragging ? styles.dragging : '',
			]
				.filter(Boolean)
				.join(' ')}
			data-testid={`category-node-${node.slug}`}
			onClick={() => onSelect(node.id)}
		>
			<Box className={styles.gripCell}>
				<Box
					className={styles.grip}
					{...attributes}
					{...listeners}
					onClick={(e) => e.stopPropagation()}
					aria-label={t('adminCategories.tree.dragHandle')}
				>
					<FontAwesomeIcon icon={Icons.grip} size="xs" />
				</Box>

				<IconButton
					size="small"
					className={[styles.chev, !hasChildren ? styles.empty : '', isExpanded ? styles.open : '']
						.filter(Boolean)
						.join(' ')}
					onClick={(e) => {
						e.stopPropagation();
						if (hasChildren) onToggleExpand(node.id);
					}}
					aria-label={t(
						isExpanded ? 'adminCategories.tree.collapse' : 'adminCategories.tree.expand'
					)}
				>
					<FontAwesomeIcon icon={Icons.chevronRight} size="xs" />
				</IconButton>

				<CategoryIcon icon={node.icon} fallbackName={name} level={node.treeDepth} />
			</Box>

			<Box className={styles.nameCell} minWidth={0}>
				<Typography component="span" className={styles.name}>
					{name}
				</Typography>
				<Typography component="span" className={styles.slug}>
					{node.treeDepth > 1 ? '…/' : '/'}
					{node.slug}
				</Typography>
			</Box>

			<Typography component="span" className={styles.count}>
				{node.productCount.toLocaleString(i18n.language)}
			</Typography>

			<IconButton
				size="small"
				className={styles.vis}
				onClick={(e) => {
					e.stopPropagation();
					onToggleActive(node.id, !node.isActive);
				}}
				aria-label={t(
					node.isActive ? 'adminCategories.tree.hideCategory' : 'adminCategories.tree.showCategory'
				)}
			>
				<FontAwesomeIcon icon={node.isActive ? Icons.eye : Icons.eyeOff} size="sm" />
			</IconButton>

			{node.depth < 4 ? (
				<button
					type="button"
					className={styles.addChild}
					onClick={(e) => {
						e.stopPropagation();
						onAddChild(node.id);
					}}
				>
					<FontAwesomeIcon icon={Icons.add} size="xs" />
					{t('adminCategories.tree.addSub')}
				</button>
			) : (
				<Box />
			)}

			<IconButton
				size="small"
				className={styles.actions}
				onClick={(e) => {
					e.stopPropagation();
					onSelect(node.id);
				}}
				aria-label={t('adminCategories.tree.actions')}
			>
				<FontAwesomeIcon icon={Icons.more} size="sm" />
			</IconButton>
		</Box>
	);
}
