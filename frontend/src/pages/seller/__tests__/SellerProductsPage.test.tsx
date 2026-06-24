import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SellerProductsPage from '../SellerProductsPage';
import { AppToastProvider } from '@/components/ui';
import { MY_PRODUCTS_QUERY } from '@/graphql/operations/sellerProducts';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string, opts?: Record<string, unknown>) => {
			if (opts?.count !== undefined) return `${key}:${opts.count}`;
			return key;
		},
		i18n: { language: 'en' },
	}),
}));

jest.mock('@fortawesome/react-fontawesome', () => ({
	FontAwesomeIcon: ({ spin }: { spin?: boolean }) => (
		<span data-testid={spin ? 'icon-spin' : 'icon'} />
	),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeProductItem(overrides: Record<string, unknown> = {}) {
	return {
		id: 'prod-1',
		slug: 'test-product',
		sku: 'TEST-001',
		brand: 'TestBrand',
		basePrice: 99.99,
		comparePrice: null,
		status: 'APPROVED',
		isAvailable: true,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		titleEn: 'Test Product EN',
		titleUk: 'Тест',
		categories: [
			{ id: 'cat-1', slug: 'electronics', nameEn: 'Electronics', nameUk: 'Електроніка' },
		],
		variants: [{ id: 'var-1', stock: 10, isActive: true }],
		media: [{ id: 'media-1', url: 'https://example.com/img.jpg', isMain: true }],
		...overrides,
	};
}

const myProductsMock: MockedResponse = {
	request: {
		query: MY_PRODUCTS_QUERY,
		variables: { filter: {}, pagination: { page: 1, pageSize: 20 } },
	},
	result: {
		data: {
			myProducts: {
				items: [
					makeProductItem(),
					makeProductItem({ id: 'prod-2', titleEn: 'Second Product', sku: 'TEST-002' }),
				],
				total: 2,
				page: 1,
				pageSize: 20,
			},
		},
	},
};

const emptyProductsMock: MockedResponse = {
	request: {
		query: MY_PRODUCTS_QUERY,
		variables: { filter: {}, pagination: { page: 1, pageSize: 20 } },
	},
	result: {
		data: {
			myProducts: {
				items: [],
				total: 0,
				page: 1,
				pageSize: 20,
			},
		},
	},
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderPage(mocks: MockedResponse[] = [myProductsMock]) {
	return render(
		<MockedProvider mocks={mocks} addTypename={false}>
			<MemoryRouter initialEntries={['/seller/products']}>
				<AppToastProvider>
					<Routes>
						<Route path="/seller/products" element={<SellerProductsPage />} />
						<Route path="/seller/products/new" element={<div>New product</div>} />
						<Route path="/seller/products/:id/edit" element={<div>Edit product</div>} />
					</Routes>
				</AppToastProvider>
			</MemoryRouter>
		</MockedProvider>
	);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SellerProductsPage', () => {
	it('renders page title and action buttons', () => {
		renderPage();
		// title appears in both breadcrumb and h5 heading
		expect(screen.getAllByText('sellerProducts.title').length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText('sellerProducts.createButton')).toBeInTheDocument();
		expect(screen.getByText('sellerProducts.importButton')).toBeInTheDocument();
	});

	it('renders status filter tabs', () => {
		renderPage();
		expect(screen.getByText('sellerProducts.filterAll')).toBeInTheDocument();
		expect(screen.getByText('sellerProducts.filterDraft')).toBeInTheDocument();
		expect(screen.getByText('sellerProducts.filterApproved')).toBeInTheDocument();
		expect(screen.getByText('sellerProducts.filterArchived')).toBeInTheDocument();
	});

	it('shows product rows from query', async () => {
		renderPage();
		await waitFor(() => {
			expect(screen.getByText('Test Product EN')).toBeInTheDocument();
			expect(screen.getByText('Second Product')).toBeInTheDocument();
		});
	});

	it('shows SKU and price for each product', async () => {
		renderPage();
		await waitFor(() => {
			expect(screen.getByText('TEST-001')).toBeInTheDocument();
			expect(screen.getAllByText(/99\.99/).length).toBeGreaterThan(0);
		});
	});

	it('shows table column headers', async () => {
		renderPage();
		await waitFor(() => {
			expect(screen.getByText('sellerProducts.col.product')).toBeInTheDocument();
			expect(screen.getByText('sellerProducts.col.sku')).toBeInTheDocument();
			expect(screen.getByText('sellerProducts.col.price')).toBeInTheDocument();
			expect(screen.getByText('sellerProducts.col.stock')).toBeInTheDocument();
			expect(screen.getByText('sellerProducts.col.status')).toBeInTheDocument();
		});
	});

	it('shows empty state when no products', async () => {
		renderPage([emptyProductsMock]);
		await waitFor(() => {
			expect(screen.getByText('sellerProducts.empty')).toBeInTheDocument();
		});
	});

	it('navigates to new product page on create button click', () => {
		renderPage();
		fireEvent.click(screen.getByText('sellerProducts.createButton'));
		expect(screen.getByText('New product')).toBeInTheDocument();
	});

	it('opens import modal when import button clicked', () => {
		renderPage();
		fireEvent.click(screen.getByText('sellerProducts.importButton'));
		expect(screen.getByText('sellerProducts.import.title')).toBeInTheDocument();
	});

	it('shows import stepper steps', () => {
		renderPage();
		fireEvent.click(screen.getByText('sellerProducts.importButton'));
		expect(screen.getByText('sellerProducts.import.step1')).toBeInTheDocument();
		expect(screen.getByText('sellerProducts.import.step2')).toBeInTheDocument();
		expect(screen.getByText('sellerProducts.import.step3')).toBeInTheDocument();
	});

	it('closes import modal on cancel', async () => {
		renderPage();
		fireEvent.click(screen.getByText('sellerProducts.importButton'));
		expect(screen.getByText('sellerProducts.import.title')).toBeInTheDocument();
		// Close via the modal X button
		const closeBtn = screen.getByLabelText('close');
		fireEvent.click(closeBtn);
		// Modal gone (MUI dialog may animate, use waitFor)
		await waitFor(() => {
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		});
	});

	it('shows breadcrumb with nav.sellerCabinet link', () => {
		renderPage();
		expect(screen.getByText('nav.sellerCabinet')).toBeInTheDocument();
	});
});
