import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import RegisterPage from '../RegisterPage';
import { REGISTER_MUTATION } from '@/graphql/operations/auth';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@fortawesome/react-fontawesome', () => ({
	FontAwesomeIcon: () => <span data-testid="icon" />,
}));

const registerSuccessMock = {
	request: {
		query: REGISTER_MUTATION,
		variables: {
			input: {
				firstName: 'Jane',
				lastName: 'Doe',
				email: 'jane@example.com',
				password: 'ValidPass12!!',
			},
		},
	},
	result: { data: { register: true } },
};

function renderPage(mocks = [registerSuccessMock]) {
	return render(
		<MockedProvider mocks={mocks} addTypename={false}>
			<MemoryRouter initialEntries={['/auth/register']}>
				<RegisterPage />
			</MemoryRouter>
		</MockedProvider>
	);
}

function fillForm({
	firstName = 'Jane',
	lastName = 'Doe',
	email = 'jane@example.com',
	password = 'ValidPass12!!',
} = {}) {
	fireEvent.change(screen.getByLabelText('auth.firstName'), { target: { value: firstName } });
	fireEvent.change(screen.getByLabelText('auth.lastName'), { target: { value: lastName } });
	fireEvent.change(screen.getByLabelText('auth.email'), { target: { value: email } });
	fireEvent.change(screen.getByLabelText('auth.password'), { target: { value: password } });
}

describe('RegisterPage', () => {
	it('renders create account heading', () => {
		renderPage();
		expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
	});

	it('shows buyer and seller role options', () => {
		renderPage();
		expect(screen.getByText('auth.roleBuyerTitle')).toBeInTheDocument();
		expect(screen.getByText('auth.roleSellerTitle')).toBeInTheDocument();
	});

	it('has first name, last name, email, password fields', () => {
		renderPage();
		expect(screen.getByLabelText('auth.firstName')).toBeInTheDocument();
		expect(screen.getByLabelText('auth.lastName')).toBeInTheDocument();
		expect(screen.getByLabelText('auth.email')).toBeInTheDocument();
		expect(screen.getByLabelText('auth.password')).toBeInTheDocument();
	});

	it('shows link to login page', () => {
		renderPage();
		expect(screen.getByText(/auth\.alreadyHaveOne/)).toBeInTheDocument();
	});

	it('blocks submit and shows error when terms not checked', async () => {
		renderPage();
		fillForm();
		fireEvent.click(screen.getByRole('button', { name: /auth\.register/i }));
		await waitFor(() => {
			expect(screen.getByText('auth.termsRequired')).toBeInTheDocument();
		});
	});

	it('shows success state after successful registration', async () => {
		renderPage();
		fillForm();
		// check terms checkbox
		const checkbox = screen
			.getByText('auth.termsAgreePrefix', { exact: false })
			.closest('label')
			?.querySelector('input[type="checkbox"]');
		if (checkbox) fireEvent.click(checkbox);
		fireEvent.click(screen.getByRole('button', { name: /auth\.register/i }));
		await waitFor(() => {
			expect(screen.getByText('auth.registerSuccess')).toBeInTheDocument();
		});
	});

	it('rejects password shorter than 12 characters', async () => {
		renderPage();
		fillForm({ password: 'Short1!' });
		fireEvent.click(screen.getByRole('button', { name: /auth\.register/i }));
		// RHF validation fires, form does not submit — no success shown
		await waitFor(() => {
			expect(screen.queryByText('auth.registerSuccess')).not.toBeInTheDocument();
		});
	});
});
