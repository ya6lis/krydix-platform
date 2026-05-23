import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProductPage from '../ProductPage';
import { PRODUCT_QUERY } from '@/graphql/operations/catalog';
import type { CatalogProduct } from '@/types/catalog';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => key,
		i18n: { language: 'en' },
	}),
}));

jest.mock('@fortawesome/react-fontawesome', () => ({
	FontAwesomeIcon: () => <span data-testid="icon" />,
}));

jest.mock('@/hooks/useAuth', () => ({
	useAuth: () => ({ isAuthenticated: false }),
}));

function makeProduct(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
	return {
		id: 'p1',
		slug: 'field-jacket',
		sku: 'SKU-001',
		brand: 'Heritage Co.',
		basePrice: 184,
		status: 'APPROVED',
		isAvailable: true,
		title: 'Heritage Field Jacket',
		description: 'A great jacket.',
		metaTitle: null,
		metaDescription: null,
		mainImage: 'https://img/main.jpg',
		media: [
			{ id: 'm1', url: 'https://img/main.jpg', type: 'IMAGE', isMain: true, sortOrder: 0 },
			{ id: 'm2', url: 'https://img/thumb.jpg', type: 'IMAGE', isMain: false, sortOrder: 1 },
		],
		variants: [
			{ id: 'v1', sku: 'V-S-OLV', options: { size: 'S', color: 'Olive' }, price: null, stock: 3, isActive: true },
			{ id: 'v2', sku: 'V-M-OLV', options: { size: 'M', color: 'Olive' }, price: null, stock: 5, isActive: true },
			{ id: 'v3', sku: 'V-S-NAT', options: { size: 'S', color: 'Natural' }, price: null, stock: 0, isActive: true },
		],
		categories: [{ id: 'c1', slug: 'outerwear', name: 'Outerwear' }],
		seller: { id: 's1', name: 'Jane Doe' },
		rating: 4.5,
		reviewCount: 12,
		totalStock: 8,
		createdAt: new Date('2020-01-01').toISOString(),
		...overrides,
	};
}

function makeProductMock(product: CatalogProduct | null): MockedResponse {
	return {
		request: { query: PRODUCT_QUERY, variables: { slug: 'field-jacket', language: 'EN' } },
		result: { data: { product } },
	};
}

function renderPage(mocks: MockedResponse[]) {
	return render(
		<MockedProvider mocks={mocks} addTypename={false}>
			<MemoryRouter initialEntries={['/products/field-jacket']}>
				<Routes>
					<Route path="/products/:slug" element={<ProductPage />} />
				</Routes>
			</MemoryRouter>
		</MockedProvider>,
	);
}

// Helper: wait until product data is rendered (price is unique, appears once).
async function waitForProduct() {
	await screen.findByText('$184.00');
}

describe('ProductPage — not found', () => {
	it('shows empty state when product is null', async () => {
		renderPage([makeProductMock(null)]);
		await screen.findByText('product.notFound.title');
		expect(screen.getByText('product.notFound.title')).toBeInTheDocument();
	});
});

describe('ProductPage — product loaded', () => {
	it('renders h1 title', async () => {
		renderPage([makeProductMock(makeProduct())]);
		await waitForProduct();
		expect(screen.getByRole('heading', { name: 'Heritage Field Jacket' })).toBeInTheDocument();
	});

	it('renders SKU in meta row', async () => {
		renderPage([makeProductMock(makeProduct())]);
		await waitForProduct();
		// SKU rendered as "product.skuLabel: SKU-001" in the meta row
		expect(screen.getByText(/SKU-001/)).toBeInTheDocument();
	});

	it('shows formatted base price', async () => {
		renderPage([makeProductMock(makeProduct())]);
		await waitForProduct();
		expect(screen.getByText('$184.00')).toBeInTheDocument();
	});

	it('shows seller initials in avatar', async () => {
		renderPage([makeProductMock(makeProduct())]);
		await waitForProduct();
		expect(screen.getByText('JD')).toBeInTheDocument();
	});

	it('shows seller full name', async () => {
		renderPage([makeProductMock(makeProduct())]);
		await waitForProduct();
		expect(screen.getByText('Jane Doe')).toBeInTheDocument();
	});

	it('shows in-stock text', async () => {
		renderPage([makeProductMock(makeProduct())]);
		await waitForProduct();
		expect(screen.getByText('product.inStockCount')).toBeInTheDocument();
	});

	it('shows out-of-stock when totalStock is 0', async () => {
		renderPage([makeProductMock(makeProduct({ totalStock: 0, isAvailable: false, variants: [] }))]);
		// Price still renders; stock text switches to outOfStock
		await screen.findByText('product.outOfStock');
		expect(screen.getByText('product.outOfStock')).toBeInTheDocument();
	});

	it('shows breadcrumb category link', async () => {
		renderPage([makeProductMock(makeProduct())]);
		await waitForProduct();
		expect(screen.getByText('Outerwear')).toBeInTheDocument();
	});

	it('wishlist button toggles aria-label', async () => {
		renderPage([makeProductMock(makeProduct())]);
		await waitForProduct();
		const wishlistBtn = screen.getByRole('button', { name: 'product.addToWishlist' });
		expect(wishlistBtn).toBeInTheDocument();
		fireEvent.click(wishlistBtn);
		await waitFor(() => {
			expect(screen.getByRole('button', { name: 'product.removeFromWishlist' })).toBeInTheDocument();
		});
	});

	it('qty decrement is disabled at minimum', async () => {
		renderPage([makeProductMock(makeProduct())]);
		await waitForProduct();
		// The minus button renders the '−' character and starts disabled (qty=1=QTY_MIN)
		const minusBtn = screen.getByText('−').closest('button');
		expect(minusBtn).toBeDisabled();
	});

	it('qty increments and then decrements', async () => {
		renderPage([makeProductMock(makeProduct())]);
		await waitForProduct();
		const plusBtn = screen.getByText('+').closest('button');
		const minusBtn = screen.getByText('−').closest('button');
		const qtyInput = screen.getByDisplayValue('1');

		fireEvent.click(plusBtn!);
		await waitFor(() => expect(qtyInput).toHaveValue('2'));

		fireEvent.click(minusBtn!);
		await waitFor(() => expect(qtyInput).toHaveValue('1'));
	});

	it('tab switching shows specifications content', async () => {
		renderPage([makeProductMock(makeProduct())]);
		await waitForProduct();
		fireEvent.click(screen.getByText('product.tabs.specifications'));
		await waitFor(() => {
			expect(screen.getByText('product.specs.brand')).toBeInTheDocument();
		});
	});
});
