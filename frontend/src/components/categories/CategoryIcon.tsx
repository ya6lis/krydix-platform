import { Box } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { Icons } from '@/constants/icons';
import { tokens } from '@/theme';

import styles from './CategoryIcon.module.scss';

interface CategoryIconProps {
	icon?: string | null;
	fallbackName?: string;
	size?: 'sm' | 'md';
	level?: number;
}

function resolveIcon(icon?: string | null): IconDefinition | null {
	if (!icon) return null;
	if (icon in Icons) {
		return Icons[icon as keyof typeof Icons] as IconDefinition;
	}
	return null;
}

function resolveLetter(icon: string | null | undefined, fallbackName?: string): string {
	if (icon && !(icon in Icons)) {
		return icon.slice(0, 1).toUpperCase();
	}
	const source = fallbackName?.trim();
	if (!source) return '?';
	return source.slice(0, 1).toUpperCase();
}

const LEVEL_STYLES: Record<number, { bg: string; color: string }> = {
	1: { bg: tokens.accentSoft, color: tokens.accentInk },
	2: { bg: tokens.cyanSoft, color: tokens.cyanInk },
	3: { bg: tokens.amberSoft, color: tokens.amberInk },
	4: { bg: tokens.surface2, color: tokens.ink3 },
};

export function CategoryIcon({ icon, fallbackName, size = 'sm', level = 1 }: CategoryIconProps) {
	const faIcon = resolveIcon(icon);
	const dimension = size === 'sm' ? 22 : 28;
	const fontSize = size === 'sm' ? 11 : 13;
	const levelStyle = LEVEL_STYLES[Math.min(Math.max(level, 1), 4)] ?? LEVEL_STYLES[1];

	return (
		<Box
			className={styles.icon}
			sx={{
				width: dimension,
				height: dimension,
				fontSize,
				bgcolor: levelStyle.bg,
				color: levelStyle.color,
			}}
		>
			{faIcon ? <FontAwesomeIcon icon={faIcon} size="xs" /> : resolveLetter(icon, fallbackName)}
		</Box>
	);
}

export const CATEGORY_ICON_OPTIONS = [
	{ value: '', labelKey: 'adminCategories.form.iconNone' },
	{ value: 'tags', labelKey: 'adminCategories.form.iconTags' },
	{ value: 'category', labelKey: 'adminCategories.form.iconCategory' },
	{ value: 'product', labelKey: 'adminCategories.form.iconProduct' },
	{ value: 'products', labelKey: 'adminCategories.form.iconProducts' },
	{ value: 'store', labelKey: 'adminCategories.form.iconStore' },
	{ value: 'home', labelKey: 'adminCategories.form.iconHome' },
	{ value: 'layers', labelKey: 'adminCategories.form.iconLayers' },
	{ value: 'cart', labelKey: 'adminCategories.form.iconCart' },
] as const;

export function getCategoryIconPreviewProps(iconKey: string, label: string) {
	return {
		icon: iconKey || null,
		fallbackName: label,
		level: 1 as const,
	};
}
