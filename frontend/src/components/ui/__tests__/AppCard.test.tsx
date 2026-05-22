import { render, screen } from '@testing-library/react';
import { AppCard } from '../AppCard';

describe('AppCard', () => {
	it('renders children', () => {
		render(<AppCard>Body</AppCard>);
		expect(screen.getByText('Body')).toBeInTheDocument();
	});

	it('renders header title and subtitle', () => {
		render(
			<AppCard title="Banking details" subtitle="Where payouts go.">
				Body
			</AppCard>
		);
		expect(screen.getByText('Banking details')).toBeInTheDocument();
		expect(screen.getByText('Where payouts go.')).toBeInTheDocument();
	});

	it('renders header action', () => {
		render(
			<AppCard title="Card" headerAction={<button>Edit</button>}>
				Body
			</AppCard>
		);
		expect(screen.getByText('Edit')).toBeInTheDocument();
	});
});
