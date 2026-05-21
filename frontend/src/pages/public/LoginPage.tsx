import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Alert, Divider } from '@mui/material';
import { AppInput, AppButton } from '@/components/ui';
import { LOGIN_MUTATION } from '@/graphql/operations/auth';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/constants/routes';
import type { AuthUser } from '@/store/authStore';

const schema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const location = useLocation();
	const setAuth = useAuthStore((s) => s.setAuth);
	const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';

	const [loginMutation, { loading }] = useMutation(LOGIN_MUTATION);

	const {
		register,
		handleSubmit,
		formState: { errors },
		setError,
	} = useForm<FormData>({ resolver: zodResolver(schema) });

	const onSubmit = async (data: FormData) => {
		try {
			const result = await loginMutation({ variables: { input: data } });
			const { accessToken, refreshToken, user } = result.data.login as {
				accessToken: string;
				refreshToken: string;
				user: AuthUser;
			};
			setAuth(user, accessToken, refreshToken);
			navigate(from, { replace: true });
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : t('common.error');
			setError('root', { message });
		}
	};

	return (
		<Box maxWidth={440} mx="auto" mt={8} px={3}>
			<Typography variant="h4" fontWeight={700} mb={0.5}>
				{t('auth.login')}
			</Typography>
			<Typography variant="body2" color="text.secondary" mb={4}>
				{t('auth.loginSubtitle')}
			</Typography>

			{errors.root && (
				<Alert severity="error" sx={{ mb: 3 }}>
					{errors.root.message}
				</Alert>
			)}

			<Box
				component="form"
				onSubmit={handleSubmit(onSubmit)}
				display="flex"
				flexDirection="column"
				gap={2.5}
			>
				<AppInput
					label={t('auth.email')}
					type="email"
					autoComplete="email"
					error={!!errors.email}
					helperText={errors.email?.message}
					{...register('email')}
				/>

				<AppInput
					label={t('auth.password')}
					type="password"
					autoComplete="current-password"
					error={!!errors.password}
					helperText={errors.password?.message}
					{...register('password')}
				/>

				<AppButton type="submit" variant="contained" fullWidth loading={loading} sx={{ mt: 1 }}>
					{t('auth.login')}
				</AppButton>
			</Box>

			<Divider sx={{ my: 3 }} />

			<Typography variant="body2" textAlign="center" color="text.secondary">
				{t('auth.noAccount')}{' '}
				<Link to={ROUTES.REGISTER} style={{ color: 'inherit', fontWeight: 600 }}>
					{t('auth.register')}
				</Link>
			</Typography>
		</Box>
	);
}
