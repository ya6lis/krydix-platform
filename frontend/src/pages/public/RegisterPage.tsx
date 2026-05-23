import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Box, Typography, InputAdornment, IconButton, Stack } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
	AppInput,
	AppButton,
	AppCheckbox,
	AppAlert,
	AppLabel,
	AppTooltip,
	RoleChooser,
	PasswordStrength,
} from '@/components/ui';
import { AuthLayout, REGISTER_GRADIENT } from '@/components/auth/AuthLayout';
import { Icons } from '@/constants/icons';
import { REGISTER_MUTATION } from '@/graphql/operations/auth';
import { ROUTES } from '@/constants/routes';
import { tokens } from '@/theme';

const schema = z.object({
	firstName: z.string().min(1).max(50),
	lastName: z.string().min(1).max(50),
	email: z.string().email(),
	password: z.string().min(12),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [success, setSuccess] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [role, setRole] = useState('buyer');
	const [agreed, setAgreed] = useState(false);
	const [termsError, setTermsError] = useState(false);

	const [registerMutation, { loading }] = useMutation(REGISTER_MUTATION);

	const {
		register,
		handleSubmit,
		watch,
		formState: { errors },
		setError,
	} = useForm<FormData>({ resolver: zodResolver(schema) });

	// Route RHF's ref to the MUI input (not the TextField root) so values —
	// including browser autofill — are read correctly on submit.
	const bind = (name: keyof FormData) => {
		const { ref, ...rest } = register(name);
		return { ...rest, inputRef: ref };
	};

	const password = watch('password') ?? '';

	const onSubmit = async (data: FormData) => {
		if (!agreed) {
			setTermsError(true);
			return;
		}
		try {
			await registerMutation({ variables: { input: data } });
			setSuccess(true);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : t('common.error');
			setError('root', { message });
		}
	};

	const requirements = [
		{ key: 'length', met: password.length >= 12 },
		{ key: 'uppercase', met: /[A-Z]/.test(password) },
		{ key: 'number', met: /\d/.test(password) },
		{ key: 'symbol', met: /[^A-Za-z0-9]/.test(password) },
	];

	return (
		<AuthLayout
			eyebrow={t('auth.getStartedFree')}
			title={t('auth.createAccountTitle')}
			subtitle={
				<>
					{t('auth.alreadyHaveOne')}{' '}
					<Box
						component={RouterLink}
						to={ROUTES.LOGIN}
						sx={{ color: 'primary.dark', fontWeight: 700, textDecoration: 'none' }}
					>
						{t('auth.login')} →
					</Box>
				</>
			}
			artTag={t('auth.art.registerTag')}
			artHeadline={t('auth.art.registerHeadline')}
			artChildren={<RegisterArt />}
			artGradient={REGISTER_GRADIENT}
			titleSize={32}
		>
			{success ? (
				<Stack spacing={2.5}>
					<AppAlert severity="success" title={t('common.success')}>
						{t('auth.registerSuccess')}
					</AppAlert>
					<AppButton
						variant="contained"
						size="large"
						fullWidth
						onClick={() => navigate(ROUTES.LOGIN)}
					>
						{t('auth.login')}
					</AppButton>
				</Stack>
			) : (
				<Box
					component="form"
					noValidate
					onSubmit={handleSubmit(onSubmit)}
					display="flex"
					flexDirection="column"
					gap={2}
				>
					{errors.root && <AppAlert severity="error">{errors.root.message}</AppAlert>}

					<Box sx={{ mb: 1 }}>
						<RoleChooser
							value={role}
							onChange={setRole}
							options={[
								{
									value: 'buyer',
									icon: Icons.cart,
									title: t('auth.roleBuyerTitle'),
									description: t('auth.roleBuyerDesc'),
								},
								{
									value: 'seller',
									icon: Icons.store,
									title: t('auth.roleSellerTitle'),
									description: t('auth.roleSellerDesc'),
								},
							]}
						/>
					</Box>

					<Stack direction="row" spacing={1.5}>
						<Box flex={1}>
							<AppLabel htmlFor="firstName">{t('auth.firstName')}</AppLabel>
							<AppInput
								id="firstName"
								autoComplete="given-name"
								error={!!errors.firstName}
								helperText={errors.firstName?.message}
								InputProps={{
									startAdornment: (
										<InputAdornment position="start">
											<FontAwesomeIcon icon={Icons.user} />
										</InputAdornment>
									),
								}}
								{...bind('firstName')}
							/>
						</Box>
						<Box flex={1}>
							<AppLabel htmlFor="lastName">{t('auth.lastName')}</AppLabel>
							<AppInput
								id="lastName"
								autoComplete="family-name"
								error={!!errors.lastName}
								helperText={errors.lastName?.message}
								InputProps={{
									startAdornment: (
										<InputAdornment position="start">
											<FontAwesomeIcon icon={Icons.user} />
										</InputAdornment>
									),
								}}
								{...bind('lastName')}
							/>
						</Box>
					</Stack>

					<Box>
						<AppLabel htmlFor="email">{t('auth.email')}</AppLabel>
						<AppInput
							id="email"
							type="text"
							autoComplete="email"
							placeholder="you@company.com"
							inputProps={{ inputMode: 'email' }}
							error={!!errors.email}
							helperText={errors.email?.message ?? t('auth.emailVerifyHint')}
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
						<AppLabel htmlFor="password">{t('auth.password')}</AppLabel>
						<AppInput
							id="password"
							type={showPassword ? 'text' : 'password'}
							autoComplete="new-password"
							placeholder={t('auth.passwordHint')}
							error={!!errors.password}
							helperText={errors.password?.message}
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
						<Box sx={{ mt: 1.25 }}>
							<PasswordStrength value={password} />
						</Box>
						<Box
							sx={{
								display: 'grid',
								gridTemplateColumns: '1fr 1fr',
								gap: '6px 16px',
								mt: 1.25,
							}}
						>
							{requirements.map((req) => (
								<Stack key={req.key} direction="row" spacing={0.75} alignItems="center">
									<Box
										sx={{
											fontSize: 12,
											color: req.met ? 'success.dark' : 'text.disabled',
											display: 'grid',
											placeItems: 'center',
										}}
									>
										<FontAwesomeIcon icon={Icons.checkCircle} />
									</Box>
									<Typography
										sx={{
											fontSize: 11.5,
											color: req.met ? 'success.dark' : 'text.secondary',
										}}
									>
										{t(`auth.passwordReq.${req.key}`)}
									</Typography>
								</Stack>
							))}
						</Box>
					</Box>

					<Box>
						<AppCheckbox
							label={
								<Box
									component="span"
									sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.5 }}
								>
									{t('auth.termsAgreePrefix')}{' '}
									<Box
										component="a"
										href="#"
										sx={{
											color: 'primary.dark',
											fontWeight: 700,
											textDecoration: 'none',
											'&:hover': { textDecoration: 'underline' },
										}}
									>
										{t('auth.art.termsOfService')}
									</Box>
									{', '}
									<Box
										component="a"
										href="#"
										sx={{
											color: 'primary.dark',
											fontWeight: 700,
											textDecoration: 'none',
											'&:hover': { textDecoration: 'underline' },
										}}
									>
										{t('auth.art.privacyPolicy')}
									</Box>
									{t('auth.termsAgreeMid')}{' '}
									<Box
										component="a"
										href="#"
										sx={{
											color: 'primary.dark',
											fontWeight: 700,
											textDecoration: 'none',
											'&:hover': { textDecoration: 'underline' },
										}}
									>
										{t('auth.art.sellerCode')}
									</Box>
									.
								</Box>
							}
							checked={agreed}
							onChange={(checked) => {
								setAgreed(checked);
								if (checked) setTermsError(false);
							}}
						/>
						{termsError && (
							<Typography sx={{ fontSize: 11.5, color: 'error.main', ml: 1.75 }}>
								{t('auth.termsRequired')}
							</Typography>
						)}
					</Box>

					<AppButton
						type="submit"
						variant="contained"
						size="large"
						fullWidth
						loading={loading}
						endIcon={<FontAwesomeIcon icon={Icons.arrowRight} />}
						sx={{
							mt: 0.5,
							py: '13px',
							px: '20px',
							fontSize: '14.5px',
							bgcolor: 'text.primary',
							color: 'background.paper',
							'&:hover': { bgcolor: 'text.primary', filter: 'brightness(1.3)' },
						}}
					>
						{t('auth.register')}
					</AppButton>
				</Box>
			)}
		</AuthLayout>
	);
}

