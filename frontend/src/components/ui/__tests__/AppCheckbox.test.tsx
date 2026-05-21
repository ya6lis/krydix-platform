import { render, screen, fireEvent } from '@testing-library/react';
import { AppCheckbox } from '../AppCheckbox';

describe('AppCheckbox', () => {
	it('renders with label', () => {
		render(<AppCheckbox label="Accept terms" />);
		expect(screen.getByText('Accept terms')).toBeInTheDocument();
	});

	it('calls onChange with boolean value', () => {
		const onChange = jest.fn();
		render(<AppCheckbox label="Accept" onChange={onChange} />);
		fireEvent.click(screen.getByRole('checkbox'));
		expect(onChange).toHaveBeenCalledWith(true);
	});

	it('renders checked state', () => {
		render(<AppCheckbox label="Accept" checked readOnly />);
		expect(screen.getByRole('checkbox')).toBeChecked();
	});
});
