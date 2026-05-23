import { useState } from 'react';
import { useNavigate, Link as RouterLink, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import React from 'react';
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

/** Right-panel glass card stack — matches Login.html .card-stack design. */
function LoginArt() {
	const { t } = useTranslation();

	const GLASS: React.CSSProperties = {
		position: 'absolute',
		background: 'rgba(255,255,255,0.06)',
		border: '1px solid rgba(255,255,255,0.16)',
		borderRadius: 16,
		padding: '22px 26px',
		backdropFilter: 'blur(20px)',
	};

	return (
		<Stack spacing={2.25}>
			{/* card stack */}
			<Box sx={{ position: 'relative', minHeight: 320, my: 2.5 }}>
				{/* c1 — sales stat */}
				<Box sx={{ ...GLASS, top: 0, left: 0, right: 60, transform: 'rotate(-2deg)' }}>
					<Typography
						sx={{
							fontSize: 10.5,
							fontWeight: 700,
							letterSpacing: '0.1em',
							textTransform: 'uppercase',
							color: tokens.purpleSoft,
							mb: 1,
						}}
					>
						{t('auth.art.card1Label')}
					</Typography>
					<Typography sx={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em' }}>
						$18,765
					</Typography>
					<Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)', mt: 0.5 }}>
						{t('auth.art.card1Sub')}
					</Typography>
				</Box>

				{/* c2 — verified seller */}
				<Box
					sx={{
						...GLASS,
						top: 110,
						left: 80,
						right: 0,
						transform: 'rotate(1.5deg)',
						background: 'rgba(255,255,255,0.10)',
					}}
				>
					<Stack direction="row" alignItems="center" spacing={1.75}>
						<Box
							sx={{
								width: 36,
								height: 36,
								borderRadius: '50%',
								flexShrink: 0,
								display: 'grid',
								placeItems: 'center',
								fontWeight: 700,
								fontSize: 13,
								background: `linear-gradient(135deg, ${tokens.accent}, ${tokens.cyan})`,
							}}
						>
							NA
						</Box>
						<Box sx={{ flex: 1 }}>
							<Typography sx={{ fontWeight: 700, fontSize: 15 }}>
								{t('auth.art.card2Name')}
							</Typography>
							<Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)', mt: 0.5 }}>
								{t('auth.art.card2Sub')}
							</Typography>
						</Box>
						<Box
							sx={{
								fontSize: 11,
								fontWeight: 700,
								px: '10px',
								py: '3px',
								borderRadius: 999,
								background: 'rgba(0,184,217,0.18)',
								color: tokens.cyan,
							}}
						>
							{t('auth.art.card2Pill')}
						</Box>
					</Stack>
				</Box>

				{/* c3 — new order */}
				<Box sx={{ ...GLASS, top: 220, left: 20, right: 80, transform: 'rotate(-1deg)' }}>
					<Typography
						sx={{
							fontSize: 10.5,
							fontWeight: 700,
							letterSpacing: '0.1em',
							textTransform: 'uppercase',
							color: tokens.purpleSoft,
							mb: 1,
						}}
					>
						{t('auth.art.card3Label')}
					</Typography>
					<Stack direction="row" alignItems="center" spacing={1.75} sx={{ mt: 1 }}>
						<Box
							sx={{
								width: 36,
								height: 36,
								borderRadius: '50%',
								flexShrink: 0,
								display: 'grid',
								placeItems: 'center',
								fontWeight: 700,
								fontSize: 13,
								background: `linear-gradient(135deg, ${tokens.coral}, ${tokens.amber})`,
							}}
						>
							LO
						</Box>
						<Box sx={{ flex: 1 }}>
							<Typography sx={{ fontWeight: 700, fontSize: 14 }}>
								{t('auth.art.card3Name')}
							</Typography>
							<Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)', mt: 0.5 }}>
								{t('auth.art.card3Sub')}
							</Typography>
						</Box>
					</Stack>
				</Box>
			</Box>

			{/* testimonial */}
			<Box
				sx={{
					p: 3,
					borderRadius: 2,
					bgcolor: 'rgba(255,255,255,0.06)',
					border: '1px solid rgba(255,255,255,0.14)',
					backdropFilter: 'blur(12px)',
				}}
			>
				<Typography sx={{ fontSize: 15, fontStyle: 'italic', lineHeight: 1.55, mb: 2 }}>
					&ldquo;{t('auth.art.quote')}&rdquo;
				</Typography>
				<Stack direction="row" spacing={1.25} alignItems="center">
					<Box
						sx={{
							width: 30,
							height: 30,
							borderRadius: '50%',
							flexShrink: 0,
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
