import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Typography } from '@mui/material';
import { AppLoader, AppButton } from '@/components/ui';
import { VERIFY_EMAIL_MUTATION } from '@/graphql/operations/auth';
import { ROUTES } from '@/constants/routes';

export default function VerifyEmailPage() {
	const { t } = useTranslation();
	const [params] = useSearchParams();
	const token = params.get('token');

	const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
	const [verifyEmail] = useMutation(VERIFY_EMAIL_MUTATION);

	useEffect(() => {
		if (!token) {
			setStatus('error');
			return;
		}

		verifyEmail({ variables: { token } })
			.then(() => setStatus('success'))
			.catch(() => setStatus('error'));
	}, [token]); // eslint-disable-line react-hooks/exhaustive-deps

	if (status === 'loading') return <AppLoader fullPage />;

	return (
		<Box maxWidth={440} mx="auto" mt={8} px={3} textAlign="center">
			{status === 'success' ? (
				<>
					<Alert severity="success" sx={{ mb: 3 }}>
						{t('auth.verifyEmailSuccess')}
					</Alert>
					<AppButton variant="contained" onClick={() => (window.location.href = ROUTES.LOGIN)}>
						{t('auth.login')}
					</AppButton>
				</>
			) : (
				<>
					<Alert severity="error" sx={{ mb: 3 }}>
						{t('auth.verifyEmailFailed')}
					</Alert>
					<Typography variant="body2" color="text.secondary">
						{t('auth.verifyEmailRetry')}
					</Typography>
				</>
			)}
		</Box>
	);
}
