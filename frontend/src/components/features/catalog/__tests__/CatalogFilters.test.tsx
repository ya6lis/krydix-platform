import { render, screen, fireEvent } from '@testing-library/react';
import { CatalogFilters, PRICE_MIN, PRICE_MAX, type CatalogFilterState } from '../CatalogFilters';
import type { BrandCount, CategoryNode } from '@/types/catalog';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@fortawesome/react-fontawesome', () => ({
	FontAwesomeIcon: () => <span data-testid="icon" />,
}));

// RangeSlider has native inputs — mock to avoid CSS/JSDOM issues
jest.mock('@/components/ui', () => ({
	RangeSlider: ({ onChange }: { onChange: (r: [number, number]) => void }) => (
		<button onClick={() => onChange([100, 500])}>RangeSlider</button>
	),
	AppButton: ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
		<button onClick={onClick}>{children}</button>
	),
}));

const categories: CategoryNode[] = [
	{
		id: 'c1',
		slug: 'outerwear',
		parentId: null,
		name: 'Outerwear',
		description: null,
		productCount: 1115,
		children: [
			{
				id: 'c2',
				slug: 'jackets',
				parentId: 'c1',
				name: 'Jackets',
				description: null,
				productCount: 312,
				children: [],
			},
		],
	},
];

const brands: BrandCount[] = [
	{ name: 'Heritage Co.', count: 128 },
	{ name: 'Maru Studio', count: 94 },
];

const baseValue: CatalogFilterState = {
	brands: [],
	priceRange: [PRICE_MIN, PRICE_MAX],
	inStockOnly: false,
};

describe('CatalogFilters', () => {
	it('renders categories with product counts', () => {
		render(
			<CatalogFilters
				categories={categories}
				brands={[]}
				value={baseValue}
				onChange={() => {}}
				onClear={() => {}}
			/>
		);
		expect(screen.getByText('Outerwear')).toBeInTheDocument();
		expect(screen.getByText('Jackets')).toBeInTheDocument();
		// toLocaleString in JSDOM may not add thousands separator — match either format
		expect(screen.getByText(/1.?115/)).toBeInTheDocument();
		expect(screen.getByText('312')).toBeInTheDocument();
	});

	it('renders brands with counts', () => {
		render(
			<CatalogFilters
				categories={[]}
				brands={brands}
				value={baseValue}
				onChange={() => {}}
				onClear={() => {}}
			/>
		);
		expect(screen.getByText('Heritage Co.')).toBeInTheDocument();
		expect(screen.getByText('128')).toBeInTheDocument();
		expect(screen.getByText('Maru Studio')).toBeInTheDocument();
		expect(screen.getByText('94')).toBeInTheDocument();
	});

	it('fires onChange with categorySlug when category checkbox clicked', () => {
		const onChange = jest.fn();
		render(
			<CatalogFilters
				categories={categories}
				brands={[]}
				value={baseValue}
				onChange={onChange}
				onClear={() => {}}
			/>
		);
		// Find the checkbox next to "Jackets" by clicking the label
		const jacketsCheckboxes = screen.getAllByRole('checkbox');
		// Outerwear is first, Jackets is second
		fireEvent.click(jacketsCheckboxes[1]);
		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ categorySlug: 'jackets' }));
	});

	it('deselects category when already-selected checkbox is clicked again', () => {
		const onChange = jest.fn();
		render(
			<CatalogFilters
				categories={categories}
				brands={[]}
				value={{ ...baseValue, categorySlug: 'outerwear' }}
				onChange={onChange}
				onClear={() => {}}
			/>
		);
		// Outerwear checkbox is first
		const checkboxes = screen.getAllByRole('checkbox');
		fireEvent.click(checkboxes[0]);
		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ categorySlug: undefined }));
	});

	it('fires onChange with brand added to list when brand checkbox clicked', () => {
		const onChange = jest.fn();
		render(
			<CatalogFilters
				categories={[]}
				brands={brands}
				value={baseValue}
				onChange={onChange}
				onClear={() => {}}
			/>
		);
		const checkboxes = screen.getAllByRole('checkbox');
		fireEvent.click(checkboxes[0]); // Heritage Co.
		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ brands: ['Heritage Co.'] }));
	});

	it('fires onChange with rating when rating star row clicked', () => {
		const onChange = jest.fn();
		render(
			<CatalogFilters
				categories={[]}
				brands={[]}
				value={baseValue}
				onChange={onChange}
				onClear={() => {}}
			/>
		);
		// Rating checkboxes come after no category/brand checkboxes; first rating is 5★
		const checkboxes = screen.getAllByRole('checkbox');
		fireEvent.click(checkboxes[0]); // 5 stars
		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ minRating: 5 }));
	});

	it('fires onClear when clear button clicked', () => {
		const onClear = jest.fn();
		render(
			<CatalogFilters
				categories={[]}
				brands={[]}
				value={baseValue}
				onChange={() => {}}
				onClear={onClear}
			/>
		);
		fireEvent.click(screen.getByText('catalog.filters.clearAll'));
		expect(onClear).toHaveBeenCalled();
	});
});
