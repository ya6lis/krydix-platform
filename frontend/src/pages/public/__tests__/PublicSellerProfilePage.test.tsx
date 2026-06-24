import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PublicSellerProfilePage from '../PublicSellerProfilePage';
import { PUBLIC_SELLER_PROFILE_QUERY } from '@/graphql/operations/publicProfile';
import {
	CATEGORIES_QUERY,
	PRODUCTS_QUERY,
	PRODUCT_BRANDS_WITH_COUNTS_QUERY,
} from '@/graphql/operations/catalog';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string, opts?: Record<string, unknown>) => (opts?.name ? `${key}:${opts.name}` : key),
		i18n: { language: 'en' },
	}),
}));

jest.mock('@/store/authStore', () => ({
	useAuthStore: (selector: (s: unknown) => unknown) => selector({ user: null }),
}));

const profileMock = {
	request: {
		query: PUBLIC_SELLER_PROFILE_QUERY,
		variables: { sellerId: 'seller-1' },
	},
	result: {
		data: {
			publicSellerProfile: {
				id: 'seller-1',
				displayName: 'Northern Atelier',
				firstName: 'Deja',
				lastName: 'Brady',
				avatarUrl: null,
				bio: 'Workshop bio',
				companyName: 'Northern Atelier LLC',
				country: 'Ukraine',
				city: 'Kyiv',
				isVerifiedSeller: true,
				memberSince: '2024-01-15T00:00:00.000Z',
				productCount: 2,
				averageRating: 4.8,
				reviewCount: 12,
			},
		},
	},
};

const categoriesMock = {
	request: {
		query: CATEGORIES_QUERY,
		variables: { language: 'EN', sellerId: 'seller-1' },
	},
	result: {
		data: {
			categories: [
				{
					id: 'cat-1',
					slug: 'outerwear',
					parentId: null,
					name: 'Outerwear',
					description: null,
					productCount: 2,
					children: [],
				},
			],
		},
	},
};

const brandsMock = {
	request: {
		query: PRODUCT_BRANDS_WITH_COUNTS_QUERY,
		variables: { sellerId: 'seller-1' },
	},
	result: {
		data: {
			productBrandsWithCounts: [{ name: 'Heritage Co.', count: 2 }],
		},
	},
};

const productsMock = {
	request: {
		query: PRODUCTS_QUERY,
		variables: {
			filter: { sellerId: 'seller-1' },
			sort: 'NEWEST',
			page: 1,
			pageSize: 12,
			language: 'EN',
		},
	},
	result: {
		data: {
			products: {
				items: [],
				total: 0,
				page: 1,
				pageSize: 12,
			},
		},
	},
};

function renderPage() {
	return render(
		<MockedProvider
			mocks={[profileMock, categoriesMock, brandsMock, productsMock]}
			addTypename={false}
		>
			<MemoryRouter initialEntries={['/sellers/seller-1']}>
				<Routes>
					<Route path="/sellers/:id" element={<PublicSellerProfilePage />} />
				</Routes>
			</MemoryRouter>
		</MockedProvider>
	);
}

describe('PublicSellerProfilePage', () => {
	it('renders seller storefront header and filters', async () => {
		renderPage();
		expect(await screen.findByText('Northern Atelier')).toBeInTheDocument();
		expect(screen.getByTestId('public-seller-profile-page')).toBeInTheDocument();
		expect(screen.getByText('publicProfile.verifiedSeller')).toBeInTheDocument();
		expect(screen.getByTestId('seller-profile-filters')).toBeInTheDocument();
		expect(screen.getByText('catalog.filters.category')).toBeInTheDocument();
		expect(screen.getByText('Heritage Co.')).toBeInTheDocument();
	});
});
