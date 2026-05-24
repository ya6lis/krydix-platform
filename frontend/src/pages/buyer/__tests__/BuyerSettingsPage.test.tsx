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

// ── tests ────────────────────────────────────────────────────────────────────
describe('BuyerSettingsPage — layout', () => {
	it('renders page title', () => {
		renderPage();
		expect(screen.getByText('account.settings.title')).toBeInTheDocument();
	});

	it('renders page subtitle', () => {
		renderPage();
		expect(screen.getByText('account.settings.subtitle')).toBeInTheDocument();
	});

	it('renders left nav section label', () => {
		renderPage();
		expect(screen.getByText('account.settings.nav.account')).toBeInTheDocument();
	});

	it('renders all 4 nav items', () => {
		renderPage();
		expect(screen.getByText('account.settings.nav.profile')).toBeInTheDocument();
		expect(screen.getByText('account.settings.nav.security')).toBeInTheDocument();
		expect(screen.getByText('account.settings.nav.notifications')).toBeInTheDocument();
		expect(screen.getByText('account.settings.nav.language')).toBeInTheDocument();
	});
});

describe('BuyerSettingsPage — profile section', () => {
	it('renders profile section title', () => {
		renderPage();
		expect(screen.getByText('account.settings.profile.title')).toBeInTheDocument();
	});

	it('prefills first name from user store', () => {
		renderPage();
		expect(screen.getByDisplayValue('Deja')).toBeInTheDocument();
	});

	it('prefills last name from user store', () => {
		renderPage();
		expect(screen.getByDisplayValue('Brady')).toBeInTheDocument();
	});

	it('prefills email from user store', () => {
		renderPage();
		expect(screen.getByDisplayValue('deja@krydix.co')).toBeInTheDocument();
	});

	it('renders avatar upload button', () => {
		renderPage();
		expect(screen.getByText('account.settings.profile.uploadAvatar')).toBeInTheDocument();
	});

	it('renders avatar help text', () => {
		renderPage();
		expect(screen.getByText('account.settings.profile.avatarHelp')).toBeInTheDocument();
	});

	it('renders avatar initials derived from user name', () => {
		renderPage();
		// "Deja Brady" → initials "DB"
		expect(screen.getByText('DB')).toBeInTheDocument();
	});
});

describe('BuyerSettingsPage — notifications section', () => {
	it('renders notifications section title', () => {
		renderPage();
		expect(screen.getByText('account.settings.notifications.title')).toBeInTheDocument();
	});

	it('renders all 8 notification toggle labels', () => {
		renderPage();
		const keys = [
			'newOrder',
			'orderStatus',
			'newMessage',
			'moderation',
			'verification',
			'complaint',
			'weekly',
			'updates',
		];
		keys.forEach((key) => {
			expect(screen.getByText(`account.settings.notifications.${key}`)).toBeInTheDocument();
		});
	});

	it('toggles a notification switch on click', async () => {
		renderPage();
		// Get all checkboxes; 'weekly' is at index 6 (0-based) and starts OFF
		const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
		// weekly is the 7th toggle (index 6)
		const weekly = checkboxes[6];
		expect(weekly).not.toBeChecked();
		fireEvent.click(weekly);
		await waitFor(() => {
			expect(weekly).toBeChecked();
		});
	});
});

describe('BuyerSettingsPage — language section', () => {
	it('renders language section title', () => {
		renderPage();
		expect(screen.getByText('account.settings.language.title')).toBeInTheDocument();
	});

	it('renders interface language label', () => {
		renderPage();
		// MUI Select renders label in two DOM nodes; use getAllByText
		expect(screen.getAllByText('account.settings.language.interfaceLang').length).toBeGreaterThan(
			0
		);
	});

	it('renders timezone label', () => {
		renderPage();
		expect(screen.getAllByText('account.settings.language.timezone').length).toBeGreaterThan(0);
	});

	it('renders currency label', () => {
		renderPage();
		expect(screen.getAllByText('account.settings.language.currency').length).toBeGreaterThan(0);
	});

	it('renders date format label', () => {
		renderPage();
		expect(screen.getAllByText('account.settings.language.dateFormat').length).toBeGreaterThan(0);
	});
});

describe('BuyerSettingsPage — security section', () => {
	it('renders security section title', () => {
		renderPage();
		expect(screen.getByText('account.settings.security.title')).toBeInTheDocument();
	});

	it('renders current password field', () => {
		renderPage();
		// MUI TextField renders label in two DOM nodes; use getAllByText
		expect(screen.getAllByText('account.settings.security.currentPassword').length).toBeGreaterThan(
			0
		);
	});

	it('renders new password field', () => {
		renderPage();
		expect(screen.getAllByText('account.settings.security.newPassword').length).toBeGreaterThan(0);
	});

	it('renders two-factor toggle label', () => {
		renderPage();
		expect(screen.getByText('Two-factor authentication')).toBeInTheDocument();
	});
});

describe('BuyerSettingsPage — danger zone', () => {
	it('renders Close account button', () => {
		renderPage();
		expect(screen.getByRole('button', { name: 'Close account' })).toBeInTheDocument();
	});

	it('opens confirm dialog when Close account clicked', async () => {
		renderPage();
		fireEvent.click(screen.getByRole('button', { name: 'Close account' }));
		// Dialog renders cancel button with default i18n key
		await waitFor(() => {
			expect(screen.getByText('confirmDialog.cancel')).toBeInTheDocument();
		});
	});
});

describe('BuyerSettingsPage — save bar', () => {
	it('renders Save changes button', () => {
		renderPage();
		expect(
			screen.getByRole('button', { name: 'account.settings.profile.saveChanges' })
		).toBeInTheDocument();
	});

	it('renders Discard button', () => {
		renderPage();
		expect(screen.getByRole('button', { name: 'common.discard' })).toBeInTheDocument();
	});
});
