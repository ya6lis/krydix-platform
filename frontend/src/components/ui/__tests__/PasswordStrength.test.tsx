import { render, screen } from '@testing-library/react';
import { PasswordStrength, scorePassword } from '../PasswordStrength';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

describe('scorePassword', () => {
	it('returns 0 for an empty password', () => {
		expect(scorePassword('')).toBe(0);
	});

	it('scores a long mixed password as strong (4)', () => {
		expect(scorePassword('Abcdef1!')).toBe(4);
	});

	it('scores a weak short password low', () => {
		expect(scorePassword('abc')).toBe(0);
	});
});

describe('PasswordStrength', () => {
	it('renders the empty label when no password', () => {
		render(<PasswordStrength value="" />);
		expect(screen.getByText(/components.passwordStrength.empty/)).toBeInTheDocument();
	});

	it('renders the strong label for a strong password', () => {
		render(<PasswordStrength value="Abcdef1!" />);
		expect(screen.getByText(/components.passwordStrength.strong/)).toBeInTheDocument();
	});
});
