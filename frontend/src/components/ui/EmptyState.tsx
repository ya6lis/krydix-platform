import { Box, Button, ButtonProps, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { useTranslation } from 'react-i18next';
import { Icons } from '@/constants/icons';

export interface EmptyStateProps {
	icon?: IconDefinition;
	title?: string;
	description?: string;
	actionLabel?: string;
	onAction?: () => void;
	actionProps?: ButtonProps;
}

export function EmptyState({
	icon,
	title,
	description,
	actionLabel,
	onAction,
	actionProps,
}: EmptyStateProps) {
	const { t } = useTranslation();

	return (
		<Box
			display="flex"
			flexDirection="column"
			alignItems="center"
			justifyContent="center"
			gap={1.5}
			py={4}
			textAlign="center"
		>
			<Box sx={{ fontSize: 48, color: 'text.disabled', lineHeight: 1 }}>
				<FontAwesomeIcon icon={icon ?? Icons.file} />
			</Box>
			<Typography variant="h6" color="text.primary">
				{title ?? t('emptyState.title')}
			</Typography>
			{description && (
				<Typography variant="body2" color="text.secondary" maxWidth={360}>
					{description ?? t('emptyState.description')}
				</Typography>
			)}
			{actionLabel && onAction && (
				<Button variant="contained" onClick={onAction} sx={{ mt: 1 }} {...actionProps}>
					{actionLabel}
				</Button>
			)}
		</Box>
	);
}
