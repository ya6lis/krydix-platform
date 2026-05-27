import { useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { Icons } from '@/constants/icons';
import { ROUTES } from '@/constants/routes';
import { AppButton, AppLoader, AppPagination, EmptyState } from '@/components/ui';
import { ProductCard } from '@/components/features/catalog/ProductCard';
import {
	CatalogFilters,
	PRICE_MIN,
	PRICE_MAX,
	buildCatalogFilterInput,
	hasActiveCatalogFilters,
	type CatalogFilterState,
} from '@/components/features/catalog/CatalogFilters';
import { findCategoryName } from '@/components/features/catalog/CategoryFilterTree';
import { PUBLIC_SELLER_PROFILE_QUERY } from '@/graphql/operations/publicProfile';
import {
	CATEGORIES_QUERY,
	PRODUCTS_QUERY,
	PRODUCT_BRANDS_WITH_COUNTS_QUERY,
} from '@/graphql/operations/catalog';
import { useAuthStore } from '@/store/authStore';
import { getSettingsRouteForUser } from '@/utils/roleAccess';
import type { BrandCount, CatalogProduct, CategoryNode, ProductListResult, ProductSort } from '@/types/catalog';
import styles from './PublicSellerProfilePage.module.scss';

const PAGE_SIZE = 12;

const INITIAL_FILTERS: CatalogFilterState = {
	brands: [],
	priceRange: [PRICE_MIN, PRICE_MAX],
	inStockOnly: false,
};

function initials(firstName: string, lastName: string): string {
	return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || 'S';
}

function formatMemberSince(iso: string, locale: string): string {
	return new Date(iso).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

function formatLocation(city: string | null, country: string | null): string | null {
	if (city && country) return `${city}, ${country}`;
	return city ?? country;
}

function buildFilterContext(filters: CatalogFilterState, categories: CategoryNode[]): string {
	const parts: string[] = [];

	if (filters.categorySlug) {
		const name = findCategoryName(categories, filters.categorySlug);
		if (name) parts.push(name);
	}

	filters.brands.forEach((brand) => parts.push(brand));

	return parts.length > 0 ? ` · ${parts.join(' · ')}` : '';
}

export default function PublicSellerProfilePage() {
	const { id = '' } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { t, i18n } = useTranslation();
	const language = i18n.language === 'uk' ? 'UK' : 'EN';
	const currentUser = useAuthStore((s) => s.user);
	const isOwner = currentUser?.id === id;

	const [search, setSearch] = useState('');
	const [catalogFilters, setCatalogFilters] = useState<CatalogFilterState>(INITIAL_FILTERS);
	const [sort, setSort] = useState<ProductSort>('NEWEST');
	const [page, setPage] = useState(1);

	const { data: profileData, loading: profileLoading, error: profileError } = useQuery(
		PUBLIC_SELLER_PROFILE_QUERY,
		{ variables: { sellerId: id }, skip: !id },
	);

	const { data: categoryData } = useQuery<{ categories: CategoryNode[] }>(CATEGORIES_QUERY, {
		variables: { language, sellerId: id },
		skip: !id,
	});

	const { data: brandData } = useQuery<{ productBrandsWithCounts: BrandCount[] }>(
		PRODUCT_BRANDS_WITH_COUNTS_QUERY,
		{ variables: { sellerId: id }, skip: !id },
	);

	const filter = useMemo(
		() =>
			buildCatalogFilterInput(catalogFilters, {
				sellerId: id,
				...(search.trim() ? { search: search.trim() } : {}),
			}),
		[id, search, catalogFilters],
	);

	const { data: productsData, loading: productsLoading } = useQuery<{ products: ProductListResult }>(
		PRODUCTS_QUERY,
		{
			variables: { filter, sort, page, pageSize: PAGE_SIZE, language },
			skip: !id,
		},
	);

	const profile = profileData?.publicSellerProfile;
	const products = productsData?.products.items ?? [];
	const total = productsData?.products.total ?? 0;
	const categories = categoryData?.categories ?? [];
	const brands = brandData?.productBrandsWithCounts ?? [];
	const filtersActive = hasActiveCatalogFilters(catalogFilters, search);
	const pageStart = total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
	const pageEnd = Math.min(page * PAGE_SIZE, total);
	const filterContext = buildFilterContext(catalogFilters, categories);

	const updateFilters = (next: CatalogFilterState) => {
		setCatalogFilters(next);
		setPage(1);
	};

	if (profileLoading) {
		return <AppLoader />;
	}

	if (profileError || !profile) {
		return (
			<div className={styles.page}>
				<EmptyState
					title={t('publicProfile.notFoundTitle')}
					description={t('publicProfile.notFoundDescription')}
					actionLabel={t('publicProfile.backToCatalog')}
					onAction={() => navigate(ROUTES.PRODUCTS)}
				/>
			</div>
		);
	}

	const location = formatLocation(profile.city, profile.country);
	const memberSince = formatMemberSince(profile.memberSince, i18n.language);

	return (
		<div className={styles.page} data-testid="public-seller-profile-page">
			<section className={styles.hero}>
				<div className={styles.heroInner}>
					<div className={styles.avatar} data-testid="seller-profile-avatar">
						{profile.avatarUrl ? (
							<img src={profile.avatarUrl} alt="" className={styles.avatarImage} />
						) : (
							initials(profile.firstName, profile.lastName)
						)}
					</div>

					<div>
						<div className={styles.nameRow}>
							<h1 className={styles.storeName}>{profile.displayName}</h1>
							{profile.isVerifiedSeller ? (
								<span className={styles.verifiedBadge}>
									<FontAwesomeIcon icon={Icons.checkCircle} />
									{t('publicProfile.verifiedSeller')}
								</span>
							) : null}
						</div>

						<p className={styles.meta}>
							{profile.companyName && profile.companyName !== profile.displayName
								? `${profile.companyName} · `
								: ''}
							{t('publicProfile.memberSince', { date: memberSince })}
							{location ? ` · ${location}` : ''}
						</p>

						<div className={styles.stats}>
							<span className={styles.stat}>
								<span className={styles.statStrong}>{profile.productCount}</span>{' '}
								{t('publicProfile.products')}
							</span>
							{profile.reviewCount > 0 ? (
								<span className={styles.stat}>
									<span className={styles.ratingStar}>★</span>{' '}
									<span className={styles.statStrong}>{profile.averageRating.toFixed(1)}</span>{' '}
									{t('publicProfile.reviewsCount', { count: profile.reviewCount })}
								</span>
							) : null}
						</div>

						{profile.bio ? <p className={styles.bio}>{profile.bio}</p> : null}
					</div>

					<div className={styles.heroActions}>
						<AppButton
							tone="ghost"
							startIcon={<FontAwesomeIcon icon={Icons.chat} />}
							onClick={() => {
								if (!currentUser) {
									navigate(ROUTES.LOGIN);
									return;
								}
								navigate(`${ROUTES.CHAT}?sellerId=${id}`);
							}}
							data-testid="seller-profile-contact"
						>
							{t('publicProfile.contactSeller')}
						</AppButton>
					</div>
				</div>

				{isOwner ? (
					<div className={styles.ownerBanner} data-testid="seller-profile-owner-banner">
						<span>{t('publicProfile.ownerHint')}</span>
						<RouterLink to={getSettingsRouteForUser(currentUser)}>
							<AppButton tone="accent">{t('publicProfile.editProfile')}</AppButton>
						</RouterLink>
					</div>
				) : null}
			</section>

			<section className={styles.catalogSection}>
				<div className={styles.catalogHead}>
					<div>
						<h2 className={styles.catalogTitle}>{t('publicProfile.shopTitle')}</h2>
						<p className={styles.catalogSub}>
							{t('publicProfile.shopSubtitle', { name: profile.displayName })}
						</p>
					</div>
				</div>

				<div className={styles.catalogLayout}>
					<aside className={styles.filtersAside} data-testid="seller-profile-filters">
						<CatalogFilters
							categories={categories}
							brands={brands}
							value={catalogFilters}
							onChange={updateFilters}
							onClear={() => updateFilters(INITIAL_FILTERS)}
						/>
					</aside>

					<div className={styles.catalogMain}>
						<div className={styles.listingHead}>
							<p className={styles.resultsMeta} data-testid="seller-profile-results-count">
								{total > 0
									? t('pagination.showing', { from: pageStart, to: pageEnd, total })
									: t('catalog.resultsCount', { count: total })}
								{filterContext ? (
									<span className={styles.filterContext}>{filterContext}</span>
								) : null}
							</p>

							<div className={styles.toolbar}>
								<label className={styles.searchWrap}>
									<FontAwesomeIcon icon={Icons.search} color="#8794a1" />
									<input
										className={styles.searchInput}
										value={search}
										onChange={(e) => {
											setSearch(e.target.value);
											setPage(1);
										}}
										placeholder={t('publicProfile.searchPlaceholder')}
										data-testid="seller-profile-search"
									/>
								</label>
								<select
									className={styles.sortSelect}
									value={sort}
									onChange={(e) => {
										setSort(e.target.value as ProductSort);
										setPage(1);
									}}
									data-testid="seller-profile-sort"
								>
									<option value="NEWEST">{t('catalog.sort.newest')}</option>
									<option value="PRICE_ASC">{t('catalog.sort.priceAsc')}</option>
									<option value="PRICE_DESC">{t('catalog.sort.priceDesc')}</option>
									<option value="RATING">{t('catalog.sort.rating')}</option>
									<option value="POPULARITY">{t('catalog.sort.popularity')}</option>
								</select>
							</div>
						</div>

						{productsLoading ? (
							<AppLoader />
						) : products.length === 0 ? (
							<div className={styles.emptyWrap}>
								<EmptyState
									icon={Icons.products}
									title={
										filtersActive
											? t('publicProfile.noFilterResultsTitle')
											: t('publicProfile.noProductsTitle')
									}
									description={
										filtersActive
											? t('publicProfile.noFilterResultsDescription')
											: t('publicProfile.noProductsDescription')
									}
									actionLabel={filtersActive ? t('catalog.filters.clearAll') : undefined}
									onAction={filtersActive ? () => {
										setSearch('');
										updateFilters(INITIAL_FILTERS);
									} : undefined}
								/>
							</div>
						) : (
							<>
								<div className={styles.productGrid} data-testid="seller-profile-products">
									{products.map((product: CatalogProduct) => (
										<ProductCard key={product.id} product={product} />
									))}
								</div>
								{total > PAGE_SIZE ? (
									<div className={styles.paginationWrap}>
										<AppPagination
											page={page}
											pageSize={PAGE_SIZE}
											total={total}
											onChange={(nextPage) => setPage(nextPage)}
										/>
									</div>
								) : null}
							</>
						)}
					</div>
				</div>
			</section>
		</div>
	);
}
