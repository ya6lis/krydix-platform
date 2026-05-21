import { Alert, AlertColor, Snackbar } from '@mui/material';
import { createContext, useCallback, useContext, useState } from 'react';

export interface ToastMessage {
	id: number;
	message: string;
	severity: AlertColor;
	duration?: number;
}

interface ToastContextValue {
	showToast: (message: string, severity?: AlertColor, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastIdCounter = 0;

export function AppToastProvider({ children }: { children: React.ReactNode }) {
	const [toasts, setToasts] = useState<ToastMessage[]>([]);

	const showToast = useCallback(
		(message: string, severity: AlertColor = 'info', duration = 4000) => {
			const id = ++toastIdCounter;
			setToasts((prev) => [...prev, { id, message, severity, duration }]);
		},
		[]
	);

	const handleClose = (id: number) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	};

	return (
		<ToastContext.Provider value={{ showToast }}>
			{children}
			{toasts.map((toast) => (
				<Snackbar
					key={toast.id}
					open
					autoHideDuration={toast.duration}
					onClose={() => handleClose(toast.id)}
					anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
				>
					<Alert
						severity={toast.severity}
						onClose={() => handleClose(toast.id)}
						variant="filled"
						elevation={6}
					>
						{toast.message}
					</Alert>
				</Snackbar>
			))}
		</ToastContext.Provider>
	);
}

export function useAppToast(): ToastContextValue {
	const ctx = useContext(ToastContext);
	if (!ctx) throw new Error('useAppToast must be used inside AppToastProvider');
	return ctx;
}
