import { render, screen } from '@testing-library/react';
import { AppSelect } from '../AppSelect';

const options = [
	{ value: 'a', label: 'Alpha' },
	{ value: 'b', label: 'Beta' },
];

describe('AppSelect', () => {
	it('renders with label', () => {
		render(<AppSelect label="Category" options={options} value="" onChange={() => {}} />);
		expect(screen.getByLabelText('Category')).toBeInTheDocument();
	});

	it('shows helper text on error', () => {
		render(
			<AppSelect
				label="Category"
				options={options}
				value=""
				onChange={() => {}}
				error
				helperText="Required"
			/>
		);
		expect(screen.getByText('Required')).toBeInTheDocument();
	});
});
