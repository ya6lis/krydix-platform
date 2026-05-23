import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppSidebar from '../AppSidebar';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/i18n', () => ({
	language: 'en',
	changeLanguage: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useNavigate: () => jest.fn(),
}));

jest.mock('@fortawesome/react-fontawesome', () => ({
	FontAwesomeIcon: () => <span data-testid="icon" />,
}));

const mockUser = {
	id: 'u1',
	email: 'buyer@example.com',
	role: 'BUYER',
	isEmailVerified: true,
	profile: { firstName: 'Jane', lastName: 'Doe', avatarUrl: null },
};

let mockAuthUser: typeof mockUser | null = mockUser;

jest.mock('@/store/authStore', () => ({
	useAuthStore: (
		selector: (s: { user: typeof mockUser | null; clearAuth: () => void }) => unknown
	) => selector({ user: mockAuthUser, clearAuth: jest.fn() }),
}));

function renderSidebar(initialRoute = '/account') {
	return render(
		<MemoryRouter initialEntries={[initialRoute]}>
			<AppSidebar />
		</MemoryRouter>
	);
}

describe('AppSidebar', () => {
	beforeEach(() => {
		mockAuthUser = mockUser;
	});

	it('renders brand mark with K text', () => {
		renderSidebar();
		expect(screen.getByText('K')).toBeInTheDocument();
	});

	it('renders brand name Krydix', () => {
		renderSidebar();
		expect(screen.getByText(/Krydix/i)).toBeInTheDocument();
	});

	it('renders nav group labels via i18n keys', () => {
		renderSidebar();
		expect(screen.getByText('nav.group.overview')).toBeInTheDocument();
		expect(screen.getByText('nav.group.marketplace')).toBeInTheDocument();
	});

	it('renders nav items for BUYER role', () => {
		renderSidebar();
		expect(screen.getByText('nav.dashboard')).toBeInTheDocument();
		expect(screen.getByText('nav.catalog')).toBeInTheDocument();
		expect(screen.getByText('nav.orders')).toBeInTheDocument();
	});

	it('hides admin nav items for BUYER role', () => {
		renderSidebar();
		expect(screen.queryByText('nav.users')).not.toBeInTheDocument();
		expect(screen.queryByText('nav.platform')).not.toBeInTheDocument();
		expect(screen.queryByText('nav.audit')).not.toBeInTheDocument();
	});

	it('shows admin nav items for ADMINISTRATOR role', () => {
		mockAuthUser = { ...mockUser, role: 'ADMINISTRATOR' };
		renderSidebar();
		expect(screen.getByText('nav.users')).toBeInTheDocument();
		expect(screen.getByText('nav.platform')).toBeInTheDocument();
		expect(screen.getByText('nav.audit')).toBeInTheDocument();
	});

	it('shows moderation items for MODERATOR role', () => {
		mockAuthUser = { ...mockUser, role: 'MODERATOR' };
		renderSidebar();
		expect(screen.getByText('nav.queue')).toBeInTheDocument();
		expect(screen.getByText('nav.complaints')).toBeInTheDocument();
		expect(screen.getByText('nav.reviews')).toBeInTheDocument();
	});

	it('hides moderation items for BUYER role', () => {
		renderSidebar();
		expect(screen.queryByText('nav.queue')).not.toBeInTheDocument();
		expect(screen.queryByText('nav.complaints')).not.toBeInTheDocument();
	});

	it('renders count badges for orders, messages, queue', () => {
		mockAuthUser = { ...mockUser, role: 'ADMINISTRATOR' };
		renderSidebar();
		expect(screen.getByText('20')).toBeInTheDocument(); // orders badge
		expect(screen.getByText('3')).toBeInTheDocument(); // messages badge
		expect(screen.getByText('12')).toBeInTheDocument(); // queue badge
		expect(screen.getByText('4')).toBeInTheDocument(); // complaints badge
	});

	it('renders user footer with initials derived from profile', () => {
		renderSidebar();
		expect(screen.getByText('JD')).toBeInTheDocument();
	});

	it('renders user footer with name and email', () => {
		renderSidebar();
		expect(screen.getByText('Jane Doe')).toBeInTheDocument();
		expect(screen.getByText('buyer@example.com')).toBeInTheDocument();
	});

	it('renders initial from email when no profile', () => {
		mockAuthUser = { ...mockUser, profile: null as unknown as typeof mockUser.profile };
		renderSidebar();
		expect(screen.getByText('B')).toBeInTheDocument(); // first char of buyer@example.com
	});

	it('renders all icons via FontAwesomeIcon mock', () => {
		renderSidebar();
		const icons = screen.getAllByTestId('icon');
		expect(icons.length).toBeGreaterThan(3);
	});

	describe('guest (unauthenticated) state', () => {
		beforeEach(() => {
			mockAuthUser = null;
		});

		it('shows catalog nav item for guest', () => {
			renderSidebar('/products');
			expect(screen.getByText('nav.catalog')).toBeInTheDocument();
		});

		it('hides account-only nav items for guest', () => {
			renderSidebar('/products');
			expect(screen.queryByText('nav.dashboard')).not.toBeInTheDocument();
			expect(screen.queryByText('nav.orders')).not.toBeInTheDocument();
			expect(screen.queryByText('nav.users')).not.toBeInTheDocument();
		});

		it('shows sign-in prompt in footer for guest', () => {
			renderSidebar('/products');
			expect(screen.getByText('shell.guest.signIn')).toBeInTheDocument();
		});

		it('does NOT render user name or email in footer for guest', () => {
			renderSidebar('/products');
			expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
			expect(screen.queryByText('buyer@example.com')).not.toBeInTheDocument();
		});
	});
});
