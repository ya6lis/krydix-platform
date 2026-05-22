import { useState } from 'react';
import { useNavigate, Link as RouterLink, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Box, Typography, InputAdornment, IconButton, Stack } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { AppInput, AppButton, AppCheckbox, AppAlert, AppLabel, AppTooltip } from '@/components/ui';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Icons } from '@/constants/icons';
import { LOGIN_MUTATION } from '@/graphql/operations/auth';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/constants/routes';
import { tokens } from '@/theme';
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

	const [showPassword, setShowPassword] = useState(false);
	const [keepSignedIn, setKeepSignedIn] = useState(true);
	const [loginMutation, { loading }] = useMutation(LOGIN_MUTATION);

	const {
		register,
		handleSubmit,
		formState: { errors },
		setError,
	} = useForm<FormData>({ resolver: zodResolver(schema) });

	// Route RHF's ref to the MUI input (not the TextField root) so values —
	// including browser autofill — are read correctly on submit.
	const bind = (name: keyof FormData) => {
		const { ref, ...rest } = register(name);
		return { ...rest, inputRef: ref };
	};

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
		<AuthLayout
			eyebrow={t('auth.welcomeBack')}
			title={t('auth.signInTitle')}
			subtitle={
				<>
					{t('auth.noAccountYet')}{' '}
					<Box
						component={RouterLink}
						to={ROUTES.REGISTER}
						sx={{ color: 'primary.dark', fontWeight: 700, textDecoration: 'none' }}
					>
						{t('auth.createOne')} →
					</Box>
				</>
			}
			artTag={t('auth.art.loginTag')}
			artHeadline={t('auth.art.loginHeadline')}
			artChildren={<LoginArt />}
		>
			<Box
				component="form"
				noValidate
				onSubmit={handleSubmit(onSubmit)}
				display="flex"
				flexDirection="column"
				gap={2.25}
			>
				{errors.root && <AppAlert severity="error">{errors.root.message}</AppAlert>}

				<Box>
					<AppLabel htmlFor="email">{t('auth.workEmail')}</AppLabel>
					<AppInput
						id="email"
						type="text"
						autoComplete="email"
						placeholder="you@company.com"
						inputProps={{ inputMode: 'email' }}
						error={!!errors.email}
						helperText={errors.email?.message}
						InputProps={{
							startAdornment: (
								<InputAdornment position="start">
									<FontAwesomeIcon icon={Icons.envelope} />
								</InputAdornment>
							),
						}}
						{...bind('email')}
					/>
				</Box>

				<Box>
					<Stack direction="row" alignItems="center" justifyContent="space-between">
						<AppLabel htmlFor="password" sx={{ mb: 0 }}>
							{t('auth.password')}
						</AppLabel>
						<Box
							component={RouterLink}
							to={ROUTES.FORGOT_PASSWORD}
							sx={{
								fontSize: 12.5,
								fontWeight: 700,
								color: 'primary.dark',
								textDecoration: 'none',
							}}
						>
							{t('auth.forgotPassword')}
						</Box>
					</Stack>
					<AppInput
						id="password"
						type={showPassword ? 'text' : 'password'}
						autoComplete="current-password"
						error={!!errors.password}
						helperText={errors.password?.message}
						sx={{ mt: 0.75 }}
						InputProps={{
							startAdornment: (
								<InputAdornment position="start">
									<FontAwesomeIcon icon={Icons.lock} />
								</InputAdornment>
							),
							endAdornment: (
								<InputAdornment position="end">
									<AppTooltip title={t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')}>
										<IconButton
											size="small"
											onClick={() => setShowPassword((v) => !v)}
											aria-label={t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')}
										>
											<FontAwesomeIcon
												icon={showPassword ? Icons.eyeOff : Icons.eye}
												fontSize={15}
											/>
										</IconButton>
									</AppTooltip>
								</InputAdornment>
							),
						}}
						{...bind('password')}
					/>
				</Box>

				<AppCheckbox
					label={t('auth.keepSignedIn')}
					checked={keepSignedIn}
					onChange={setKeepSignedIn}
				/>

				<AppButton
					type="submit"
					variant="contained"
					size="large"
					fullWidth
					loading={loading}
					endIcon={<FontAwesomeIcon icon={Icons.arrowRight} />}
					sx={{
						mt: 0.5,
						bgcolor: 'text.primary',
						color: 'background.paper',
						'&:hover': { bgcolor: 'text.primary', filter: 'brightness(1.3)' },
					}}
				>
					{t('auth.login')}
				</AppButton>
			</Box>
		</AuthLayout>
	);
}

/** Right-panel decorative content for the login page. */
function LoginArt() {
	const { t } = useTranslation();
	const trust = [
		{ title: t('auth.art.trust1Title'), desc: t('auth.art.trust1Desc') },
		{ title: t('auth.art.trust2Title'), desc: t('auth.art.trust2Desc') },
		{ title: t('auth.art.trust3Title'), desc: t('auth.art.trust3Desc') },
	];

	return (
		<Stack spacing={2.25}>
			<Stack spacing={1.5}>
				{trust.map((item) => (
					<Box
						key={item.title}
						sx={{
							display: 'flex',
							gap: 1.75,
							alignItems: 'flex-start',
							p: 2,
							borderRadius: 1.5,
							bgcolor: 'rgba(255,255,255,0.04)',
							border: '1px solid rgba(255,255,255,0.12)',
						}}
					>
						<Box
							sx={{
								width: 28,
								height: 28,
								borderRadius: '50%',
								flexShrink: 0,
								display: 'grid',
								placeItems: 'center',
								bgcolor: 'rgba(187,160,236,0.16)',
								color: tokens.purpleSoft,
								fontSize: 12,
							}}
						>
							<FontAwesomeIcon icon={Icons.check} />
						</Box>
						<Box>
							<Typography sx={{ fontWeight: 700, fontSize: 14.5 }}>{item.title}</Typography>
							<Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)', mt: 0.5 }}>
								{item.desc}
							</Typography>
						</Box>
					</Box>
				))}
			</Stack>

			<Box
				sx={{
					p: 3,
					borderRadius: 2,
					bgcolor: 'rgba(255,255,255,0.06)',
					border: '1px solid rgba(255,255,255,0.14)',
				}}
			>
				<Typography sx={{ fontSize: 15, fontStyle: 'italic', lineHeight: 1.55, mb: 2 }}>
					“{t('auth.art.quote')}”
				</Typography>
				<Stack direction="row" spacing={1.25} alignItems="center">
					<Box
						sx={{
							width: 30,
							height: 30,
							borderRadius: '50%',
							display: 'grid',
							placeItems: 'center',
							fontSize: 11,
							fontWeight: 700,
							background: `linear-gradient(135deg, ${tokens.coral}, ${tokens.amber})`,
						}}
					>
						EW
					</Box>
					<Box sx={{ fontSize: 12.5 }}>
						<Box sx={{ fontWeight: 700 }}>{t('auth.art.quoteAuthor')}</Box>
						<Box sx={{ color: 'rgba(255,255,255,0.55)' }}>{t('auth.art.quoteRole')}</Box>
					</Box>
				</Stack>
			</Box>
		</Stack>
	);
}
