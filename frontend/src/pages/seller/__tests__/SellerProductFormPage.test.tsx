import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SellerProductFormPage from '../SellerProductFormPage';
import { AppToastProvider } from '@/components/ui';
import { MY_PRODUCT_QUERY } from '@/graphql/operations/sellerProducts';
import { CATEGORIES_QUERY } from '@/graphql/operations/catalog';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => key,
		i18n: { language: 'en' },
	}),
}));

jest.mock('@fortawesome/react-fontawesome', () => ({
	FontAwesomeIcon: ({ spin }: { spin?: boolean }) => (
		<span data-testid={spin ? 'icon-spin' : 'icon'} />
	),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const categoriesMock: MockedResponse = {
	request: { query: CATEGORIES_QUERY, variables: { language: 'EN' } },
	result: {
		data: {
			categories: [
				{
					id: 'cat-1',
					slug: 'electronics',
					parentId: null,
					name: 'Electronics',
					productCount: 12,
					children: [],
				},
				{
					id: 'cat-2',
					slug: 'clothing',
					parentId: null,
					name: 'Clothing',
					productCount: 8,
					children: [
						{
							id: 'cat-3',
							slug: 'jackets',
							parentId: 'cat-2',
							name: 'Jackets',
							productCount: 4,
							children: [],
						},
					],
				},
			],
		},
	},
};

const existingProductMock: MockedResponse = {
	request: { query: MY_PRODUCT_QUERY, variables: { id: 'prod-123' } },
	result: {
		data: {
			myProduct: {
				id: 'prod-123',
				slug: 'existing-product',
				sku: 'EX-001',
				brand: 'Acme',
				basePrice: 149,
				comparePrice: 199,
				status: 'APPROVED',
				isAvailable: true,
				createdAt: '2026-05-01T10:00:00.000Z',
				updatedAt: '2026-05-01T10:00:00.000Z',
				titleEn: 'Existing Product',
				titleUk: 'Існуючий товар',
				descriptionEn: 'Existing description',
				descriptionUk: 'Існуючий опис',
				metaTitleEn: null,
				metaTitleUk: null,
				metaDescriptionEn: null,
				metaDescriptionUk: null,
				categories: [
					{ id: 'cat-1', slug: 'electronics', nameEn: 'Electronics', nameUk: 'Електроніка' },
				],
				variants: [
					{
						id: 'var-1',
						sku: 'EX-001-RED',
						options: { Color: 'Red' },
						price: 159,
						stock: 10,
						isActive: true,
					},
				],
				media: [
					{
						id: 'media-1',
						url: 'https://example.com/img.jpg',
						publicId: 'krydix/products/img',
						type: 'IMAGE',
						isMain: true,
						sortOrder: 0,
					},
				],
			},
		},
	},
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderNewForm(mocks: MockedResponse[] = []) {
	return render(
		<MockedProvider mocks={[categoriesMock, ...mocks]} addTypename={false}>
			<MemoryRouter initialEntries={['/seller-cabinet/products/new']}>
				<AppToastProvider>
					<Routes>
						<Route path="/seller-cabinet/products/new" element={<SellerProductFormPage />} />
						<Route path="/seller-cabinet/products/:id/edit" element={<div>Edit page</div>} />
					</Routes>
				</AppToastProvider>
			</MemoryRouter>
		</MockedProvider>
	);
}

function renderEditForm(mocks: MockedResponse[] = []) {
	return render(
		<MockedProvider mocks={[categoriesMock, existingProductMock, ...mocks]} addTypename={false}>
			<MemoryRouter initialEntries={['/seller-cabinet/products/prod-123/edit']}>
				<AppToastProvider>
					<Routes>
						<Route path="/seller-cabinet/products/:id/edit" element={<SellerProductFormPage />} />
					</Routes>
				</AppToastProvider>
			</MemoryRouter>
		</MockedProvider>
	);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SellerProductFormPage — create mode', () => {
	it('renders page title and all section headers', async () => {
		renderNewForm();
		await waitFor(() => {
			expect(screen.getByText('sellerProduct.newTitle')).toBeInTheDocument();
		});
		expect(screen.getByText('sellerProduct.section.basic')).toBeInTheDocument();
		expect(screen.getByText('sellerProduct.section.pricing')).toBeInTheDocument();
		expect(screen.getByText('sellerProduct.section.categories')).toBeInTheDocument();
		expect(screen.getByText('sellerProduct.section.variants')).toBeInTheDocument();
		expect(screen.getByText('sellerProduct.section.media')).toBeInTheDocument();
		expect(screen.getByText('sellerProduct.section.seo')).toBeInTheDocument();
	});

	it('auto-generates slug from titleEn', async () => {
		const { container } = renderNewForm();
		await waitFor(() => {
			expect(screen.getByText('sellerProduct.section.basic')).toBeInTheDocument();
		});

		const titleEnInput = container.querySelector('input[name="titleEn"]') as HTMLInputElement;
		expect(titleEnInput).toBeTruthy();
		await userEvent.type(titleEnInput, 'My New Product');

		await waitFor(() => {
			const slugInput = container.querySelector('input[name="slug"]') as HTMLInputElement;
			expect(slugInput.value).toBe('my-new-product');
		});
	});

	it('manual slug edit stops auto-generation', async () => {
		const { container } = renderNewForm();
		await waitFor(() => {
			expect(screen.getByText('sellerProduct.section.basic')).toBeInTheDocument();
		});

		const slugInput = container.querySelector('input[name="slug"]') as HTMLInputElement;
		fireEvent.change(slugInput, { target: { value: 'custom-slug' } });

		const titleEnInput = container.querySelector('input[name="titleEn"]') as HTMLInputElement;
		await userEvent.type(titleEnInput, 'Some New Title');

		await waitFor(() => {
			expect((container.querySelector('input[name="slug"]') as HTMLInputElement).value).toBe(
				'custom-slug'
			);
		});
	});

	it('shows categories list from query', async () => {
		renderNewForm();
		await waitFor(() => {
			expect(screen.getByText('Electronics (12)')).toBeInTheDocument();
			expect(screen.getByText('Clothing (8)')).toBeInTheDocument();
		});
	});

	it('adds and removes variant rows', async () => {
		renderNewForm();
		await waitFor(() => {
			expect(screen.getByText('sellerProduct.section.variants')).toBeInTheDocument();
		});

		// Add variant
		fireEvent.click(screen.getByText('sellerProduct.variant.add'));
		expect(screen.getByText('Variant #1')).toBeInTheDocument();

		// Remove variant
		fireEvent.click(screen.getByText('sellerProduct.variant.remove'));
		await waitFor(() => {
			expect(screen.queryByText('Variant #1')).not.toBeInTheDocument();
		});
	});

	it('shows media upload note in create mode', async () => {
		renderNewForm();
		await waitFor(() => {
			expect(
				screen.getByText(/Save the product first before uploading images/)
			).toBeInTheDocument();
		});
	});

	it('shows validation errors when submitting empty form', async () => {
		renderNewForm();
		await waitFor(() => {
			expect(screen.getByText('sellerProduct.section.basic')).toBeInTheDocument();
		});

		// Click submit — this should trigger validation (two buttons in page: header + footer)
		const submitBtns = screen.getAllByText('sellerProduct.submitForReview');
		fireEvent.click(submitBtns[0]);

		await waitFor(
			() => {
				const errorFields = document.querySelectorAll('[aria-invalid="true"]');
				expect(errorFields.length).toBeGreaterThan(0);
			},
			{ timeout: 3000 }
		);
	});
});

describe('SellerProductFormPage — edit mode', () => {
	it('shows edit page title and loader then fills form', async () => {
		const { container } = renderEditForm();

		await waitFor(() => {
			expect(screen.getByText('sellerProduct.editTitle')).toBeInTheDocument();
		});

		// Form fields should be populated from loaded product
		await waitFor(
			() => {
				const titleEnInput = container.querySelector('input[name="titleEn"]') as HTMLInputElement;
				expect(titleEnInput?.value).toBe('Existing Product');
			},
			{ timeout: 5000 }
		);

		const skuInput = container.querySelector('input[name="sku"]') as HTMLInputElement;
		expect(skuInput?.value).toBe('EX-001');
	});

	it('shows loaded variant in edit mode', async () => {
		renderEditForm();

		await waitFor(() => {
			expect(screen.getByText('Variant #1')).toBeInTheDocument();
		});
	});

	it('renders media section headings in edit mode', async () => {
		renderEditForm();

		// Product loads → isEdit=true → media section headings appear
		await waitFor(
			() => {
				expect(screen.getByText('sellerProduct.media.mainLabel')).toBeInTheDocument();
				expect(screen.getByText('sellerProduct.media.galleryLabel')).toBeInTheDocument();
			},
			{ timeout: 8000 }
		);
	}, 10000);

	it('shows breadcrumb with edit label', async () => {
		renderEditForm();

		await waitFor(() => {
			expect(screen.getByText('sellerProduct.breadcrumbEdit')).toBeInTheDocument();
			expect(screen.getByText('sellerProduct.breadcrumbProducts')).toBeInTheDocument();
		});
	});
});
