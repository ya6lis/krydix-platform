import { render, screen, fireEvent } from '@testing-library/react';
import { AppButton } from '../AppButton';

describe('AppButton', () => {
	it('renders children', () => {
		render(<AppButton>Save</AppButton>);
		expect(screen.getByText('Save')).toBeInTheDocument();
	});

	it('is disabled when loading', () => {
		render(<AppButton loading>Save</AppButton>);
		expect(screen.getByRole('button')).toBeDisabled();
	});

	it('shows spinner when loading', () => {
		render(<AppButton loading>Save</AppButton>);
		expect(document.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
	});

	it('fires onClick', () => {
		const onClick = jest.fn();
		render(<AppButton onClick={onClick}>Click</AppButton>);
		fireEvent.click(screen.getByRole('button'));
		expect(onClick).toHaveBeenCalledTimes(1);
	});
});
