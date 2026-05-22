import { render, screen } from '@testing-library/react';
import { RangeSlider } from '../RangeSlider';

describe('RangeSlider', () => {
	it('renders the prefixed min and max value labels', () => {
		render(<RangeSlider min={0} max={1000} value={[100, 800]} onChange={() => {}} prefix="$" />);
		expect(screen.getByText('$100')).toBeInTheDocument();
		expect(screen.getByText('$800')).toBeInTheDocument();
	});

	it('renders two slider handles', () => {
		render(<RangeSlider min={0} max={100} value={[20, 60]} onChange={() => {}} />);
		expect(screen.getAllByRole('slider')).toHaveLength(2);
	});

	it('hides the value labels below the track when hideValues is set', () => {
		render(
			<RangeSlider min={0} max={100} value={[10, 90]} onChange={() => {}} prefix="$" hideValues />
		);
		expect(screen.queryByText('$10')).not.toBeInTheDocument();
		expect(screen.queryByText('$90')).not.toBeInTheDocument();
	});
});
