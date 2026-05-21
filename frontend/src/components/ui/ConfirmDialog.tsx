import { useTranslation } from 'react-i18next';
import { AppModal } from './AppModal';
import { AppButton } from './AppButton';

export interface ConfirmDialogProps {
	open: boolean;
	onClose: () => void;
	onConfirm: () => void;
	message: React.ReactNode;
	title?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	loading?: boolean;
	confirmColor?: 'primary' | 'error' | 'warning' | 'success';
}

export function ConfirmDialog({
	open,
	onClose,
	onConfirm,
	message,
	title,
	confirmLabel,
	cancelLabel,
	loading = false,
	confirmColor = 'primary',
}: ConfirmDialogProps) {
	const { t } = useTranslation();

	return (
		<AppModal
			open={open}
			onClose={onClose}
			title={title ?? t('confirmDialog.title')}
			maxWidth="xs"
			footer={
				<>
					<AppButton variant="outlined" onClick={onClose} disabled={loading}>
						{cancelLabel ?? t('confirmDialog.cancel')}
					</AppButton>
					<AppButton variant="contained" color={confirmColor} onClick={onConfirm} loading={loading}>
						{confirmLabel ?? t('confirmDialog.confirm')}
					</AppButton>
				</>
			}
		>
			{message}
		</AppModal>
	);
}
