import { render, screen } from '@testing-library/react';
import { AppPagination } from '../AppPagination';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

describe('AppPagination', () => {
	it('renders rows-per-page label', () => {
		render(<AppPagination page={0} pageSize={10} total={100} onChange={() => {}} />);
		expect(screen.getByText('pagination.rowsPerPage:')).toBeInTheDocument();
	});

	it('shows page size selector with correct value', () => {
		render(<AppPagination page={0} pageSize={25} total={100} onChange={() => {}} />);
		expect(screen.getByText('25')).toBeInTheDocument();
	});
});
