import { Alert, AlertProps, AlertTitle } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Icons } from '@/constants/icons';

export interface AppAlertProps extends Omit<AlertProps, 'title' | 'severity'> {
	severity?: 'info' | 'success' | 'warning' | 'error';
	title?: React.ReactNode;
	children?: React.ReactNode;
}

const SEVERITY_ICONS = {
	info: Icons.info,
	success: Icons.success,
	warning: Icons.warning,
	error: Icons.error,
} as const;

/** Inline banner explaining page-level state (Components.html → Alerts). */
export function AppAlert({ severity = 'info', title, children, ...props }: AppAlertProps) {
	return (
		<Alert
			severity={severity}
			icon={<FontAwesomeIcon icon={SEVERITY_ICONS[severity]} />}
			{...props}
		>
			{title && <AlertTitle sx={{ fontWeight: 700, mb: children ? 0.25 : 0 }}>{title}</AlertTitle>}
			{children}
		</Alert>
	);
}
