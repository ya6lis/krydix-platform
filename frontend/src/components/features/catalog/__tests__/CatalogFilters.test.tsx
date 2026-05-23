import { render, screen, fireEvent } from '@testing-library/react';
import { CatalogFilters, PRICE_MIN, PRICE_MAX, type CatalogFilterState } from '../CatalogFilters';
import type { CategoryNode } from '@/types/catalog';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@fortawesome/react-fontawesome', () => ({
	FontAwesomeIcon: () => <span data-testid="icon" />,
}));

const categories: CategoryNode[] = [
	{
		id: 'c1',
		slug: 'outerwear',
		parentId: null,
		name: 'Outerwear',
		description: null,
		productCount: 10,
		children: [
			{
				id: 'c2',
				slug: 'jackets',
				parentId: 'c1',
				name: 'Jackets',
				description: null,
				productCount: 4,
				children: [],
			},
		],
	},
];

const baseValue: CatalogFilterState = {
	brands: [],
	priceRange: [PRICE_MIN, PRICE_MAX],
	inStockOnly: false,
};

describe('CatalogFilters', () => {
	it('renders categories and brands', () => {
		render(
			<CatalogFilters
				categories={categories}
				brands={['Heritage Co.']}
				value={baseValue}
				onChange={() => {}}
				onClear={() => {}}
			/>
		);
		expect(screen.getByText('Outerwear')).toBeInTheDocument();
		expect(screen.getByText('Jackets')).toBeInTheDocument();
		expect(screen.getByText('Heritage Co.')).toBeInTheDocument();
	});

	it('fires onChange with the selected category slug', () => {
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
		fireEvent.click(screen.getByText('Jackets'));
		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ categorySlug: 'jackets' }));
	});

	it('fires onClear when clear button clicked', () => {
		const onClear = jest.fn();
		render(
			<CatalogFilters
				categories={categories}
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
