import { render, screen } from '@testing-library/react';
import { AppAvatar } from '../AppAvatar';

describe('AppAvatar', () => {
	it('derives initials from a full name', () => {
		render(<AppAvatar name="Lucia O'Brien" />);
		expect(screen.getByText('LO')).toBeInTheDocument();
	});

	it('derives initials from a single word', () => {
		render(<AppAvatar name="Krydix" />);
		expect(screen.getByText('KR')).toBeInTheDocument();
	});

	it('falls back to ? for an empty name', () => {
		render(<AppAvatar name="   " />);
		expect(screen.getByText('?')).toBeInTheDocument();
	});
});
