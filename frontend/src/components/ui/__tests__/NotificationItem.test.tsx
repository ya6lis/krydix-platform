import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationItem } from '../NotificationItem';
import { Icons } from '@/constants/icons';

jest.mock('@fortawesome/react-fontawesome', () => ({
	FontAwesomeIcon: () => <span data-testid="icon" />,
}));

describe('NotificationItem', () => {
	it('renders title, body and time', () => {
		render(
			<NotificationItem
				icon={Icons.order}
				title="New order #KX-6011"
				body="Lucia placed an order."
				time="2m ago"
			/>
		);
		expect(screen.getByText('New order #KX-6011')).toBeInTheDocument();
		expect(screen.getByText('Lucia placed an order.')).toBeInTheDocument();
		expect(screen.getByText('2m ago')).toBeInTheDocument();
	});

	it('fires onClick when clicked', () => {
		const onClick = jest.fn();
		render(<NotificationItem icon={Icons.order} title="Tap me" time="now" onClick={onClick} />);
		fireEvent.click(screen.getByText('Tap me'));
		expect(onClick).toHaveBeenCalled();
	});
});
