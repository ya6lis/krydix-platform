import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Box, Typography } from '@mui/material';
import { AppLoader, AppButton, AppAlert } from '@/components/ui';
import { VERIFY_EMAIL_MUTATION } from '@/graphql/operations/auth';
import { ROUTES } from '@/constants/routes';

export default function VerifyEmailPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
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
					<AppAlert severity="success" title={t('common.success')} sx={{ mb: 3, textAlign: 'left' }}>
						{t('auth.verifyEmailSuccess')}
					</AppAlert>
					<AppButton tone="primary" size="large" fullWidth onClick={() => navigate(ROUTES.LOGIN)}>
						{t('auth.login')}
					</AppButton>
				</>
			) : (
				<>
					<AppAlert severity="error" title={t('common.error')} sx={{ mb: 3, textAlign: 'left' }}>
						{t('auth.verifyEmailFailed')}
					</AppAlert>
					<Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
						{t('auth.verifyEmailRetry')}
					</Typography>
				</>
			)}
		</Box>
	);
}
