import { render, screen, fireEvent } from '@testing-library/react';
import { AppSwitch } from '../AppSwitch';

describe('AppSwitch', () => {
	it('renders label and description', () => {
		render(<AppSwitch label="New order" description="Notify on order." />);
		expect(screen.getByText('New order')).toBeInTheDocument();
		expect(screen.getByText('Notify on order.')).toBeInTheDocument();
	});

	it('fires onChange with the checked value', () => {
		const onChange = jest.fn();
		render(<AppSwitch label="Toggle" onChange={onChange} />);
		fireEvent.click(screen.getByRole('checkbox'));
		expect(onChange).toHaveBeenCalledWith(true);
	});

	it('renders bare switch without label', () => {
		render(<AppSwitch />);
		expect(screen.getByRole('checkbox')).toBeInTheDocument();
	});
});
