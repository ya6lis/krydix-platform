import { render, screen } from '@testing-library/react';
import { StatCard } from '../StatCard';
import { Icons } from '@/constants/icons';

jest.mock('@fortawesome/react-fontawesome', () => ({
	FontAwesomeIcon: () => <span data-testid="icon" />,
}));

describe('StatCard', () => {
	it('renders the label and value', () => {
		render(<StatCard icon={Icons.order} label="All orders" value={20} />);
		expect(screen.getByText('All orders')).toBeInTheDocument();
		expect(screen.getByText('20')).toBeInTheDocument();
	});

	it('renders the icon', () => {
		render(<StatCard icon={Icons.order} label="Delivered" value={10} tone="cyan" />);
		expect(screen.getByTestId('icon')).toBeInTheDocument();
	});
});
