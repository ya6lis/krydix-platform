import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Divider, Typography } from '@mui/material';
import { AppInput, AppButton } from '@/components/ui';
import { REGISTER_MUTATION } from '@/graphql/operations/auth';
import { ROUTES } from '@/constants/routes';

const schema = z.object({
	firstName: z.string().min(1),
	lastName: z.string().min(1),
	email: z.string().email(),
	password: z.string().min(8),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
	const { t } = useTranslation();
	const [success, setSuccess] = useState(false);

	const [registerMutation, { loading }] = useMutation(REGISTER_MUTATION);

	const {
		register,
		handleSubmit,
		formState: { errors },
		setError,
	} = useForm<FormData>({ resolver: zodResolver(schema) });

	const onSubmit = async (data: FormData) => {
		try {
			await registerMutation({ variables: { input: data } });
			setSuccess(true);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : t('common.error');
			setError('root', { message });
		}
	};

	if (success) {
		return (
			<Box maxWidth={440} mx="auto" mt={8} px={3}>
				<Alert severity="success">{t('auth.registerSuccess')}</Alert>
			</Box>
		);
	}

	return (
		<Box maxWidth={440} mx="auto" mt={8} px={3}>
			<Typography variant="h4" fontWeight={700} mb={0.5}>
				{t('auth.register')}
			</Typography>
			<Typography variant="body2" color="text.secondary" mb={4}>
				{t('auth.registerSubtitle')}
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
				<Box display="flex" gap={2}>
					<AppInput
						label={t('auth.firstName')}
						error={!!errors.firstName}
						helperText={errors.firstName?.message}
						{...register('firstName')}
					/>
					<AppInput
						label={t('auth.lastName')}
						error={!!errors.lastName}
						helperText={errors.lastName?.message}
						{...register('lastName')}
					/>
				</Box>

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
					autoComplete="new-password"
					error={!!errors.password}
					helperText={errors.password?.message}
					{...register('password')}
				/>

				<AppButton type="submit" variant="contained" fullWidth loading={loading} sx={{ mt: 1 }}>
					{t('auth.register')}
				</AppButton>
			</Box>

			<Divider sx={{ my: 3 }} />

			<Typography variant="body2" textAlign="center" color="text.secondary">
				{t('auth.hasAccount')}{' '}
				<Link to={ROUTES.LOGIN} style={{ color: 'inherit', fontWeight: 600 }}>
					{t('auth.login')}
				</Link>
			</Typography>
		</Box>
	);
}
