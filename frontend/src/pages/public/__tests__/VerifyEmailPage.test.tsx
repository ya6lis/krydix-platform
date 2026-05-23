import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import VerifyEmailPage from '../VerifyEmailPage';
import { VERIFY_EMAIL_MUTATION } from '@/graphql/operations/auth';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@fortawesome/react-fontawesome', () => ({
	FontAwesomeIcon: () => <span data-testid="icon" />,
}));

function renderPage(search = '') {
	return render(
		<MockedProvider
			mocks={[
				{
					request: { query: VERIFY_EMAIL_MUTATION, variables: { token: 'valid-token-123' } },
					result: { data: { verifyEmail: true } },
				},
			]}
			addTypename={false}
		>
			<MemoryRouter initialEntries={[`/auth/verify-email${search}`]}>
				<VerifyEmailPage />
			</MemoryRouter>
		</MockedProvider>
	);
}

describe('VerifyEmailPage', () => {
	it('shows error state immediately when no token in URL', () => {
		renderPage();
		expect(screen.getByText('auth.verifyEmailFailed')).toBeInTheDocument();
	});

	it('shows success state after mutation resolves with valid token', async () => {
		renderPage('?token=valid-token-123');
		await waitFor(() => {
			expect(screen.getByText('auth.verifyEmailSuccess')).toBeInTheDocument();
		});
	});

	it('shows error state when mutation rejects', async () => {
		render(
			<MockedProvider
				mocks={[
					{
						request: { query: VERIFY_EMAIL_MUTATION, variables: { token: 'bad-token' } },
						error: new Error('Invalid token'),
					},
				]}
				addTypename={false}
			>
				<MemoryRouter initialEntries={['/auth/verify-email?token=bad-token']}>
					<VerifyEmailPage />
				</MemoryRouter>
			</MockedProvider>
		);
		await waitFor(() => {
			expect(screen.getByText('auth.verifyEmailFailed')).toBeInTheDocument();
		});
	});
});
