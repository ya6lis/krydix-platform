import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import BuyerSettingsPage from '../BuyerSettingsPage';
import { AppToastProvider } from '@/components/ui';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => key,
		i18n: { language: 'en' },
	}),
}));

jest.mock('@/hooks/useAuth', () => ({
	useAuth: () => ({ logout: jest.fn().mockResolvedValue(undefined) }),
}));

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useNavigate: () => jest.fn(),
}));

jest.mock('@fortawesome/react-fontawesome', () => ({
	FontAwesomeIcon: () => <span data-testid="icon" />,
}));

jest.mock('@/store/authStore', () => ({
	useAuthStore: (selector: (s: unknown) => unknown) =>
		selector({
			user: {
				id: 'u1',
				email: 'deja@krydix.co',
				role: 'BUYER',
				isEmailVerified: true,
				profile: {
					firstName: 'Deja',
					lastName: 'Brady',
					avatarUrl: null,
				},
			},
		}),
}));

function renderPage() {
	return render(
		<AppToastProvider>
			<MockedProvider mocks={[]} addTypename={false}>
				<MemoryRouter>
					<BuyerSettingsPage />
				</MemoryRouter>
			</MockedProvider>
		</AppToastProvider>
	);
}

describe('BuyerSettingsPage — layout', () => {
	it('renders page title', () => {
		renderPage();
		expect(screen.getByText('account.settings.title')).toBeInTheDocument();
	});

	it('renders account settings nav with profile, security, and close account', () => {
		renderPage();
		expect(screen.getByTestId('account-settings-nav')).toBeInTheDocument();
		expect(screen.getByText('account.settings.nav.profile')).toBeInTheDocument();
		expect(screen.getByText('account.settings.nav.security')).toBeInTheDocument();
		expect(screen.getByText('account.settings.nav.closeAccount')).toBeInTheDocument();
		expect(screen.queryByText('account.settings.nav.notifications')).not.toBeInTheDocument();
		expect(screen.queryByText('account.settings.nav.language')).not.toBeInTheDocument();
	});
});

describe('BuyerSettingsPage — profile section', () => {
	it('renders profile edit section', () => {
		renderPage();
		expect(screen.getByTestId('profile-edit-section')).toBeInTheDocument();
		expect(screen.getByText('account.settings.profile.title')).toBeInTheDocument();
	});
});

describe('BuyerSettingsPage — security section', () => {
	it('renders password fields and change password button', () => {
		renderPage();
		expect(screen.getByText('account.settings.security.title')).toBeInTheDocument();
		expect(screen.getAllByText('account.settings.security.currentPassword').length).toBeGreaterThan(
			0
		);
		expect(screen.getAllByText('account.settings.security.newPassword').length).toBeGreaterThan(0);
		expect(screen.getAllByText('account.settings.security.confirmPassword').length).toBeGreaterThan(
			0
		);
		expect(
			screen.getByRole('button', { name: 'account.settings.security.changePassword' })
		).toBeInTheDocument();
	});

	it('does not render two-factor authentication toggle', () => {
		renderPage();
		expect(screen.queryByText('Two-factor authentication')).not.toBeInTheDocument();
	});
});

describe('BuyerSettingsPage — close account', () => {
	it('renders close account action', () => {
		renderPage();
		expect(
			screen.getByRole('button', { name: 'account.settings.closeAccount.action' })
		).toBeInTheDocument();
	});

	it('opens confirm dialog with password field when close account clicked', async () => {
		renderPage();
		fireEvent.click(screen.getByRole('button', { name: 'account.settings.closeAccount.action' }));
		await waitFor(() => {
			expect(
				screen.getAllByText('account.settings.closeAccount.passwordLabel').length
			).toBeGreaterThan(0);
			expect(screen.getByText('confirmDialog.cancel')).toBeInTheDocument();
		});
	});
});

describe('BuyerSettingsPage — removed sections', () => {
	it('does not render notifications or language sections', () => {
		renderPage();
		expect(screen.queryByText('account.settings.notifications.title')).not.toBeInTheDocument();
		expect(screen.queryByText('account.settings.language.title')).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: 'account.settings.notifications.savePreferences' })
		).not.toBeInTheDocument();
	});
});
