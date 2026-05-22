import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Stack } from '@mui/material';
import {
	AppLoader,
	AppSelect,
	AppPagination,
	EmptyState,
	PageSectionWrapper,
} from '@/components/ui';
import { ProductCard } from '@/components/features/catalog/ProductCard';
import {
	CatalogFilters,
	PRICE_MIN,
	PRICE_MAX,
	type CatalogFilterState,
} from '@/components/features/catalog/CatalogFilters';
import {
	CATEGORIES_QUERY,
	PRODUCTS_QUERY,
	PRODUCT_BRANDS_QUERY,
} from '@/graphql/operations/catalog';
import { Icons } from '@/constants/icons';
import type {
	CatalogProduct,
	CategoryNode,
	ProductFilterInput,
	ProductListResult,
	ProductSort,
} from '@/types/catalog';

const PAGE_SIZE_OPTIONS = [12, 24, 48, 96];
const DEFAULT_PAGE_SIZE = 24;

const INITIAL_FILTERS: CatalogFilterState = {
	brands: [],
	priceRange: [PRICE_MIN, PRICE_MAX],
	inStockOnly: false,
};

function buildFilterInput(f: CatalogFilterState): ProductFilterInput {
	const input: ProductFilterInput = {};
	if (f.categorySlug) input.categorySlug = f.categorySlug;
	if (f.brands.length > 0) input.brands = f.brands;
	if (f.priceRange[0] > PRICE_MIN) input.minPrice = f.priceRange[0];
	if (f.priceRange[1] < PRICE_MAX) input.maxPrice = f.priceRange[1];
	if (f.minRating) input.minRating = f.minRating;
	if (f.inStockOnly) input.inStockOnly = true;
	return input;
}

export default function CatalogPage() {
	const { t, i18n } = useTranslation();
	const language = i18n.language === 'uk' ? 'UK' : 'EN';

	const [filters, setFilters] = useState<CatalogFilterState>(INITIAL_FILTERS);
	const [sort, setSort] = useState<ProductSort>('NEWEST');
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

	const filterInput = useMemo(() => buildFilterInput(filters), [filters]);

	const { data: categoryData } = useQuery<{ categories: CategoryNode[] }>(CATEGORIES_QUERY, {
		variables: { language },
	});
	const { data: brandData } = useQuery<{ productBrands: string[] }>(PRODUCT_BRANDS_QUERY);
	const { data, loading } = useQuery<{ products: ProductListResult }>(PRODUCTS_QUERY, {
		variables: { filter: filterInput, sort, page, pageSize, language },
	});

	const result = data?.products;
	const products: CatalogProduct[] = result?.items ?? [];
	const total = result?.total ?? 0;

	const updateFilters = (next: CatalogFilterState) => {
		setFilters(next);
		setPage(1);
	};

	const sortOptions = [
		{ value: 'NEWEST', label: t('catalog.sort.newest') },
		{ value: 'POPULARITY', label: t('catalog.sort.popularity') },
		{ value: 'PRICE_ASC', label: t('catalog.sort.priceAsc') },
		{ value: 'PRICE_DESC', label: t('catalog.sort.priceDesc') },
		{ value: 'RATING', label: t('catalog.sort.rating') },
	];

	return (
		<Box sx={{ maxWidth: 1500, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
			<PageSectionWrapper title={t('catalog.title')} subtitle={t('catalog.subtitle')}>
				<Box
					sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '240px 1fr' }, gap: 3.5 }}
				>
					<Box component="aside">
						<CatalogFilters
							categories={categoryData?.categories ?? []}
							brands={brandData?.productBrands ?? []}
							value={filters}
							onChange={updateFilters}
							onClear={() => updateFilters(INITIAL_FILTERS)}
						/>
					</Box>

					<Box sx={{ minWidth: 0 }}>
						<Stack
							direction="row"
							alignItems="center"
							justifyContent="space-between"
							flexWrap="wrap"
							gap={1.5}
							mb={2.25}
						>
							<Typography variant="body2" color="text.secondary">
								{t('catalog.resultsCount', { count: total })}
							</Typography>
							<Box sx={{ width: 200 }}>
								<AppSelect
									label={t('catalog.sortLabel')}
									options={sortOptions}
									value={sort}
									onChange={(e) => {
										setSort(e.target.value as ProductSort);
										setPage(1);
									}}
								/>
							</Box>
						</Stack>

						{loading ? (
							<AppLoader />
						) : products.length === 0 ? (
							<EmptyState
								icon={Icons.products}
								title={t('catalog.empty.title')}
								description={t('catalog.empty.description')}
							/>
						) : (
							<>
								<Box
									sx={{
										display: 'grid',
										gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' },
										gap: 2.5,
									}}
								>
									{products.map((product) => (
										<ProductCard key={product.id} product={product} />
									))}
								</Box>
								<Box mt={3}>
									<AppPagination
										page={page - 1}
										pageSize={pageSize}
										total={total}
										pageSizeOptions={PAGE_SIZE_OPTIONS}
										onChange={(nextPage, nextSize) => {
											setPageSize(nextSize);
											setPage(nextSize !== pageSize ? 1 : nextPage + 1);
										}}
									/>
								</Box>
							</>
						)}
					</Box>
				</Box>
			</PageSectionWrapper>
		</Box>
	);
}
