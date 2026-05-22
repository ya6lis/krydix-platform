import { render, screen, fireEvent } from '@testing-library/react';
import { RoleChooser } from '../RoleChooser';
import { Icons } from '@/constants/icons';

jest.mock('@fortawesome/react-fontawesome', () => ({
	FontAwesomeIcon: () => <span data-testid="icon" />,
}));

const options = [
	{
		value: 'buyer',
		icon: Icons.cart,
		title: 'Buy on Krydix',
		description: 'Shop verified sellers.',
	},
	{
		value: 'seller',
		icon: Icons.store,
		title: 'Sell on Krydix',
		description: 'Apply to become a seller.',
	},
];

describe('RoleChooser', () => {
	it('renders all role options', () => {
		render(<RoleChooser options={options} value="buyer" onChange={() => {}} />);
		expect(screen.getByText('Buy on Krydix')).toBeInTheDocument();
		expect(screen.getByText('Sell on Krydix')).toBeInTheDocument();
	});

	it('marks the active role as checked', () => {
		render(<RoleChooser options={options} value="buyer" onChange={() => {}} />);
		expect(screen.getByRole('radio', { name: /Buy on Krydix/ })).toHaveAttribute(
			'aria-checked',
			'true'
		);
	});

	it('fires onChange with the chosen role', () => {
		const onChange = jest.fn();
		render(<RoleChooser options={options} value="buyer" onChange={onChange} />);
		fireEvent.click(screen.getByText('Sell on Krydix'));
		expect(onChange).toHaveBeenCalledWith('seller');
	});
});
