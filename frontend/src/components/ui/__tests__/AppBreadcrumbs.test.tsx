import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppBreadcrumbs } from '../AppBreadcrumbs';

const items = [
	{ label: 'Marketplace', href: '/' },
	{ label: 'Orders', href: '/orders' },
	{ label: '#KX-6011' },
];

describe('AppBreadcrumbs', () => {
	it('renders every crumb label', () => {
		render(
			<MemoryRouter>
				<AppBreadcrumbs items={items} />
			</MemoryRouter>
		);
		expect(screen.getByText('Marketplace')).toBeInTheDocument();
		expect(screen.getByText('Orders')).toBeInTheDocument();
		expect(screen.getByText('#KX-6011')).toBeInTheDocument();
	});

	it('renders links for non-final crumbs with href', () => {
		render(
			<MemoryRouter>
				<AppBreadcrumbs items={items} />
			</MemoryRouter>
		);
		expect(screen.getByText('Marketplace').closest('a')).toHaveAttribute('href', '/');
	});

	it('renders the final crumb as plain text', () => {
		render(
			<MemoryRouter>
				<AppBreadcrumbs items={items} />
			</MemoryRouter>
		);
		expect(screen.getByText('#KX-6011').closest('a')).toBeNull();
	});
});
