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

	it('renders with primary tone (dark bg)', () => {
		render(<AppButton tone="primary">Submit</AppButton>);
		const btn = screen.getByRole('button');
		expect(btn).toBeInTheDocument();
		expect(btn).not.toBeDisabled();
	});

	it('renders with accent tone', () => {
		render(<AppButton tone="accent">Accent</AppButton>);
		expect(screen.getByRole('button')).toBeInTheDocument();
	});

	it('renders with ghost tone', () => {
		render(<AppButton tone="ghost">Ghost</AppButton>);
		expect(screen.getByRole('button')).toBeInTheDocument();
	});

	it('renders with danger tone', () => {
		render(<AppButton tone="danger">Delete</AppButton>);
		expect(screen.getByRole('button')).toBeInTheDocument();
	});

	it('renders with success tone', () => {
		render(<AppButton tone="success">Approve</AppButton>);
		expect(screen.getByRole('button')).toBeInTheDocument();
	});

	it('disabled + tone still disables button', () => {
		render(
			<AppButton tone="primary" disabled>
				Locked
			</AppButton>
		);
		expect(screen.getByRole('button')).toBeDisabled();
	});
});
