import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import AppSidebar from '../AppSidebar';
import { AppToastProvider } from '@/components/ui';
import { UNREAD_MESSAGE_COUNT_QUERY } from '@/graphql/operations/chat';
import {
	UNREAD_NOTIFICATION_COUNT_QUERY,
	UNREAD_ORDER_NOTIFICATION_COUNT_QUERY,
} from '@/graphql/operations/notifications';
import {
	PUBLISHED_RELEASE_NOTES_QUERY,
	UNSEEN_RELEASE_NOTES_COUNT_QUERY,
} from '@/graphql/operations/releaseNotes';
import { RELEASE_NOTES_HISTORY_LIMIT } from '@/constants/releaseNotes';

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

function renderSidebar(initialRoute = '/dashboard') {
	return render(
		<MockedProvider
			mocks={[
				{
					request: { query: UNREAD_MESSAGE_COUNT_QUERY },
					result: { data: { unreadMessageCount: 3 } },
				},
				{
					request: { query: UNREAD_ORDER_NOTIFICATION_COUNT_QUERY },
					result: { data: { unreadOrderNotificationCount: 2 } },
				},
				{
					request: { query: UNREAD_NOTIFICATION_COUNT_QUERY },
					result: { data: { unreadNotificationCount: 5 } },
				},
				{
					request: { query: UNSEEN_RELEASE_NOTES_COUNT_QUERY },
					variableMatcher: () => true,
					result: { data: { unseenReleaseNotesCount: 0 } },
				},
				{
					request: { query: PUBLISHED_RELEASE_NOTES_QUERY },
					variableMatcher: (vars: { language?: string; limit?: number }) =>
						vars.limit === RELEASE_NOTES_HISTORY_LIMIT,
					result: { data: { publishedReleaseNotes: [] } },
				},
			]}
			addTypename={false}
		>
			<AppToastProvider>
				<MemoryRouter initialEntries={[initialRoute]}>
					<AppSidebar />
				</MemoryRouter>
			</AppToastProvider>
		</MockedProvider>
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

	it('shows admin nav items for ADMIN role', () => {
		mockAuthUser = { ...mockUser, role: 'ADMIN' };
		renderSidebar();
		expect(screen.getAllByText('nav.dashboard')).toHaveLength(1);
		expect(screen.getAllByText('nav.users').length).toBeGreaterThan(0);
		expect(screen.getByText('nav.platform')).toBeInTheDocument();
		expect(screen.getByText('nav.audit')).toBeInTheDocument();
		expect(screen.getByText('nav.categories')).toBeInTheDocument();
	});

	it('shows moderation items for MODERATOR role', () => {
		mockAuthUser = { ...mockUser, role: 'MODERATOR' };
		renderSidebar();
		expect(screen.getByText('nav.productModeration')).toBeInTheDocument();
		expect(screen.getByText('nav.reviewModeration')).toBeInTheDocument();
		expect(screen.getByText('nav.users')).toBeInTheDocument();
	});

	it('shows catalog browsing only for SELLER role', () => {
		mockAuthUser = { ...mockUser, role: 'SELLER' };
		renderSidebar();
		expect(screen.getByText('nav.dashboard')).toBeInTheDocument();
		expect(screen.getByText('nav.catalog')).toBeInTheDocument();
		expect(screen.queryByText('nav.cart')).not.toBeInTheDocument();
		expect(screen.queryByText('nav.wishlist')).not.toBeInTheDocument();
		expect(screen.getAllByText('nav.orders')).toHaveLength(1);
	});

	it('hides moderation items for BUYER role', () => {
		renderSidebar();
		expect(screen.queryByText('nav.productModeration')).not.toBeInTheDocument();
	});

	it('hides count badges when NAV_BADGE_COUNTS is empty (Phase 13 wires real data)', () => {
		// NAV_BADGE_COUNTS = {} means all badges are suppressed until Phase 13 wires real counts.
		mockAuthUser = { ...mockUser, role: 'ADMIN' };
		renderSidebar();
		expect(screen.queryByText('20')).not.toBeInTheDocument();
		expect(screen.queryByText('12')).not.toBeInTheDocument();
		expect(screen.queryByText('4')).not.toBeInTheDocument();
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
