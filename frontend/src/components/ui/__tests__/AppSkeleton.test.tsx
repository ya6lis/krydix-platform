import { render } from '@testing-library/react';
import { AppSkeleton } from '../AppSkeleton';

describe('AppSkeleton', () => {
	it('renders a skeleton element', () => {
		render(<AppSkeleton />);
		expect(document.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
	});

	it('applies the requested variant', () => {
		render(<AppSkeleton variant="circular" width={44} height={44} />);
		expect(document.querySelector('.MuiSkeleton-circular')).toBeInTheDocument();
	});
});
