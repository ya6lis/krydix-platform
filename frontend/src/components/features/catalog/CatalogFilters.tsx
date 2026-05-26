import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { RangeSlider } from '@/components/ui';
import { tokens } from '@/theme';
import { CategoryFilterTree } from '@/components/features/catalog/CategoryFilterTree';
import type { BrandCount, CategoryNode, ProductFilterInput } from '@/types/catalog';

export const PRICE_MIN = 0;
export const PRICE_MAX = 1000;

export interface CatalogFilterState {
	categorySlug?: string;
	brands: string[];
	priceRange: [number, number];
	minRating?: number;
	inStockOnly: boolean;
}

export function buildCatalogFilterInput(
	f: CatalogFilterState,
	extra: Partial<ProductFilterInput> = {},
): ProductFilterInput {
	const input: ProductFilterInput = { ...extra };
	if (f.categorySlug) input.categorySlug = f.categorySlug;
	if (f.brands.length > 0) input.brands = f.brands;
	if (f.priceRange[0] > PRICE_MIN) input.minPrice = f.priceRange[0];
	if (f.priceRange[1] < PRICE_MAX) input.maxPrice = f.priceRange[1];
	if (f.minRating) input.minRating = f.minRating;
	if (f.inStockOnly) input.inStockOnly = true;
	return input;
}

export function hasActiveCatalogFilters(f: CatalogFilterState, search = ''): boolean {
	return (
		!!search.trim() ||
		!!f.categorySlug ||
		f.brands.length > 0 ||
		f.priceRange[0] > PRICE_MIN ||
		f.priceRange[1] < PRICE_MAX ||
		!!f.minRating ||
		f.inStockOnly
	);
}

export interface CatalogFiltersProps {
	categories: CategoryNode[];
	brands: BrandCount[];
	value: CatalogFilterState;
	onChange: (next: CatalogFilterState) => void;
	onClear: () => void;
}

/** Uppercase label row matching .filter-block .title */
function FilterTitle({ children }: { children: React.ReactNode }) {
	return (
		<Typography
			sx={{
				fontSize: 11.5,
				fontWeight: 700,
				letterSpacing: '0.08em',
				textTransform: 'uppercase',
				color: tokens.ink3,
				mb: '12px',
			}}
		>
			{children}
		</Typography>
	);
}

/** Single checkbox row matching .check in Catalog.html */
function CheckRow({
	label,
	count,
	checked,
	onChange,
}: {
	label: string;
	count?: number;
	checked: boolean;
	onChange: (next: boolean) => void;
}) {
	return (
		<Box
			component="label"
			sx={{
				display: 'flex',
				alignItems: 'center',
				gap: '10px',
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
			<Box component="span" sx={{ flex: 1 }}>
				{label}
			</Box>
			{count !== undefined && (
				<Box component="span" sx={{ fontSize: 11.5, color: tokens.ink3, ml: 'auto' }}>
					{count.toLocaleString()}
				</Box>
			)}
		</Box>
	);
}

/** Star rating row — filled amber + dimmed grey for missing stars */
function StarRow({
	rating,
	checked,
	onClick,
}: {
	rating: number;
	checked: boolean;
	onClick: () => void;
}) {
	return (
		<Box
			component="label"
			sx={{
				display: 'flex',
				alignItems: 'center',
				gap: '10px',
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
				onChange={onClick}
				sx={{ accentColor: tokens.accent, width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }}
			/>
			<Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
				{Array.from({ length: 5 }, (_, i) => (
					<Box
						key={i}
						component="span"
						sx={{ color: i < rating ? tokens.amber : tokens.line, fontSize: 14 }}
					>
						★
					</Box>
				))}
			</Box>
		</Box>
	);
}

/** Catalog filter sidebar — matches Catalog.html .filters 1:1. */
export function CatalogFilters({
	categories,
	brands,
	value,
	onChange,
	onClear,
}: CatalogFiltersProps) {
	const { t } = useTranslation();

	const toggleBrand = (brand: string) => {
		const next = value.brands.includes(brand)
			? value.brands.filter((b) => b !== brand)
			: [...value.brands, brand];
		onChange({ ...value, brands: next });
	};

	const toggleRating = (rating: number) => {
		onChange({ ...value, minRating: value.minRating === rating ? undefined : rating });
	};

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingRight: '4px' }}>
			{/* Category */}
			<Box>
				<FilterTitle>{t('catalog.filters.category')}</FilterTitle>
				<CategoryFilterTree
					categories={categories}
					selectedSlug={value.categorySlug}
					onSelect={(categorySlug) => onChange({ ...value, categorySlug })}
				/>
			</Box>

			{/* Price */}
			<Box>
				<FilterTitle>{t('catalog.filters.price')}</FilterTitle>
				<RangeSlider
					min={PRICE_MIN}
					max={PRICE_MAX}
					step={5}
					prefix="$"
					value={value.priceRange}
					onChange={(range) => onChange({ ...value, priceRange: range })}
				/>
			</Box>

			{/* Brand */}
			{brands.length > 0 && (
				<Box>
					<FilterTitle>{t('catalog.filters.brand')}</FilterTitle>
					<Box sx={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
						{brands.map((b) => (
							<CheckRow
								key={b.name}
								label={b.name}
								count={b.count}
								checked={value.brands.includes(b.name)}
								onChange={() => toggleBrand(b.name)}
							/>
						))}
					</Box>
				</Box>
			)}

			{/* Rating */}
			<Box>
				<FilterTitle>{t('catalog.filters.rating')}</FilterTitle>
				<Box sx={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
					{[5, 4, 3].map((r) => (
						<StarRow
							key={r}
							rating={r}
							checked={value.minRating === r}
							onClick={() => toggleRating(r)}
						/>
					))}
				</Box>
			</Box>

			{/* Availability */}
			<Box>
				<FilterTitle>{t('catalog.filters.availability')}</FilterTitle>
				<Box sx={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
					<CheckRow
						label={t('catalog.filters.inStockOnly')}
						checked={value.inStockOnly}
						onChange={(checked) => onChange({ ...value, inStockOnly: checked })}
					/>
				</Box>
			</Box>

			{/* Clear button */}
			<Box
				component="button"
				onClick={onClear}
				sx={{
					border: `1px solid ${tokens.line}`,
					borderRadius: '8px',
					background: tokens.surface,
					color: tokens.ink2,
					fontSize: 13,
					fontWeight: 500,
					fontFamily: 'inherit',
					padding: '7px 16px',
					cursor: 'pointer',
					width: '100%',
					justifyContent: 'center',
					transition: 'border-color 120ms',
					'&:hover': { borderColor: tokens.ink3 },
				}}
			>
				{t('catalog.filters.clearAll')}
			</Box>
		</Box>
	);
}
