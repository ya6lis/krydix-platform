import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../StatusBadge';

describe('StatusBadge', () => {
	it('renders label', () => {
		render(<StatusBadge status="APPROVED" label="Approved" />);
		expect(screen.getByText('Approved')).toBeInTheDocument();
	});

	it('renders for unknown status without crash', () => {
		render(<StatusBadge status="UNKNOWN_STATUS" label="Unknown" />);
		expect(screen.getByText('Unknown')).toBeInTheDocument();
	});
});
