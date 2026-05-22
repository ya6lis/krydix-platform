import { Box, Typography, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { AppCheckbox, AppButton, RangeSlider } from '@/components/ui';
import { tokens } from '@/theme';
import type { CategoryNode } from '@/types/catalog';

export const PRICE_MIN = 0;
export const PRICE_MAX = 1000;

export interface CatalogFilterState {
	categorySlug?: string;
	brands: string[];
	priceRange: [number, number];
	minRating?: number;
	inStockOnly: boolean;
}

export interface CatalogFiltersProps {
	categories: CategoryNode[];
	brands: string[];
	value: CatalogFilterState;
	onChange: (next: CatalogFilterState) => void;
	onClear: () => void;
}

function FilterBlock({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<Box>
			<Typography
				sx={{
					fontSize: 11.5,
					fontWeight: 700,
					letterSpacing: '0.08em',
					textTransform: 'uppercase',
					color: 'text.secondary',
					mb: 1.5,
				}}
			>
				{title}
			</Typography>
			{children}
		</Box>
	);
}

/** Catalog filter sidebar — category, price, brand, rating, availability. */
export function CatalogFilters({
	categories,
	brands,
	value,
	onChange,
	onClear,
}: CatalogFiltersProps) {
	const { t } = useTranslation();

	const flatCategories = categories.flatMap((root) => [
		{ node: root, depth: 0 },
		...root.children.map((child) => ({ node: child, depth: 1 })),
	]);

	const toggleBrand = (brand: string) => {
		const next = value.brands.includes(brand)
			? value.brands.filter((b) => b !== brand)
			: [...value.brands, brand];
		onChange({ ...value, brands: next });
	};

	return (
		<Stack spacing={3}>
			<FilterBlock title={t('catalog.filters.category')}>
				<Stack spacing={0.5}>
					{flatCategories.map(({ node, depth }) => {
						const active = value.categorySlug === node.slug;
						return (
							<Box
								key={node.id}
								component="button"
								type="button"
								onClick={() => onChange({ ...value, categorySlug: active ? undefined : node.slug })}
								sx={{
									border: 0,
									background: 'none',
									cursor: 'pointer',
									textAlign: 'left',
									display: 'flex',
									alignItems: 'center',
									gap: 1,
									pl: depth * 1.5,
									py: 0.5,
									fontFamily: 'inherit',
									fontSize: 13.5,
									fontWeight: active ? 700 : 500,
									color: active ? 'primary.dark' : 'text.secondary',
								}}
							>
								<span>{node.name}</span>
								<Box component="span" sx={{ ml: 'auto', fontSize: 11.5, color: 'text.disabled' }}>
									{node.productCount}
								</Box>
							</Box>
						);
					})}
				</Stack>
			</FilterBlock>

			<FilterBlock title={t('catalog.filters.price')}>
				<RangeSlider
					min={PRICE_MIN}
					max={PRICE_MAX}
					step={5}
					prefix="$"
					value={value.priceRange}
					onChange={(range) => onChange({ ...value, priceRange: range })}
				/>
			</FilterBlock>

			{brands.length > 0 && (
				<FilterBlock title={t('catalog.filters.brand')}>
					<Stack>
						{brands.map((brand) => (
							<AppCheckbox
								key={brand}
								label={brand}
								checked={value.brands.includes(brand)}
								onChange={() => toggleBrand(brand)}
							/>
						))}
					</Stack>
				</FilterBlock>
			)}

			<FilterBlock title={t('catalog.filters.rating')}>
				<Stack spacing={0.5}>
					{[5, 4, 3].map((rating) => {
						const active = value.minRating === rating;
						return (
							<Box
								key={rating}
								component="button"
								type="button"
								onClick={() => onChange({ ...value, minRating: active ? undefined : rating })}
								sx={{
									border: 0,
									background: 'none',
									cursor: 'pointer',
									textAlign: 'left',
									py: 0.5,
									fontFamily: 'inherit',
									fontSize: 13.5,
									fontWeight: active ? 700 : 500,
									color: active ? 'primary.dark' : 'text.secondary',
								}}
							>
								<Box component="span" sx={{ color: tokens.amber }}>
									{'★'.repeat(rating)}
								</Box>
								<Box component="span" sx={{ color: tokens.line }}>
									{'★'.repeat(5 - rating)}
								</Box>{' '}
								{t('catalog.filters.andUp')}
							</Box>
						);
					})}
				</Stack>
			</FilterBlock>

			<FilterBlock title={t('catalog.filters.availability')}>
				<AppCheckbox
					label={t('catalog.filters.inStockOnly')}
					checked={value.inStockOnly}
					onChange={(checked) => onChange({ ...value, inStockOnly: checked })}
				/>
			</FilterBlock>

			<AppButton variant="outlined" fullWidth onClick={onClear}>
				{t('catalog.filters.clearAll')}
			</AppButton>
		</Stack>
	);
}
