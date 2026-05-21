import { Box, CircularProgress, CircularProgressProps } from '@mui/material';
import { useTranslation } from 'react-i18next';

export interface AppLoaderProps {
	fullPage?: boolean;
	size?: CircularProgressProps['size'];
}

export function AppLoader({ fullPage = false, size = 40 }: AppLoaderProps) {
	const { t } = useTranslation();

	if (fullPage) {
		return (
			<Box
				sx={{
					position: 'fixed',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					zIndex: 9999,
					bgcolor: 'rgba(255,255,255,0.7)',
				}}
			>
				<CircularProgress size={size} aria-label={t('common.loading')} />
			</Box>
		);
	}

	return (
		<Box display="flex" justifyContent="center" alignItems="center" py={4}>
			<CircularProgress size={size} aria-label={t('common.loading')} />
		</Box>
	);
}
