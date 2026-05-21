import { render, screen } from '@testing-library/react';
import { AppLabel } from '../AppLabel';

describe('AppLabel', () => {
	it('renders children', () => {
		render(<AppLabel>Email</AppLabel>);
		expect(screen.getByText('Email')).toBeInTheDocument();
	});

	it('shows required asterisk when required=true', () => {
		render(<AppLabel required>Email</AppLabel>);
		expect(screen.getByText('*')).toBeInTheDocument();
	});

	it('does not show asterisk when required=false', () => {
		render(<AppLabel>Email</AppLabel>);
		expect(screen.queryByText('*')).not.toBeInTheDocument();
	});
});
