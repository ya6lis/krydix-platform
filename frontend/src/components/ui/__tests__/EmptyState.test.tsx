import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@fortawesome/react-fontawesome', () => ({
	FontAwesomeIcon: () => <span data-testid="icon" />,
}));

describe('EmptyState', () => {
	it('renders default i18n title', () => {
		render(<EmptyState />);
		expect(screen.getByText('emptyState.title')).toBeInTheDocument();
	});

	it('renders custom title and description', () => {
		render(<EmptyState title="No orders" description="You have no orders yet." />);
		expect(screen.getByText('No orders')).toBeInTheDocument();
		expect(screen.getByText('You have no orders yet.')).toBeInTheDocument();
	});

	it('renders action button and calls handler', () => {
		const onAction = jest.fn();
		render(<EmptyState actionLabel="Add Item" onAction={onAction} />);
		fireEvent.click(screen.getByText('Add Item'));
		expect(onAction).toHaveBeenCalled();
	});

	it('does not render button when no actionLabel', () => {
		render(<EmptyState />);
		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});
});
