import { render, screen, fireEvent } from '@testing-library/react';
import { AppRadio } from '../AppRadio';

const options = [
	{ value: 'a', label: 'Option A' },
	{ value: 'b', label: 'Option B' },
];

describe('AppRadio', () => {
	it('renders all options', () => {
		render(<AppRadio options={options} />);
		expect(screen.getByText('Option A')).toBeInTheDocument();
		expect(screen.getByText('Option B')).toBeInTheDocument();
	});

	it('renders group label', () => {
		render(<AppRadio options={options} label="Choose" />);
		expect(screen.getByText('Choose')).toBeInTheDocument();
	});

	it('fires onChange on selection', () => {
		const onChange = jest.fn();
		render(<AppRadio options={options} onChange={onChange} />);
		fireEvent.click(screen.getByLabelText('Option A'));
		expect(onChange).toHaveBeenCalled();
	});
});
