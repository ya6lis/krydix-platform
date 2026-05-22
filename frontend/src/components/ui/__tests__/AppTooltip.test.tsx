import { render, screen } from '@testing-library/react';
import { AppTooltip } from '../AppTooltip';

describe('AppTooltip', () => {
	it('renders the wrapped child', () => {
		render(
			<AppTooltip title="Verified seller">
				<button>Hover me</button>
			</AppTooltip>
		);
		expect(screen.getByText('Hover me')).toBeInTheDocument();
	});
});
