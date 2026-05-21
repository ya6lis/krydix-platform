import {
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { AppLoader } from './AppLoader';
import { EmptyState } from './EmptyState';

export interface AppTableColumn<T> {
	key: string;
	label: string;
	width?: number | string;
	align?: 'left' | 'center' | 'right';
	render?: (row: T, index: number) => React.ReactNode;
}

export interface AppTableProps<T> {
	columns: AppTableColumn<T>[];
	rows: T[];
	loading?: boolean;
	rowKey: (row: T, index: number) => string | number;
	emptyTitle?: string;
	emptyDescription?: string;
}

export function AppTable<T>({
	columns,
	rows,
	loading = false,
	rowKey,
	emptyTitle,
	emptyDescription,
}: AppTableProps<T>) {
	const { t } = useTranslation();

	return (
		<TableContainer
			component={Paper}
			elevation={0}
			sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
		>
			<Table size="small">
				<TableHead>
					<TableRow>
						{columns.map((col) => (
							<TableCell
								key={col.key}
								align={col.align ?? 'left'}
								width={col.width}
								sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}
							>
								{col.label}
							</TableCell>
						))}
					</TableRow>
				</TableHead>
				<TableBody>
					{loading ? (
						<TableRow>
							<TableCell colSpan={columns.length} sx={{ border: 0, py: 6 }}>
								<AppLoader />
							</TableCell>
						</TableRow>
					) : rows.length === 0 ? (
						<TableRow>
							<TableCell colSpan={columns.length} sx={{ border: 0, py: 4 }}>
								<EmptyState
									title={emptyTitle ?? t('emptyState.title')}
									description={emptyDescription ?? t('emptyState.description')}
								/>
							</TableCell>
						</TableRow>
					) : (
						rows.map((row, index) => (
							<TableRow key={rowKey(row, index)} hover>
								{columns.map((col) => (
									<TableCell key={col.key} align={col.align ?? 'left'}>
										{col.render
											? col.render(row, index)
											: String((row as Record<string, unknown>)[col.key] ?? '')}
									</TableCell>
								))}
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</TableContainer>
	);
}
