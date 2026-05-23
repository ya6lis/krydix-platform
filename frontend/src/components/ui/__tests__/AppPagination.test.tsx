import { render, screen, fireEvent } from '@testing-library/react';
import { AppPagination } from '../AppPagination';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string, vars?: Record<string, unknown>) => {
			if (key === 'pagination.showing' && vars) {
				return `${vars.from}–${vars.to} of ${vars.total}`;
			}
			return key;
		},
	}),
}));

describe('AppPagination', () => {
	it('renders showing count text', () => {
		render(<AppPagination page={0} pageSize={10} total={100} onChange={() => {}} />);
		expect(screen.getByText('1–10 of 100')).toBeInTheDocument();
	});

	it('renders numbered page buttons', () => {
		render(<AppPagination page={0} pageSize={10} total={30} onChange={() => {}} />);
		expect(screen.getByText('1')).toBeInTheDocument();
		expect(screen.getByText('2')).toBeInTheDocument();
		expect(screen.getByText('3')).toBeInTheDocument();
	});

	it('prev button disabled on first page', () => {
		render(<AppPagination page={0} pageSize={10} total={50} onChange={() => {}} />);
		expect(screen.getByLabelText('pagination.prev')).toBeDisabled();
	});

	it('next button disabled on last page', () => {
		render(<AppPagination page={4} pageSize={10} total={50} onChange={() => {}} />);
		expect(screen.getByLabelText('pagination.next')).toBeDisabled();
	});

	it('calls onChange with next page on next click', () => {
		const onChange = jest.fn();
		render(<AppPagination page={0} pageSize={10} total={50} onChange={onChange} />);
		fireEvent.click(screen.getByLabelText('pagination.next'));
		expect(onChange).toHaveBeenCalledWith(1, 10);
	});

	it('calls onChange with prev page on prev click', () => {
		const onChange = jest.fn();
		render(<AppPagination page={2} pageSize={10} total={50} onChange={onChange} />);
		fireEvent.click(screen.getByLabelText('pagination.prev'));
		expect(onChange).toHaveBeenCalledWith(1, 10);
	});

	it('current page button has aria-current=page', () => {
		render(<AppPagination page={1} pageSize={10} total={50} onChange={() => {}} />);
		const btn = screen.getByText('2').closest('button');
		expect(btn).toHaveAttribute('aria-current', 'page');
	});

	it('shows ellipsis for large page counts', () => {
		render(<AppPagination page={5} pageSize={10} total={200} onChange={() => {}} />);
		const ellipses = screen.getAllByText('…');
		expect(ellipses.length).toBeGreaterThanOrEqual(1);
	});
});
