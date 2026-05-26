import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Box, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { AppLoader, AppPagination, EmptyState } from '@/components/ui';
import { ProductCard } from '@/components/features/catalog/ProductCard';
import {
	CatalogFilters,
	PRICE_MIN,
	PRICE_MAX,
	buildCatalogFilterInput,
	type CatalogFilterState,
} from '@/components/features/catalog/CatalogFilters';
import { findCategoryName } from '@/components/features/catalog/CategoryFilterTree';
import {
	CATEGORIES_QUERY,
	PRODUCTS_QUERY,
	PRODUCT_BRANDS_WITH_COUNTS_QUERY,
} from '@/graphql/operations/catalog';
import { Icons } from '@/constants/icons';
import { ROUTES } from '@/constants/routes';
import { Role } from '@/constants/enums';
import { tokens } from '@/theme';
import { useAuth } from '@/hooks/useAuth';
import type {
	BrandCount,
	CatalogProduct,
	CategoryNode,
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

function buildFilterContext(filters: CatalogFilterState, categories: CategoryNode[]): string {
	const parts: string[] = [];

	if (filters.categorySlug) {
		const name = findCategoryName(categories, filters.categorySlug);
		if (name) parts.push(name);
	}

	filters.brands.forEach((b) => parts.push(b));

	return parts.length > 0 ? ' · ' + parts.join(' · ') : '';
}

type ViewMode = 'grid' | 'list';

const VIEW_ICONS: Record<ViewMode, (typeof Icons)[keyof typeof Icons]> = {
	grid: Icons.grip,
	list: Icons.listView,
};

export default function CatalogPage() {
	const { t, i18n } = useTranslation();
	const language = i18n.language === 'uk' ? 'UK' : 'EN';
	const { hasRole } = useAuth();
	const isSellerOrAdmin = hasRole(Role.SELLER, Role.ADMIN);

	const [filters, setFilters] = useState<CatalogFilterState>(INITIAL_FILTERS);
	const [sort, setSort] = useState<ProductSort>('NEWEST');
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
	const [viewMode, setViewMode] = useState<ViewMode>('grid');

	const filterInput = useMemo(() => buildCatalogFilterInput(filters), [filters]);

	const { data: categoryData } = useQuery<{ categories: CategoryNode[] }>(CATEGORIES_QUERY, {
		variables: { language },
	});
	const { data: brandData } = useQuery<{ productBrandsWithCounts: BrandCount[] }>(
		PRODUCT_BRANDS_WITH_COUNTS_QUERY
	);
	const { data, loading } = useQuery<{ products: ProductListResult }>(PRODUCTS_QUERY, {
		variables: { filter: filterInput, sort, page, pageSize, language },
	});

	const result = data?.products;
	const products: CatalogProduct[] = result?.items ?? [];
	const total = result?.total ?? 0;
	const pageStart = (page - 1) * pageSize + 1;
	const pageEnd = Math.min(page * pageSize, total);

	const categories = categoryData?.categories ?? [];
	const brands = brandData?.productBrandsWithCounts ?? [];

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

	const filterContext = buildFilterContext(filters, categories);

	return (
		<Box sx={{ width: '100%', maxWidth: 1520, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
			{/* ── page head ── */}
			<Box
				sx={{
					display: 'flex',
					alignItems: 'flex-start',
					justifyContent: 'space-between',
					mb: '28px',
					gap: 2,
				}}
			>
				<Box>
					<Typography
						component="h1"
						sx={{
							fontSize: 26,
							fontWeight: 800,
							letterSpacing: '-0.02em',
							color: tokens.ink1,
							lineHeight: 1.2,
						}}
					>
						{t('catalog.title')}
					</Typography>
					<Typography sx={{ fontSize: 14, color: tokens.ink3, mt: '4px' }}>
						{t('catalog.subtitle')}
					</Typography>
				</Box>

				{/* ── page actions: Export + New product (SELLER / ADMIN only) ── */}
				{isSellerOrAdmin && (
					<Box sx={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
						<Box
							component="button"
							sx={{
								display: 'inline-flex',
								alignItems: 'center',
								gap: '6px',
								border: `1px solid ${tokens.line}`,
								borderRadius: '8px',
								background: tokens.surface,
								color: tokens.ink1,
								fontSize: 13,
								fontWeight: 600,
								fontFamily: 'inherit',
								padding: '7px 14px',
								cursor: 'pointer',
								transition: 'border-color 120ms',
								'&:hover': { borderColor: tokens.ink3 },
							}}
						>
							<FontAwesomeIcon icon={Icons.upload} style={{ width: 13, height: 13 }} />
							{t('catalog.export')}
						</Box>
						<Box
							component={RouterLink}
							to={ROUTES.SELLER_PRODUCT_NEW}
							sx={{
								display: 'inline-flex',
								alignItems: 'center',
								gap: '6px',
								border: 'none',
								borderRadius: '8px',
								background: tokens.accent,
								color: '#fff',
								fontSize: 13,
								fontWeight: 600,
								fontFamily: 'inherit',
								padding: '7px 14px',
								cursor: 'pointer',
								textDecoration: 'none',
								transition: 'opacity 120ms',
								'&:hover': { opacity: 0.88 },
							}}
						>
							<FontAwesomeIcon icon={Icons.add} style={{ width: 13, height: 13 }} />
							{t('catalog.newProduct')}
						</Box>
					</Box>
				)}
			</Box>

			{/* ── content grid: 240px filters | 1fr listing ── */}
			<Box
				sx={{
					display: 'grid',
					gridTemplateColumns: { xs: '1fr', md: '240px 1fr' },
					gap: '28px',
					alignItems: 'start',
				}}
			>
				{/* ── filters sidebar (sticky) ── */}
				<Box component="aside" sx={{ alignSelf: 'start', position: 'sticky', top: '84px' }}>
					<CatalogFilters
						categories={categories}
						brands={brands}
						value={filters}
						onChange={updateFilters}
						onClear={() => updateFilters(INITIAL_FILTERS)}
					/>
				</Box>

				{/* ── listing ── */}
				<Box sx={{ minWidth: 0 }}>
					{/* listing head */}
					<Box
						sx={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							mb: '18px',
							gap: '12px',
							flexWrap: 'wrap',
						}}
					>
						{/* meta — "Showing 1–12 of 4,328 · Outerwear · Heritage Co." */}
						<Typography data-cy="results-count" sx={{ fontSize: 13, color: tokens.ink3 }}>
							{total > 0 ? (
								<>
									{t('pagination.showing', { from: pageStart, to: pageEnd, total })}
									{filterContext && (
										<Box component="span" sx={{ color: tokens.ink1, fontWeight: 700 }}>
											{filterContext}
										</Box>
									)}
								</>
							) : (
								t('catalog.resultsCount', { count: total })
							)}
						</Typography>

						{/* controls */}
						<Box sx={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
							{/* grid / list toggle */}
							<Box
								sx={{
									display: 'inline-flex',
									background: tokens.bg,
									borderRadius: '8px',
									padding: '3px',
									border: `1px solid ${tokens.line}`,
								}}
							>
								{(['grid', 'list'] as const).map((mode) => (
									<Box
										key={mode}
										component="button"
										onClick={() => setViewMode(mode)}
										sx={{
											background: viewMode === mode ? tokens.surface : 'transparent',
											color: viewMode === mode ? tokens.ink1 : tokens.ink3,
											boxShadow: viewMode === mode ? tokens.shadowSm : 'none',
											border: 'none',
											padding: '5px 10px',
											borderRadius: '6px',
											cursor: 'pointer',
											display: 'grid',
											placeItems: 'center',
											fontSize: 13,
											transition: 'background 100ms',
										}}
									>
										<FontAwesomeIcon icon={VIEW_ICONS[mode]} style={{ width: 14, height: 14 }} />
									</Box>
								))}
							</Box>

							{/* sort — native select styled as ghost button */}
							<Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
								<Box
									component="select"
									value={sort}
									onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
										setSort(e.target.value as ProductSort);
										setPage(1);
									}}
									data-cy="sort-select"
									sx={{
										appearance: 'none',
										border: `1px solid ${tokens.line}`,
										borderRadius: '8px',
										background: tokens.surface,
										color: tokens.ink1,
										fontSize: '12px',
										fontWeight: 600,
										fontFamily: 'inherit',
										padding: '5px 28px 5px 10px',
										cursor: 'pointer',
										outline: 'none',
										transition: 'border-color 120ms',
										'&:hover': { borderColor: tokens.ink3 },
									}}
								>
									{sortOptions.map((o) => (
										<option key={o.value} value={o.value}>
											{`${t('catalog.sortLabel')}: ${o.label}`}
										</option>
									))}
								</Box>
								<Box
									sx={{
										position: 'absolute',
										right: 8,
										pointerEvents: 'none',
										fontSize: 11,
										color: tokens.ink3,
									}}
								>
									<FontAwesomeIcon icon={Icons.angleDown} />
								</Box>
							</Box>
						</Box>
					</Box>

					{/* products */}
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
									gridTemplateColumns:
										viewMode === 'grid' ? { xs: '1fr', sm: 'repeat(auto-fit, 280px)' } : '1fr',
									gap: '20px',
									justifyContent: 'center',
								}}
							>
								{products.map((product) => (
									<ProductCard key={product.id} product={product} />
								))}
							</Box>

							{/* pagination */}
							<Box
								sx={{
									mt: '20px',
									border: `1px solid ${tokens.line}`,
									borderRadius: `${tokens.radius}px`,
									background: tokens.surface,
								}}
							>
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
		</Box>
	);
}
