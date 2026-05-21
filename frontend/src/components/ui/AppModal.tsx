import {
	Dialog,
	DialogActions,
	DialogContent,
	DialogProps,
	DialogTitle,
	Divider,
	IconButton,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Icons } from '@/constants/icons';

export interface AppModalProps extends Omit<DialogProps, 'title'> {
	open: boolean;
	onClose: () => void;
	title?: React.ReactNode;
	footer?: React.ReactNode;
	children: React.ReactNode;
	showCloseButton?: boolean;
	maxWidth?: DialogProps['maxWidth'];
}

export function AppModal({
	open,
	onClose,
	title,
	footer,
	children,
	showCloseButton = true,
	maxWidth = 'sm',
	...props
}: AppModalProps) {
	return (
		<Dialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth {...props}>
			{title && (
				<>
					<DialogTitle sx={{ pr: showCloseButton ? 6 : 3, fontWeight: 700 }}>
						{title}
						{showCloseButton && (
							<IconButton
								onClick={onClose}
								size="small"
								sx={{ position: 'absolute', right: 12, top: 12 }}
								aria-label="close"
							>
								<FontAwesomeIcon icon={Icons.close} />
							</IconButton>
						)}
					</DialogTitle>
					<Divider />
				</>
			)}
			<DialogContent sx={{ py: 3 }}>{children}</DialogContent>
			{footer && (
				<>
					<Divider />
					<DialogActions sx={{ px: 3, py: 2 }}>{footer}</DialogActions>
				</>
			)}
		</Dialog>
	);
}
