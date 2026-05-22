import { render, screen } from '@testing-library/react';
import { AppAlert } from '../AppAlert';

jest.mock('@fortawesome/react-fontawesome', () => ({
	FontAwesomeIcon: () => <span data-testid="icon" />,
}));

describe('AppAlert', () => {
	it('renders title and body', () => {
		render(<AppAlert title="Under review">Check back later.</AppAlert>);
		expect(screen.getByText('Under review')).toBeInTheDocument();
		expect(screen.getByText('Check back later.')).toBeInTheDocument();
	});

	it('renders the severity icon', () => {
		render(<AppAlert severity="error" title="Failed" />);
		expect(screen.getByTestId('icon')).toBeInTheDocument();
	});
});
