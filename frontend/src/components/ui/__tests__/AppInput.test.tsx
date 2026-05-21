import { render, screen } from '@testing-library/react';
import { AppInput } from '../AppInput';

describe('AppInput', () => {
	it('renders with label', () => {
		render(<AppInput label="Username" />);
		expect(screen.getByLabelText('Username')).toBeInTheDocument();
	});

	it('shows error state', () => {
		render(<AppInput label="Email" error helperText="Invalid email" />);
		expect(screen.getByText('Invalid email')).toBeInTheDocument();
	});

	it('is disabled when disabled prop set', () => {
		render(<AppInput label="Name" disabled />);
		expect(screen.getByRole('textbox')).toBeDisabled();
	});
});
