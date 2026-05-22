import { render, screen, fireEvent } from '@testing-library/react';
import { SegmentedControl } from '../SegmentedControl';

const options = [
	{ value: 'week', label: 'Week' },
	{ value: 'month', label: 'Month' },
	{ value: 'year', label: 'Year' },
];

describe('SegmentedControl', () => {
	it('renders all options', () => {
		render(<SegmentedControl options={options} value="year" onChange={() => {}} />);
		expect(screen.getByText('Week')).toBeInTheDocument();
		expect(screen.getByText('Year')).toBeInTheDocument();
	});

	it('marks the active option as selected', () => {
		render(<SegmentedControl options={options} value="year" onChange={() => {}} />);
		expect(screen.getByRole('tab', { name: 'Year' })).toHaveAttribute('aria-selected', 'true');
	});

	it('fires onChange with the clicked value', () => {
		const onChange = jest.fn();
		render(<SegmentedControl options={options} value="year" onChange={onChange} />);
		fireEvent.click(screen.getByText('Month'));
		expect(onChange).toHaveBeenCalledWith('month');
	});
});
