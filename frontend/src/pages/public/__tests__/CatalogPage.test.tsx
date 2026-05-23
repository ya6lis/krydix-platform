import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import CatalogPage from '../CatalogPage';
import {
	CATEGORIES_QUERY,
	PRODUCTS_QUERY,
	PRODUCT_BRANDS_QUERY,
} from '@/graphql/operations/catalog';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => key,
		i18n: { language: 'en' },
	}),
}));

jest.mock('@fortawesome/react-fontawesome', () => ({
	FontAwesomeIcon: () => <span data-testid="icon" />,
}));

function makeProduct(id: string, slug: string, title: string) {
	return {
		id,
		slug,
		sku: `SKU-${id}`,
		brand: 'Heritage Co.',
		basePrice: 184,
		status: 'APPROVED',
		isAvailable: true,
		title,
		description: 'Desc',
		metaTitle: null,
		metaDescription: null,
		mainImage: null,
		media: [],
		variants: [],
		categories: [],
		seller: { id: 's1', name: 'Northern Atelier' },
		rating: 4.5,
		reviewCount: 10,
		totalStock: 20,
		createdAt: new Date('2020-01-01').toISOString(),
	};
}

const categoriesMock: MockedResponse = {
	request: { query: CATEGORIES_QUERY, variables: { language: 'EN' } },
	result: { data: { categories: [] } },
};

const brandsMock: MockedResponse = {
	request: { query: PRODUCT_BRANDS_QUERY, variables: {} },
	result: { data: { productBrands: ['Heritage Co.', 'Maru Studio'] } },
};

const productsMock: MockedResponse = {
	request: {
		query: PRODUCTS_QUERY,
		variables: { filter: {}, sort: 'NEWEST', page: 1, pageSize: 24, language: 'EN' },
	},
	result: {
		data: {
			products: {
				items: [
					makeProduct('p1', 'field-jacket', 'Field Jacket'),
					makeProduct('p2', 'canvas-tote', 'Canvas Tote'),
				],
				total: 2,
				page: 1,
				pageSize: 24,
			},
		},
	},
};

function renderCatalog(mocks: MockedResponse[] = []) {
	return render(
		<MockedProvider mocks={mocks} addTypename={false}>
			<MemoryRouter>
				<CatalogPage />
			</MemoryRouter>
		</MockedProvider>
	);
}

describe('CatalogPage', () => {
	it('shows loader while fetching', () => {
		renderCatalog([categoriesMock, brandsMock, productsMock]);
		expect(document.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
	});

	it('renders product cards after data loads', async () => {
		renderCatalog([categoriesMock, brandsMock, productsMock]);
		await waitFor(() => {
			expect(screen.getByText('Field Jacket')).toBeInTheDocument();
			expect(screen.getByText('Canvas Tote')).toBeInTheDocument();
		});
	});

	it('shows results count after data loads', async () => {
		renderCatalog([categoriesMock, brandsMock, productsMock]);
		await waitFor(() => {
			expect(screen.getByText('catalog.resultsCount')).toBeInTheDocument();
		});
	});

	it('shows empty state when no products returned', async () => {
		const emptyMock: MockedResponse = {
			request: {
				query: PRODUCTS_QUERY,
				variables: { filter: {}, sort: 'NEWEST', page: 1, pageSize: 24, language: 'EN' },
			},
			result: { data: { products: { items: [], total: 0, page: 1, pageSize: 24 } } },
		};
		renderCatalog([categoriesMock, brandsMock, emptyMock]);
		await waitFor(() => {
			expect(screen.getByText('catalog.empty.title')).toBeInTheDocument();
		});
	});
});
