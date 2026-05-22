import { render, screen } from '@testing-library/react';
import { AppProgress } from '../AppProgress';

describe('AppProgress', () => {
	it('renders the rounded percentage label', () => {
		render(<AppProgress value={68} />);
		expect(screen.getByText('68%')).toBeInTheDocument();
	});

	it('clamps values above 100', () => {
		render(<AppProgress value={150} />);
		expect(screen.getByText('100%')).toBeInTheDocument();
	});

	it('renders the complete label when complete', () => {
		render(<AppProgress value={100} complete completeLabel="Done" />);
		expect(screen.getByText('Done')).toBeInTheDocument();
	});

	it('hides the label when showLabel is false', () => {
		render(<AppProgress value={40} showLabel={false} />);
		expect(screen.queryByText('40%')).not.toBeInTheDocument();
	});
});
