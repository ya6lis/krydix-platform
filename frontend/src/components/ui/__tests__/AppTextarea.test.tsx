import { render, screen } from '@testing-library/react';
import { AppTextarea } from '../AppTextarea';

describe('AppTextarea', () => {
	it('renders with label', () => {
		render(<AppTextarea label="Description" />);
		expect(screen.getByLabelText('Description')).toBeInTheDocument();
	});

	it('shows char counter when maxLength set', () => {
		render(<AppTextarea label="Bio" maxLength={200} value="Hello" />);
		expect(screen.getByText('5/200')).toBeInTheDocument();
	});

	it('shows error helper text', () => {
		render(<AppTextarea label="Bio" error helperText="Too long" />);
		expect(screen.getByText('Too long')).toBeInTheDocument();
	});
});
