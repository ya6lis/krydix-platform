import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProductCard } from '../ProductCard';
import type { CatalogProduct } from '@/types/catalog';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@fortawesome/react-fontawesome', () => ({
	FontAwesomeIcon: () => <span data-testid="icon" />,
}));

function makeProduct(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
	return {
		id: 'p1',
		slug: 'field-jacket',
		sku: 'SKU-1',
		brand: 'Heritage Co.',
		basePrice: 184,
		comparePrice: null,
		status: 'APPROVED',
		isAvailable: true,
		title: 'Heritage Field Jacket',
		description: 'Desc',
		metaTitle: null,
		metaDescription: null,
		media: [],
		mainImage: null,
		variants: [],
		categories: [],
		seller: { id: 's1', name: 'Northern Atelier' },
		rating: 4.8,
		reviewCount: 124,
		totalStock: 18,
		createdAt: new Date('2020-01-01').toISOString(),
		...overrides,
	};
}

function renderCard(product: CatalogProduct) {
	return render(
		<MemoryRouter>
			<ProductCard product={product} />
		</MemoryRouter>
	);
}

describe('ProductCard', () => {
	it('renders title, seller and price', () => {
		renderCard(makeProduct());
		expect(screen.getByText('Heritage Field Jacket')).toBeInTheDocument();
		expect(screen.getByText('Northern Atelier')).toBeInTheDocument();
		expect(screen.getByText('$184.00')).toBeInTheDocument();
	});

	it('links to the product detail page', () => {
		renderCard(makeProduct());
		expect(screen.getByText('Heritage Field Jacket').closest('a')).toHaveAttribute(
			'href',
			'/catalog/field-jacket'
		);
	});

	it('shows the low-stock badge when stock is low', () => {
		renderCard(makeProduct({ totalStock: 3 }));
		expect(screen.getByText('catalog.lowStock')).toBeInTheDocument();
	});

	it('shows the out-of-stock badge when stock is zero', () => {
		renderCard(makeProduct({ totalStock: 0 }));
		expect(screen.getByText('catalog.outOfStock')).toBeInTheDocument();
	});

	it('shows the new badge for recently created products with stock', () => {
		renderCard(makeProduct({ createdAt: new Date().toISOString(), totalStock: 50 }));
		expect(screen.getByText('catalog.new')).toBeInTheDocument();
	});

	it('shows sale badge and strike-through price when comparePrice > basePrice', () => {
		renderCard(makeProduct({ basePrice: 184, comparePrice: 224, totalStock: 10 }));
		// discount = round((224 - 184) / 224 * 100) = round(17.86) = 18
		expect(screen.getByText('−18%')).toBeInTheDocument();
		expect(screen.getByText('$224.00')).toBeInTheDocument();
	});

	it('does not show sale badge when comparePrice is null', () => {
		renderCard(makeProduct({ basePrice: 184, comparePrice: null, totalStock: 10 }));
		expect(screen.queryByText(/−\d+%/)).not.toBeInTheDocument();
	});
});
