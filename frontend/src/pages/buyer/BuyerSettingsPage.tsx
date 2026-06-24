import { useEffect, useState } from 'react';
import { Box, Grid, Typography } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppInput, AppButton, AppModal, useAppToast } from '@/components/ui';
import {
	AccountSettingsNav,
	type AccountSettingsSection,
} from '@/components/account/AccountSettingsNav';
import { ProfileEditSection } from '@/components/account/ProfileEditSection';
import { CLOSE_ACCOUNT_MUTATION } from '@/graphql/operations/profile';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/constants/routes';
import { getHomeRouteForRole } from '@/utils/roleAccess';
import { tokens } from '@/theme';

const PasswordSchema = z
	.object({
		currentPassword: z.string().min(1),
		newPassword: z.string().min(12),
		confirmPassword: z.string().min(1),
	})
	.refine((d) => d.newPassword === d.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword'],
	});

type PasswordForm = z.infer<typeof PasswordSchema>;

function SectionCard({
	id,
	title,
	subtitle,
	headerAction,
	children,
	danger,
}: {
	id: string;
	title: string;
	subtitle: string;
	headerAction?: React.ReactNode;
	children?: React.ReactNode;
	danger?: boolean;
}) {
	return (
		<Box
			id={id}
			sx={{
				background: danger
					? `color-mix(in srgb, ${tokens.coralSoft} 50%, ${tokens.surface})`
					: tokens.surface,
				border: `1px solid ${danger ? `color-mix(in srgb, ${tokens.coral} 30%, ${tokens.line})` : tokens.line}`,
				borderRadius: 2,
				overflow: 'hidden',
			}}
		>
			<Box
				sx={{
					px: 3,
					py: 2.5,
					borderBottom: children ? `1px solid ${tokens.line}` : 'none',
					display: 'flex',
					alignItems: 'flex-start',
					justifyContent: 'space-between',
					gap: 2,
				}}
			>
				<Box>
					<Typography
						sx={{
							fontWeight: 700,
							fontSize: 17,
							letterSpacing: '-0.01em',
							color: danger ? tokens.coralInk : tokens.ink1,
						}}
					>
						{title}
					</Typography>
					<Typography sx={{ fontSize: 13, color: tokens.ink3, mt: 0.375 }}>{subtitle}</Typography>
				</Box>
				{headerAction && <Box sx={{ flexShrink: 0 }}>{headerAction}</Box>}
			</Box>
			{children && <Box sx={{ px: 3, py: 2.75 }}>{children}</Box>}
		</Box>
	);
}

