import { Box, MenuItem, Select, SelectChangeEvent, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme';

export interface AppPaginationProps {
	page: number;
	pageSize: number;
	total: number;
	pageSizeOptions?: number[];
	onChange: (page: number, pageSize: number) => void;
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/** Builds the visible page numbers with ellipsis gaps. */
function buildPages(current: number, total: number): (number | '…')[] {
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
	const pages: (number | '…')[] = [1];
	if (current > 3) pages.push('…');
	for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
		pages.push(p);
	}
	if (current < total - 2) pages.push('…');
	pages.push(total);
	return pages;
}

const PAGE_BTN_SX = {
	minWidth: 28,
	height: 28,
	px: 0.5,
	borderRadius: '6px',
	border: `1px solid ${tokens.line}`,
	bgcolor: tokens.surface,
	color: tokens.ink2,
	fontSize: '12.5px',
	fontWeight: 500,
	fontFamily: 'inherit',
	cursor: 'pointer',
	display: 'grid',
	placeItems: 'center',
	transition: 'border-color 120ms, background 120ms',
	'&:hover:not(:disabled)': { borderColor: tokens.ink3, color: tokens.ink1 },
	'&:disabled': { opacity: 0.4, cursor: 'default' },
} as const;

const ACTIVE_SX = {
	...PAGE_BTN_SX,
	bgcolor: tokens.ink1,
	color: '#fff',
	borderColor: tokens.ink1,
	'&:hover': { bgcolor: tokens.ink1, borderColor: tokens.ink1, filter: 'brightness(1.1)' },
} as const;

export function AppPagination({
	page,
	pageSize,
	total,
	pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
	onChange,
}: AppPaginationProps) {
	const { t } = useTranslation();
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const current = page + 1; // MUI uses 0-based pages

	const pages = buildPages(current, totalPages);

	const handlePageSizeChange = (e: SelectChangeEvent<number>) => {
		onChange(0, Number(e.target.value));
	};

	return (
		<Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 1.75, px: 2.5 }}>
			{/* Left: result count */}
			<Typography sx={{ fontSize: 12.5, color: tokens.ink3 }}>
				{t('pagination.showing', {
					from: total === 0 ? 0 : page * pageSize + 1,
					to: Math.min((page + 1) * pageSize, total),
					total,
				})}
			</Typography>

			{/* Center: numbered pager */}
			<Box component="nav" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
				{/* Prev */}
				<Box
					component="button"
					disabled={current === 1}
					onClick={() => onChange(page - 1, pageSize)}
					sx={PAGE_BTN_SX}
					aria-label={t('pagination.prev')}
				>
					‹
				</Box>

				{pages.map((p, i) =>
					p === '…' ? (
						<Box key={`ellipsis-${i}`} sx={{ ...PAGE_BTN_SX, border: 'none', bgcolor: 'transparent', cursor: 'default' }}>
							…
						</Box>
					) : (
						<Box
							key={p}
							component="button"
							onClick={() => onChange((p as number) - 1, pageSize)}
							sx={p === current ? ACTIVE_SX : PAGE_BTN_SX}
							aria-current={p === current ? 'page' : undefined}
						>
							{p}
						</Box>
					),
				)}

				{/* Next */}
				<Box
					component="button"
					disabled={current === totalPages}
					onClick={() => onChange(page + 1, pageSize)}
					sx={PAGE_BTN_SX}
					aria-label={t('pagination.next')}
				>
					›
				</Box>
			</Box>

			{/* Right: page size selector */}
			<Stack direction="row" alignItems="center" spacing={1}>
				<Typography sx={{ fontSize: 12.5, color: tokens.ink3 }}>
					{t('pagination.rowsPerPage')}:
				</Typography>
				<Select
					size="small"
					value={pageSize}
					onChange={handlePageSizeChange}
					variant="outlined"
					sx={{
						fontSize: '12.5px',
						fontWeight: 600,
						'.MuiOutlinedInput-notchedOutline': { borderColor: tokens.line, borderRadius: '8px' },
						'&:hover .MuiOutlinedInput-notchedOutline': { borderColor: tokens.ink3 },
						'.MuiSelect-select': { py: '5px', px: '10px', pr: '26px !important' },
					}}
				>
					{pageSizeOptions.map((opt) => (
						<MenuItem key={opt} value={opt} sx={{ fontSize: '12.5px' }}>
							{opt}
						</MenuItem>
					))}
				</Select>
			</Stack>
		</Stack>
	);
}
