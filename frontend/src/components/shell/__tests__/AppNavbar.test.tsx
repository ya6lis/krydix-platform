import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { act } from '@testing-library/react';
import AppNavbar from '../AppNavbar';
import { useCartStore } from '@/store/cartStore';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@fortawesome/react-fontawesome', () => ({
	FontAwesomeIcon: () => <span data-testid="fa-icon" />,
}));

jest.mock('@/i18n', () => ({
	language: 'en',
	changeLanguage: jest.fn(),
}));

function renderNavbar(breadcrumbs?: Array<{ label: string; href?: string }>) {
	return render(
		<MemoryRouter>
			<AppNavbar breadcrumbs={breadcrumbs} />
		</MemoryRouter>
	);
}

beforeEach(() => {
	act(() => {
		useCartStore.getState().clearCart();
	});
});

describe('AppNavbar', () => {
	it('renders search bar with placeholder i18n key', () => {
		renderNavbar();
		expect(screen.getByText('shell.search.placeholder')).toBeInTheDocument();
	});

	it('renders language switcher button', () => {
		renderNavbar();
		// Lang button shows 'EN' (mocked i18n.language = 'en')
		expect(screen.getByText('EN')).toBeInTheDocument();
	});

	it('renders cart icon button', () => {
		renderNavbar();
		expect(screen.getByLabelText('shell.cart.title')).toBeInTheDocument();
	});

	it('renders notifications button', () => {
		renderNavbar();
		expect(screen.getByLabelText('shell.notif.title')).toBeInTheDocument();
	});

	it('shows no cart count badge when cart is empty', () => {
		renderNavbar();
		// badge not rendered for 0 count — MUI Box with count is conditional
		expect(screen.queryByText('0')).not.toBeInTheDocument();
	});

	it('shows cart count badge when items in store', () => {
		act(() => {
			useCartStore.getState().addItem({
				id: 'i1',
				productId: 'p1',
				sellerId: 's1',
				sellerName: 'Test Seller',
				name: 'Test Item',
				price: 100,
				qty: 7, // use 7 to distinguish from static notif badge (3)
			});
		});
		renderNavbar();
		expect(screen.getByText('7')).toBeInTheDocument();
	});

	it('always shows static notification badge of 3', () => {
		renderNavbar();
		// The static notif badge shows 3 (Phase 13 wires real data)
		const badges = screen.getAllByText('3');
		expect(badges.length).toBeGreaterThanOrEqual(1);
	});

	it('renders breadcrumbs when provided', () => {
		renderNavbar([{ label: 'Orders', href: '/account/orders' }, { label: 'Order #123' }]);
		expect(screen.getByText('Orders')).toBeInTheDocument();
		expect(screen.getByText('Order #123')).toBeInTheDocument();
	});

	it('renders Krydix root breadcrumb always', () => {
		renderNavbar();
		expect(screen.getByText('Krydix')).toBeInTheDocument();
	});

	it('opens cart popover on cart button click', () => {
		renderNavbar();
		fireEvent.click(screen.getByLabelText('shell.cart.title'));
		// cart.title appears as heading in popover; cart.empty may appear twice (subtitle + body)
		expect(screen.getAllByText('shell.cart.empty').length).toBeGreaterThanOrEqual(1);
	});

	it('opens notifications popover on bell button click', () => {
		renderNavbar();
		fireEvent.click(screen.getByLabelText('shell.notif.title'));
		expect(screen.getByText('shell.notif.viewAll')).toBeInTheDocument();
	});

	it('shows notification tabs after opening notif popover', () => {
		renderNavbar();
		fireEvent.click(screen.getByLabelText('shell.notif.title'));
		expect(screen.getByText('shell.notif.tab.all')).toBeInTheDocument();
		expect(screen.getByText('shell.notif.tab.unread')).toBeInTheDocument();
		expect(screen.getByText('shell.notif.tab.orders')).toBeInTheDocument();
		expect(screen.getByText('shell.notif.tab.system')).toBeInTheDocument();
	});
});
