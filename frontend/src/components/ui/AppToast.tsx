import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '@/constants/icons';
import styles from './AppToast.module.scss';

export type ToastSeverity = 'success' | 'info' | 'warning' | 'error';

export interface ToastAction {
	label: string;
	onClick: () => void;
	muted?: boolean;
}

export interface ToastMessage {
	id: number;
	title: string;
	message?: string;
	severity: ToastSeverity;
	duration: number;
	actions?: ToastAction[];
	onOpen?: () => void;
	openLabel?: string;
}

export interface ToastShowOptions {
	title?: string;
	duration?: number;
	actions?: ToastAction[];
	onOpen?: () => void;
	openLabel?: string;
}

interface ToastContextValue {
	showToast: (
		message: string,
		severity?: ToastSeverity,
		options?: number | ToastShowOptions
	) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastIdCounter = 0;

const SEVERITY_ICONS = {
	success: Icons.success,
	error: Icons.error,
	warning: Icons.warning,
	info: Icons.info,
} as const;

function normalizeOptions(options?: number | ToastShowOptions): ToastShowOptions {
	if (typeof options === 'number') {
		return { duration: options };
	}
	return options ?? {};
}

function ToastItem({ toast, onClose }: { toast: ToastMessage; onClose: (id: number) => void }) {
	const { t } = useTranslation();

	const handleClose = () => onClose(toast.id);

	const handleOpen = () => {
		toast.onOpen?.();
		handleClose();
	};

	const openLabel = toast.openLabel ?? t('toast.open');

	return (
		<div
			className={`${styles.toast} ${styles[toast.severity]}`}
			role="alert"
			aria-live="polite"
			data-testid="app-toast"
		>
			<div className={styles.icon}>
				<FontAwesomeIcon icon={SEVERITY_ICONS[toast.severity]} size="sm" />
			</div>

			<div
				className={`${styles.body}${toast.onOpen ? ` ${styles.clickable}` : ''}`}
				{...(toast.onOpen
					? {
							role: 'button',
							tabIndex: 0,
							onClick: handleOpen,
							onKeyDown: (event: React.KeyboardEvent) => {
								if (event.key === 'Enter' || event.key === ' ') {
									event.preventDefault();
									handleOpen();
								}
							},
						}
					: {})}
			>
				<div className={styles.title}>{toast.title}</div>
				{toast.message ? <div className={styles.message}>{toast.message}</div> : null}
				{toast.onOpen || (toast.actions && toast.actions.length > 0) ? (
					<div className={styles.actions}>
						{toast.onOpen ? (
							<button
								type="button"
								className={styles.action}
								onClick={(event) => {
									event.stopPropagation();
									handleOpen();
								}}
							>
								{openLabel}
							</button>
						) : null}
						{toast.actions?.map((action) => (
							<button
								key={action.label}
								type="button"
								className={`${styles.action}${action.muted ? ` ${styles.muted}` : ''}`}
								onClick={(event) => {
									event.stopPropagation();
									action.onClick();
									handleClose();
								}}
							>
								{action.label}
							</button>
						))}
					</div>
				) : null}
			</div>

			<button
				type="button"
				className={styles.close}
				onClick={handleClose}
				aria-label={t('common.close')}
			>
				<FontAwesomeIcon icon={Icons.close} size="sm" />
			</button>

			<div className={styles.progressBar} aria-hidden="true">
				<span
					className={styles.progressFill}
					style={{ animationDuration: `${toast.duration}ms` }}
				/>
			</div>
		</div>
	);
}

export function AppToastProvider({ children }: { children: React.ReactNode }) {
	const { t } = useTranslation();
	const [toasts, setToasts] = useState<ToastMessage[]>([]);

	const severityTitle = useCallback((severity: ToastSeverity) => t(`toast.title.${severity}`), [t]);

	const showToast = useCallback(
		(message: string, severity: ToastSeverity = 'info', options?: number | ToastShowOptions) => {
			const { title, duration = 4000, actions, onOpen, openLabel } = normalizeOptions(options);
			const defaultTitle = severityTitle(severity);
			const resolvedTitle = title ?? defaultTitle;
			const resolvedMessage =
				title || message.trim() === defaultTitle.trim() ? (title ? message : undefined) : message;

			const id = ++toastIdCounter;
			setToasts((prev) => [
				...prev,
				{
					id,
					title: resolvedTitle,
					message: resolvedMessage,
					severity,
					duration,
					actions,
					onOpen,
					openLabel,
				},
			]);

			window.setTimeout(() => {
				setToasts((prev) => prev.filter((item) => item.id !== id));
			}, duration);
		},
		[severityTitle]
	);

	const handleClose = useCallback((id: number) => {
		setToasts((prev) => prev.filter((item) => item.id !== id));
	}, []);

	const contextValue = useMemo(() => ({ showToast }), [showToast]);

	return (
		<ToastContext.Provider value={contextValue}>
			{children}
			{toasts.length > 0 ? (
				<div className={styles.container} data-testid="app-toast-container">
					{toasts.map((toast) => (
						<ToastItem key={toast.id} toast={toast} onClose={handleClose} />
					))}
				</div>
			) : null}
		</ToastContext.Provider>
	);
}

export function useAppToast(): ToastContextValue {
	const ctx = useContext(ToastContext);
	if (!ctx) {
		return {
			showToast: () => undefined,
		};
	}
	return ctx;
}
