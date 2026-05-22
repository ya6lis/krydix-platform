import { render, screen, fireEvent } from '@testing-library/react';
import { AppTabs } from '../AppTabs';

const tabs = [
	{ value: 'all', label: 'All', count: 20 },
	{ value: 'pending', label: 'Pending', count: 6 },
];

describe('AppTabs', () => {
	it('renders all tab labels and counts', () => {
		render(<AppTabs tabs={tabs} value="all" onChange={() => {}} />);
		expect(screen.getByText('All')).toBeInTheDocument();
		expect(screen.getByText('Pending')).toBeInTheDocument();
		expect(screen.getByText('20')).toBeInTheDocument();
	});

	it('fires onChange with the selected value', () => {
		const onChange = jest.fn();
		render(<AppTabs tabs={tabs} value="all" onChange={onChange} />);
		fireEvent.click(screen.getByText('Pending'));
		expect(onChange).toHaveBeenCalledWith('pending');
	});
});
