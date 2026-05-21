import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from '../ConfirmDialog';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@fortawesome/react-fontawesome', () => ({
	FontAwesomeIcon: () => <span />,
}));

describe('ConfirmDialog', () => {
	it('renders message', () => {
		render(
			<ConfirmDialog open onClose={() => {}} onConfirm={() => {}} message="Delete this item?" />
		);
		expect(screen.getByText('Delete this item?')).toBeInTheDocument();
	});

	it('calls onConfirm', () => {
		const onConfirm = jest.fn();
		render(<ConfirmDialog open onClose={() => {}} onConfirm={onConfirm} message="Sure?" />);
		fireEvent.click(screen.getByText('confirmDialog.confirm'));
		expect(onConfirm).toHaveBeenCalled();
	});

	it('calls onClose on cancel', () => {
		const onClose = jest.fn();
		render(<ConfirmDialog open onClose={onClose} onConfirm={() => {}} message="Sure?" />);
		fireEvent.click(screen.getByText('confirmDialog.cancel'));
		expect(onClose).toHaveBeenCalled();
	});
});
