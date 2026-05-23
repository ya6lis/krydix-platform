import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../LoginPage';
import { LOGIN_MUTATION } from '@/graphql/operations/auth';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@fortawesome/react-fontawesome', () => ({
	FontAwesomeIcon: () => <span data-testid="icon" />,
}));

// Mock authStore — we only need setAuth for the success path
const mockSetAuth = jest.fn();
jest.mock('@/store/authStore', () => ({
	useAuthStore: (selector: (s: { setAuth: typeof mockSetAuth }) => unknown) =>
		selector({ setAuth: mockSetAuth }),
}));

const loginSuccessMock: MockedResponse = {
	request: {
		query: LOGIN_MUTATION,
		variables: { input: { email: 'user@example.com', password: 'ValidPass12!!' } },
	},
	result: {
		data: {
			login: {
				accessToken: 'at',
				refreshToken: 'rt',
				user: {
					id: 'u1',
					email: 'user@example.com',
					role: 'BUYER',
					isEmailVerified: true,
					profile: { firstName: 'Jane', lastName: 'Doe', avatarUrl: null },
				},
			},
		},
	},
};

const loginErrorMock: MockedResponse = {
	request: {
		query: LOGIN_MUTATION,
		variables: { input: { email: 'bad@bad.co', password: 'WrongPass12!!' } },
	},
	error: new Error('Invalid credentials'),
};

function renderPage(mocks = [loginSuccessMock]) {
	return render(
		<MockedProvider mocks={mocks} addTypename={false}>
			<MemoryRouter initialEntries={['/auth/login']}>
				<LoginPage />
			</MemoryRouter>
		</MockedProvider>
	);
}

describe('LoginPage', () => {
	beforeEach(() => mockSetAuth.mockClear());

	it('renders sign-in heading', () => {
		renderPage();
		expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
	});

	it('has email and password fields', () => {
		renderPage();
		expect(screen.getByLabelText('auth.workEmail')).toBeInTheDocument();
		expect(screen.getByLabelText('auth.password')).toBeInTheDocument();
	});

	it('has a Sign In submit button', () => {
		renderPage();
		expect(screen.getByRole('button', { name: /auth\.login/i })).toBeInTheDocument();
	});

	it('shows link to register page', () => {
		renderPage();
		expect(screen.getByText(/auth\.createOne/)).toBeInTheDocument();
	});

	it('shows error message on failed login', async () => {
		renderPage([loginErrorMock]);
		fireEvent.change(screen.getByLabelText('auth.workEmail'), {
			target: { value: 'bad@bad.co' },
		});
		fireEvent.change(screen.getByLabelText('auth.password'), {
			target: { value: 'WrongPass12!!' },
		});
		fireEvent.click(screen.getByRole('button', { name: /auth\.login/i }));
		await waitFor(() => {
			expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
		});
	});

	it('calls setAuth on successful login', async () => {
		renderPage([loginSuccessMock]);
		fireEvent.change(screen.getByLabelText('auth.workEmail'), {
			target: { value: 'user@example.com' },
		});
		fireEvent.change(screen.getByLabelText('auth.password'), {
			target: { value: 'ValidPass12!!' },
		});
		fireEvent.click(screen.getByRole('button', { name: /auth\.login/i }));
		await waitFor(() => {
			expect(mockSetAuth).toHaveBeenCalledWith(
				expect.objectContaining({ email: 'user@example.com' }),
				'at',
				'rt'
			);
		});
	});
});
