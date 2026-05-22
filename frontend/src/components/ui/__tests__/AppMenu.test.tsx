import { render, screen, fireEvent } from '@testing-library/react';
import { AppMenu } from '../AppMenu';
import { Icons } from '@/constants/icons';

jest.mock('@fortawesome/react-fontawesome', () => ({
	FontAwesomeIcon: () => <span data-testid="icon" />,
}));

const items = [
	{ label: 'Edit', icon: Icons.edit, onClick: jest.fn() },
	{ label: 'Delete', icon: Icons.delete, onClick: jest.fn(), danger: true },
];

describe('AppMenu', () => {
	it('renders items when open', () => {
		render(<AppMenu anchorEl={document.body} open onClose={() => {}} items={items} />);
		expect(screen.getByText('Edit')).toBeInTheDocument();
		expect(screen.getByText('Delete')).toBeInTheDocument();
	});

	it('does not render items when closed', () => {
		render(<AppMenu anchorEl={null} open={false} onClose={() => {}} items={items} />);
		expect(screen.queryByText('Edit')).not.toBeInTheDocument();
	});

	it('fires the item handler and closes', () => {
		const onClick = jest.fn();
		const onClose = jest.fn();
		render(
			<AppMenu
				anchorEl={document.body}
				open
				onClose={onClose}
				items={[{ label: 'Run', onClick }]}
			/>
		);
		fireEvent.click(screen.getByText('Run'));
		expect(onClick).toHaveBeenCalled();
		expect(onClose).toHaveBeenCalled();
	});
});
