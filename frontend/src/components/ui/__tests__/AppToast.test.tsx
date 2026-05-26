import { render, screen, act, fireEvent } from '@testing-library/react';
import { AppToastProvider, useAppToast } from '../AppToast';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => {
			const labels: Record<string, string> = {
				'toast.title.success': 'Success',
				'toast.title.error': 'Error',
				'toast.title.warning': 'Warning',
				'toast.title.info': 'Notification',
				'toast.open': 'Open',
				'common.close': 'Close',
			};
			return labels[key] ?? key;
		},
	}),
}));

function ToastTrigger({ message }: { message: string }) {
	const { showToast } = useAppToast();
	return <button onClick={() => showToast(message, 'success')}>Show Toast</button>;
}

function OpenableToastTrigger({ onOpen }: { onOpen: () => void }) {
	const { showToast } = useAppToast();
	return (
		<button
			onClick={() =>
				showToast('New message from seller', 'info', {
					title: 'New message',
					onOpen,
				})
			}
		>
			Show Openable Toast
		</button>
	);
}

describe('AppToast', () => {
	it('shows toast title and message after trigger', async () => {
		render(
			<AppToastProvider>
				<ToastTrigger message="Saved!" />
			</AppToastProvider>,
		);

		await act(async () => {
			screen.getByRole('button', { name: 'Show Toast' }).click();
		});

		expect(screen.getByTestId('app-toast')).toBeInTheDocument();
		expect(screen.getByText('Success')).toBeInTheDocument();
		expect(screen.getByText('Saved!')).toBeInTheDocument();
	});

	it('opens toast when action is clicked', async () => {
		const onOpen = jest.fn();

		render(
			<AppToastProvider>
				<OpenableToastTrigger onOpen={onOpen} />
			</AppToastProvider>,
		);

		await act(async () => {
			screen.getByRole('button', { name: 'Show Openable Toast' }).click();
		});

		fireEvent.click(screen.getByRole('button', { name: 'Open' }));

		expect(onOpen).toHaveBeenCalledTimes(1);
		expect(screen.queryByTestId('app-toast')).not.toBeInTheDocument();
	});

	it('throws when useAppToast used outside provider', () => {
		const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
		expect(() => {
			render(<ToastTrigger message="test" />);
		}).toThrow('useAppToast must be used inside AppToastProvider');
		consoleError.mockRestore();
	});
});
