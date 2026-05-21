import { render, screen } from '@testing-library/react';
import { AppTable, AppTableColumn } from '../AppTable';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@fortawesome/react-fontawesome', () => ({
	FontAwesomeIcon: () => <span />,
}));

interface Row {
	id: number;
	name: string;
}

const columns: AppTableColumn<Row>[] = [
	{ key: 'id', label: 'ID' },
	{ key: 'name', label: 'Name' },
];

const rows: Row[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
];

describe('AppTable', () => {
	it('renders column headers', () => {
		render(<AppTable columns={columns} rows={rows} rowKey={(r) => r.id} />);
		expect(screen.getByText('ID')).toBeInTheDocument();
		expect(screen.getByText('Name')).toBeInTheDocument();
	});

	it('renders row data', () => {
		render(<AppTable columns={columns} rows={rows} rowKey={(r) => r.id} />);
		expect(screen.getByText('Alice')).toBeInTheDocument();
		expect(screen.getByText('Bob')).toBeInTheDocument();
	});

	it('shows empty state when no rows', () => {
		render(<AppTable columns={columns} rows={[]} rowKey={(r) => r.id} />);
		expect(screen.getByText('emptyState.title')).toBeInTheDocument();
	});

	it('shows loader when loading', () => {
		render(<AppTable columns={columns} rows={[]} rowKey={(r) => r.id} loading />);
		expect(document.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
	});
});
