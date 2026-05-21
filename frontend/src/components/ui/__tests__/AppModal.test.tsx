import { render, screen, fireEvent } from '@testing-library/react';
import { AppModal } from '../AppModal';

jest.mock('@fortawesome/react-fontawesome', () => ({
	FontAwesomeIcon: ({ 'aria-label': label }: { 'aria-label'?: string }) => (
		<span aria-label={label} />
	),
}));

describe('AppModal', () => {
	it('renders title and children', () => {
		render(
			<AppModal open onClose={() => {}} title="Test Modal">
				<p>Body content</p>
			</AppModal>
		);
		expect(screen.getByText('Test Modal')).toBeInTheDocument();
		expect(screen.getByText('Body content')).toBeInTheDocument();
	});

	it('calls onClose when close button clicked', () => {
		const onClose = jest.fn();
		render(
			<AppModal open onClose={onClose} title="Modal">
				content
			</AppModal>
		);
		fireEvent.click(screen.getByRole('button', { name: 'close' }));
		expect(onClose).toHaveBeenCalled();
	});

	it('does not render when closed', () => {
		render(
			<AppModal open={false} onClose={() => {}} title="Hidden">
				content
			</AppModal>
		);
		expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
	});
});
