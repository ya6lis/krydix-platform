import { useEffect, useState } from 'react';
import { Box, IconButton } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslation } from 'react-i18next';

import { Icons } from '@/constants/icons';
import { tokens } from '@/theme';
import type { CategoryNode } from '@/types/catalog';

interface CheckRowProps {
	label: string;
	count?: number;
	checked: boolean;
	onChange: (next: boolean) => void;
}

function CheckRow({ label, count, checked, onChange }: CheckRowProps) {
	return (
		<Box
			component="label"
			sx={{
				display: 'flex',
				alignItems: 'center',
				gap: '10px',
				flex: 1,
				minWidth: 0,
				fontSize: 13.5,
				color: tokens.ink2,
				cursor: 'pointer',
				'&:hover': { color: tokens.ink1 },
			}}
		>
			<Box
				component="input"
				type="checkbox"
				checked={checked}
				onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.checked)}
				sx={{
					accentColor: tokens.accent,
					width: 16,
					height: 16,
					cursor: 'pointer',
					flexShrink: 0,
				}}
			/>
			<Box component="span" sx={{ flex: 1, minWidth: 0 }}>
				{label}
			</Box>
			{count !== undefined && (
				<Box component="span" sx={{ fontSize: 11.5, color: tokens.ink3, ml: 'auto', flexShrink: 0 }}>
					{count.toLocaleString()}
				</Box>
			)}
		</Box>
	);
}

function getChildren(node: CategoryNode): CategoryNode[] {
	return node.children ?? [];
}

function findCategoryPath(nodes: CategoryNode[], slug: string): string[] {
	for (const node of nodes) {
		if (node.slug === slug) return [node.id];
		const childPath = findCategoryPath(getChildren(node), slug);
		if (childPath.length > 0) return [node.id, ...childPath];
	}
	return [];
}

interface CategoryFilterTreeProps {
	categories: CategoryNode[];
	selectedSlug?: string;
	onSelect: (slug: string | undefined) => void;
}

export function CategoryFilterTree({ categories, selectedSlug, onSelect }: CategoryFilterTreeProps) {
	const { t } = useTranslation();
	const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

	useEffect(() => {
		if (!selectedSlug) return;
		const pathIds = findCategoryPath(categories, selectedSlug);
		if (pathIds.length === 0) return;
		setExpandedIds((prev) => new Set([...prev, ...pathIds.slice(0, -1)]));
	}, [categories, selectedSlug]);

	const toggleExpand = (id: string) => {
		setExpandedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const renderNode = (node: CategoryNode, depth: number) => {
		const children = getChildren(node);
		const hasChildren = children.length > 0;
		const isExpanded = expandedIds.has(node.id);

		return (
			<Box key={node.id}>
				<Box
					sx={{
						display: 'flex',
						alignItems: 'center',
						gap: '4px',
						pl: `${depth * 16}px`,
					}}
				>
					{hasChildren ? (
						<IconButton
							size="small"
							onClick={() => toggleExpand(node.id)}
							aria-label={
								isExpanded
									? t('catalog.filters.collapseCategory')
									: t('catalog.filters.expandCategory')
							}
							sx={{
								width: 22,
								height: 22,
								color: tokens.ink3,
								flexShrink: 0,
								'&:hover': { bgcolor: tokens.surface2, color: tokens.ink1 },
							}}
						>
							<FontAwesomeIcon
								icon={Icons.chevronRight}
								size="xs"
								style={{
									transform: isExpanded ? 'rotate(90deg)' : undefined,
									transition: 'transform 120ms',
								}}
							/>
						</IconButton>
					) : (
						<Box sx={{ width: 22, flexShrink: 0 }} />
					)}
					<CheckRow
						label={node.name}
						count={node.productCount}
						checked={selectedSlug === node.slug}
						onChange={(checked) => onSelect(checked ? node.slug : undefined)}
					/>
				</Box>
				{hasChildren &&
					isExpanded &&
					children.map((child) => renderNode(child, depth + 1))}
			</Box>
		);
	};

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
			{categories.map((node) => renderNode(node, 0))}
		</Box>
	);
}

export function findCategoryName(nodes: CategoryNode[], slug: string): string | undefined {
	for (const node of nodes) {
		if (node.slug === slug) return node.name;
		const childName = findCategoryName(getChildren(node), slug);
		if (childName) return childName;
	}
	return undefined;
}