export default function BuyerSettingsPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { logout } = useAuth();
	const { showToast } = useAppToast();
	const [activeSection, setActiveSection] = useState<AccountSettingsSection>('profile');
	const [closeDialogOpen, setCloseDialogOpen] = useState(false);
	const [closePassword, setClosePassword] = useState('');
	const [closePasswordError, setClosePasswordError] = useState('');

	const [closeAccount, { loading: closingAccount }] = useMutation(CLOSE_ACCOUNT_MUTATION);

	useEffect(() => {
		const syncHash = () => {
			const hash = window.location.hash.replace('#', '') as AccountSettingsSection;
			if (hash === 'profile' || hash === 'security' || hash === 'danger') {
				setActiveSection(hash);
				document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
		};
		syncHash();
		window.addEventListener('hashchange', syncHash);
		return () => window.removeEventListener('hashchange', syncHash);
	}, []);

	const {
		control: passCtrl,
		handleSubmit: handlePassSubmit,
		formState: { isSubmitting: passSubmitting },
		reset: resetPasswordForm,
	} = useForm<PasswordForm>({
		resolver: zodResolver(PasswordSchema),
		defaultValues: {
			currentPassword: '',
			newPassword: '',
			confirmPassword: '',
		},
	});

	const onChangePassword = (_data: PasswordForm) => {
		// TODO: wire to CHANGE_PASSWORD mutation
		resetPasswordForm();
	};

	const handleCloseDialogOpen = () => {
		setClosePassword('');
		setClosePasswordError('');
		setCloseDialogOpen(true);
	};

	const handleCloseDialogDismiss = () => {
		if (closingAccount) return;
		setCloseDialogOpen(false);
		setClosePassword('');
		setClosePasswordError('');
	};

	const handleCloseAccount = async () => {
		if (!closePassword.trim()) {
			setClosePasswordError(t('account.settings.closeAccount.passwordRequired'));
			return;
		}

		try {
			await closeAccount({ variables: { password: closePassword } });
			setCloseDialogOpen(false);
			showToast(t('account.settings.closeAccount.success'), 'success');
			await logout();
			navigate(getHomeRouteForRole(undefined));
		} catch {
			setClosePasswordError(t('account.settings.closeAccount.error'));
		}
	};

	return (
		<Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
			<Box sx={{ mb: 3 }}>
				<Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
					{t('account.settings.title')}
				</Typography>
				<Typography sx={{ color: tokens.ink3, mt: 0.5, fontSize: 14 }}>
					{t('account.settings.subtitle')}
				</Typography>
			</Box>

			<Grid container spacing={4.5} alignItems="flex-start">
				<Grid item xs={12} md="auto" sx={{ width: { md: 220 } }}>
					<AccountSettingsNav active={activeSection} />
				</Grid>

				<Grid item xs={12} md>
					<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
						<SectionCard
							id="profile"
							title={t('account.settings.profile.title')}
							subtitle={t('account.settings.profile.subtitle')}
						>
							<ProfileEditSection />
						</SectionCard>

						<SectionCard
							id="security"
							title={t('account.settings.security.title')}
							subtitle={t('account.settings.security.subtitle')}
						>
							<Box component="form" onSubmit={handlePassSubmit(onChangePassword)}>
								<Grid container spacing={2}>
									<Grid item xs={12}>
										<Controller
											name="currentPassword"
											control={passCtrl}
											render={({ field, fieldState }) => (
												<AppInput
													{...field}
													label={t('account.settings.security.currentPassword')}
													type="password"
													error={!!fieldState.error}
													helperText={fieldState.error?.message}
												/>
											)}
										/>
									</Grid>
									<Grid item xs={12} sm={6}>
										<Controller
											name="newPassword"
											control={passCtrl}
											render={({ field, fieldState }) => (
												<AppInput
													{...field}
													label={t('account.settings.security.newPassword')}
													type="password"
													error={!!fieldState.error}
													helperText={fieldState.error?.message}
												/>
											)}
										/>
									</Grid>
									<Grid item xs={12} sm={6}>
										<Controller
											name="confirmPassword"
											control={passCtrl}
											render={({ field, fieldState }) => (
												<AppInput
													{...field}
													label={t('account.settings.security.confirmPassword')}
													type="password"
													error={!!fieldState.error}
													helperText={fieldState.error?.message}
												/>
											)}
										/>
									</Grid>
								</Grid>
								<Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2.5 }}>
									<AppButton type="submit" tone="accent" loading={passSubmitting}>
										{t('account.settings.security.changePassword')}
									</AppButton>
								</Box>
							</Box>
						</SectionCard>

						<SectionCard
							id="danger"
							title={t('account.settings.closeAccount.title')}
							subtitle={t('account.settings.closeAccount.subtitle')}
							headerAction={
								<AppButton tone="danger" onClick={handleCloseDialogOpen}>
									{t('account.settings.closeAccount.action')}
								</AppButton>
							}
							danger
						/>
					</Box>
				</Grid>
			</Grid>

			<AppModal
				open={closeDialogOpen}
				onClose={handleCloseDialogDismiss}
				title={t('account.settings.closeAccount.confirmTitle')}
				maxWidth="xs"
				footer={
					<>
						<AppButton
							variant="outlined"
							onClick={handleCloseDialogDismiss}
							disabled={closingAccount}
						>
							{t('confirmDialog.cancel')}
						</AppButton>
						<AppButton
							variant="contained"
							color="error"
							onClick={handleCloseAccount}
							loading={closingAccount}
						>
							{t('account.settings.closeAccount.action')}
						</AppButton>
					</>
				}
			>
				<Typography sx={{ fontSize: 14, color: tokens.ink2, mb: 2 }}>
					{t('account.settings.closeAccount.confirmMessage')}
				</Typography>
				<AppInput
					label={t('account.settings.closeAccount.passwordLabel')}
					type="password"
					value={closePassword}
					onChange={(e) => {
						setClosePassword(e.target.value);
						if (closePasswordError) setClosePasswordError('');
					}}
					error={!!closePasswordError}
					helperText={closePasswordError}
					autoComplete="current-password"
				/>
			</AppModal>
		</Box>
	);
}