/** Right-panel decorative content for the register page. */
function RegisterArt() {
	const { t } = useTranslation();
	const benefits = [
		{ title: t('auth.art.benefit1Title'), desc: t('auth.art.benefit1Desc') },
		{ title: t('auth.art.benefit2Title'), desc: t('auth.art.benefit2Desc') },
		{ title: t('auth.art.benefit3Title'), desc: t('auth.art.benefit3Desc') },
	];

	const AVATAR_STYLES = [
		{ bg: `linear-gradient(135deg, ${tokens.accent}, ${tokens.cyan})`, label: 'LO' },
		{ bg: `linear-gradient(135deg, ${tokens.coral}, ${tokens.amber})`, label: 'SD' },
		{ bg: `linear-gradient(135deg, ${tokens.cyan}, ${tokens.purpleSoft})`, label: 'CH' },
		{ bg: `linear-gradient(135deg, ${tokens.amber}, ${tokens.coral})`, label: '+9k' },
	];

	return (
		<Stack spacing={2.25}>
			<Stack spacing={1.5}>
				{benefits.map((item, index) => (
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
							backdropFilter: 'blur(8px)',
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
								fontSize: 12.5,
								fontWeight: 700,
							}}
						>
							{index + 1}
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

			{/* footnote: avatar stack + joined count */}
			<Stack direction="row" alignItems="center" spacing={1.75}>
				<Box sx={{ display: 'flex' }}>
					{AVATAR_STYLES.map((av, i) => (
						<Box
							key={av.label}
							sx={{
								width: 28,
								height: 28,
								borderRadius: '50%',
								border: `2px solid ${tokens.indigo}`,
								ml: i === 0 ? 0 : '-8px',
								display: 'grid',
								placeItems: 'center',
								fontSize: 10.5,
								fontWeight: 700,
								color: '#fff',
								background: av.bg,
								zIndex: AVATAR_STYLES.length - i,
								position: 'relative',
							}}
						>
							{av.label}
						</Box>
					))}
				</Box>
				<Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)' }}>
					{t('auth.art.footnote')}
				</Typography>
			</Stack>
		</Stack>
	);
}
