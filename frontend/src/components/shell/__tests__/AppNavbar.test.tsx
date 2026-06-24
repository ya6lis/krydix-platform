import { render, screen, fireEvent } from '@testing-library/react';
import { act } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import AppNavbar from '../AppNavbar';
import { useCartStore } from '@/store/cartStore';
import {
	MARK_ALL_NOTIFICATIONS_READ_MUTATION,
	MARK_NOTIFICATION_READ_MUTATION,
	DELETE_NOTIFICATION_MUTATION,
	MY_NOTIFICATIONS_QUERY,
	UNREAD_NOTIFICATION_COUNT_QUERY,
} from '@/graphql/operations/notifications';
import { MY_WISHLIST_QUERY } from '@/graphql/operations/wishlist';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useNavigate: () => jest.fn(),
}));

jest.mock('@fortawesome/react-fontawesome', () => ({
	FontAwesomeIcon: () => <span data-testid="fa-icon" />,
}));

jest.mock('@/store/authStore', () => ({
	useAuthStore: (selector: (state: { user: { id: string; role: string } | null }) => unknown) =>
		selector({ user: { id: 'user-1', role: 'BUYER' } }),
}));

jest.mock('@/hooks/useWishlist', () => ({
	useWishlist: () => ({ count: 0 }),
}));

const apolloMocks = [
	{
		request: { query: MY_NOTIFICATIONS_QUERY, variables: { limit: 30 } },
		result: { data: { myNotifications: [] } },
	},
	{
		request: { query: UNREAD_NOTIFICATION_COUNT_QUERY },
		result: { data: { unreadNotificationCount: 0 } },
	},
	{
		request: { query: MARK_ALL_NOTIFICATIONS_READ_MUTATION },
		result: { data: { markAllNotificationsRead: true } },
	},
	{
		request: { query: MARK_NOTIFICATION_READ_MUTATION, variables: { id: 'notif-1' } },
		result: { data: { markNotificationRead: true } },
	},
	{
		request: { query: DELETE_NOTIFICATION_MUTATION, variables: { id: 'notif-1' } },
		result: { data: { deleteNotification: true } },
	},
	{
		request: { query: MY_WISHLIST_QUERY },
		result: { data: { myWishlist: { count: 0, items: [] } } },
	},
];

function renderNavbar(breadcrumbs?: Array<{ label: string; href?: string }>) {
	return render(
		<MockedProvider mocks={apolloMocks} addTypename={false}>
			<MemoryRouter>
				<AppNavbar breadcrumbs={breadcrumbs} />
			</MemoryRouter>
		</MockedProvider>
	);
}

beforeEach(() => {
	act(() => {
		useCartStore.getState().clearCart();
	});
});

describe('AppNavbar', () => {
	it('renders search input with placeholder i18n key', () => {
		renderNavbar();
		expect(screen.getByPlaceholderText('shell.search.placeholder')).toBeInTheDocument();
	});

	it('submits search and navigates to catalog with query', () => {
		const navigate = jest.fn();
		jest.spyOn(require('react-router-dom'), 'useNavigate').mockReturnValue(navigate);

		renderNavbar();
		fireEvent.change(screen.getByPlaceholderText('shell.search.placeholder'), {
			target: { value: 'laptop' },
		});
		fireEvent.submit(screen.getByPlaceholderText('shell.search.placeholder').closest('form')!);

		expect(navigate).toHaveBeenCalledWith('/catalog?q=laptop');
	});

	it('renders wishlist icon button', () => {
		renderNavbar();
		expect(screen.getByLabelText('shell.wishlist.title')).toBeInTheDocument();
	});

	it('opens wishlist popover on heart button click', () => {
		renderNavbar();
		fireEvent.click(screen.getByLabelText('shell.wishlist.title'));
		expect(screen.getAllByText('shell.wishlist.empty').length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText('shell.wishlist.viewAll')).toBeInTheDocument();
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
				qty: 7,
				stock: 10,
			});
		});
		renderNavbar();
		expect(screen.getByText('7')).toBeInTheDocument();
	});

	it('hides notification badge when there are no unread notifications', () => {
		renderNavbar();
		expect(screen.queryByText('3')).not.toBeInTheDocument();
	});

	it('renders breadcrumbs when provided', () => {
		renderNavbar([{ label: 'Orders', href: '/orders' }, { label: 'Order #123' }]);
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
