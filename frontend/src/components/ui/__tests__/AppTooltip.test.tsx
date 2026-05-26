import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { AppTooltip } from '../AppTooltip';
import { theme } from '@/theme';

function renderTooltip(ui: React.ReactElement) {
	return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe('AppTooltip', () => {
	it('renders the wrapped child', () => {
		renderTooltip(
			<AppTooltip title="Verified seller">
				<button>Hover me</button>
			</AppTooltip>,
		);
		expect(screen.getByText('Hover me')).toBeInTheDocument();
	});

	it('shows the tooltip label on hover', async () => {
		renderTooltip(
			<AppTooltip title="Verified seller — EDRPOU on file">
				<button>Hover me</button>
			</AppTooltip>,
		);

		fireEvent.mouseOver(screen.getByText('Hover me'));

		await waitFor(() => {
			expect(screen.getByRole('tooltip')).toHaveTextContent('Verified seller — EDRPOU on file');
		});
	});
});
