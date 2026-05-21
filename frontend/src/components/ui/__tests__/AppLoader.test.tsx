import { render } from '@testing-library/react';
import { AppLoader } from '../AppLoader';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

describe('AppLoader', () => {
	it('renders inline spinner', () => {
		render(<AppLoader />);
		expect(document.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
	});

	it('renders full-page overlay', () => {
		const { container } = render(<AppLoader fullPage />);
		const overlay = container.firstChild as HTMLElement;
		expect(overlay).toHaveStyle({ position: 'fixed' });
	});
});
