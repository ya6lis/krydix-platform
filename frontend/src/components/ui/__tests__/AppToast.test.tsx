import { render, screen, act } from '@testing-library/react';
import { AppToastProvider, useAppToast } from '../AppToast';

function ToastTrigger({ message }: { message: string }) {
	const { showToast } = useAppToast();
	return <button onClick={() => showToast(message, 'success')}>Show Toast</button>;
}

describe('AppToast', () => {
	it('shows toast message after trigger', async () => {
		render(
			<AppToastProvider>
				<ToastTrigger message="Saved!" />
			</AppToastProvider>
		);

		await act(async () => {
			screen.getByRole('button').click();
		});

		expect(screen.getByText('Saved!')).toBeInTheDocument();
	});

	it('throws when useAppToast used outside provider', () => {
		const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
		expect(() => {
			render(<ToastTrigger message="test" />);
		}).toThrow('useAppToast must be used inside AppToastProvider');
		consoleError.mockRestore();
	});
});
