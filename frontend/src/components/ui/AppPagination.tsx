import {
	Box,
	MenuItem,
	Select,
	SelectChangeEvent,
	Stack,
	TablePagination,
	Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

export interface AppPaginationProps {
	page: number;
	pageSize: number;
	total: number;
	pageSizeOptions?: number[];
	onChange: (page: number, pageSize: number) => void;
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function AppPagination({
	page,
	pageSize,
	total,
	pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
	onChange,
}: AppPaginationProps) {
	const { t } = useTranslation();

	const handlePageChange = (_: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
		onChange(newPage, pageSize);
	};

	const handlePageSizeChange = (e: SelectChangeEvent<number>) => {
		onChange(0, Number(e.target.value));
	};

	return (
		<Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={2} sx={{ py: 1 }}>
			<Stack direction="row" alignItems="center" spacing={1}>
				<Typography variant="body2" color="text.secondary">
					{t('pagination.rowsPerPage')}:
				</Typography>
				<Select
					size="small"
					value={pageSize}
					onChange={handlePageSizeChange}
					variant="outlined"
					sx={{ minWidth: 70, fontSize: 14 }}
				>
					{pageSizeOptions.map((opt) => (
						<MenuItem key={opt} value={opt}>
							{opt}
						</MenuItem>
					))}
				</Select>
			</Stack>
			<Box>
				<TablePagination
					component="div"
					count={total}
					page={page}
					rowsPerPage={pageSize}
					onPageChange={handlePageChange}
					rowsPerPageOptions={[]}
					labelDisplayedRows={({ from, to, count }) =>
						`${from}–${to} ${t('pagination.of')} ${count}`
					}
					sx={{ '.MuiTablePagination-toolbar': { pl: 0 } }}
				/>
			</Box>
		</Stack>
	);
}
