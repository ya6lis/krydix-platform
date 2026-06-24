import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFound404Page from '../404Page';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string) => key }),
	Trans: ({
		i18nKey,
		components,
	}: {
		i18nKey: string;
		components?: Record<string, React.ReactElement>;
	}) => <span data-testid={`trans-${i18nKey}`}>{i18nKey}</span>,
}));

jest.mock('@fortawesome/react-fontawesome', () => ({
	FontAwesomeIcon: () => <span data-testid="fa-icon" />,
}));

jest.mock('@/store/authStore', () => ({
	useAuthStore: (selector: (state: { user: null }) => unknown) => selector({ user: null }),
}));

describe('NotFound404Page', () => {
	it('renders 404 content and quick links for guests', () => {
		render(
			<MemoryRouter initialEntries={['/missing-page']}>
				<NotFound404Page />
			</MemoryRouter>
		);

		expect(screen.getByText('error404.eyebrow')).toBeInTheDocument();
		expect(screen.getByText('404')).toBeInTheDocument();
		expect(screen.getByText('error404.actions.dashboard')).toBeInTheDocument();
		expect(screen.getByText('error404.actions.catalog')).toBeInTheDocument();
		expect(screen.getByText('error404.quick.catalog.title')).toBeInTheDocument();
		expect(screen.getByText('error404.quick.signIn.title')).toBeInTheDocument();
		expect(screen.getByText('error404.art.caption')).toBeInTheDocument();
	});
});
