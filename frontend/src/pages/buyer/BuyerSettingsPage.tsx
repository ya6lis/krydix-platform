import { useEffect, useState } from 'react';
import { Box, Grid, Typography, Divider } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import {
	AppInput,
	AppSelect,
	AppButton,
	AppSwitch,
	ConfirmDialog,
} from '@/components/ui';
import { AccountSettingsNav, type AccountSettingsSection } from '@/components/account/AccountSettingsNav';
import { ProfileEditSection } from '@/components/account/ProfileEditSection';
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

type SettingsSection = AccountSettingsSection;
interface NotifPrefs {
	newOrder: boolean;
	orderStatus: boolean;
	newMessage: boolean;
	moderation: boolean;
	verification: boolean;
	complaint: boolean;
	weekly: boolean;
	updates: boolean;
}

// ── notification toggle state ────────────────────────────────────────────────
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

function ToggleRow({
	label,
	description,
	checked,
	onChange,
}: {
	label: string;
	description: string;
	checked: boolean;
	onChange: (val: boolean) => void;
}) {
	return (
		<Box
			sx={{
				display: 'grid',
				gridTemplateColumns: '1fr auto',
				gap: 2,
				py: 1.75,
				borderBottom: `1px solid ${tokens.line2}`,
				alignItems: 'center',
				'&:last-of-type': { borderBottom: 0 },
			}}
		>
			<Box>
				<Typography sx={{ fontWeight: 600, fontSize: 14 }}>{label}</Typography>
				<Typography sx={{ fontSize: 12.5, color: tokens.ink3, mt: 0.375 }}>
					{description}
				</Typography>
			</Box>
			<AppSwitch checked={checked} onChange={onChange} />
		</Box>
	);
}

// ── main component ────────────────────────────────────────────────────────────
export default function BuyerSettingsPage() {
	const { t } = useTranslation();
	const [activeSection, setActiveSection] = useState<SettingsSection>('notifications');
	const [closeDialogOpen, setCloseDialogOpen] = useState(false);

	useEffect(() => {
		const syncHash = () => {
			const hash = window.location.hash.replace('#', '') as SettingsSection;
			if (hash === 'profile' || hash === 'security' || hash === 'notifications' || hash === 'language') {
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
	} = useForm<PasswordForm>({
		resolver: zodResolver(PasswordSchema),
	});

	const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
		newOrder: true,
		orderStatus: true,
		newMessage: true,
		moderation: true,
		verification: true,
		complaint: true,
		weekly: false,
		updates: false,
	});

	const [lang, setLang] = useState('en');
	const [timezone, setTimezone] = useState('Europe/Kyiv');
	const [currency, setCurrency] = useState('USD');
	const [dateFormat, setDateFormat] = useState('dd MMM yyyy');

	const onChangePassword = (_data: PasswordForm) => {
		// TODO: wire to CHANGE_PASSWORD mutation
	};

	return (
		<Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
			{/* page head */}
			<Box sx={{ mb: 3 }}>
				<Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
					{t('account.settings.title')}
				</Typography>
				<Typography sx={{ color: tokens.ink3, mt: 0.5, fontSize: 14 }}>
					{t('account.settings.subtitle')}
				</Typography>
			</Box>

			<Grid container spacing={4.5} alignItems="flex-start">
				{/* ── LEFT NAV ── */}
				<Grid item xs={12} md="auto" sx={{ width: { md: 220 } }}>
					<AccountSettingsNav active={activeSection} />
				</Grid>

				{/* ── RIGHT BODY ── */}
				<Grid item xs={12} md>
					<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
						<SectionCard
							id="profile"
							title={t('account.settings.profile.title')}
							subtitle={t('account.settings.profile.subtitle')}
						>
							<ProfileEditSection />
						</SectionCard>

						{/* ── Notifications ── */}
						<SectionCard
							id="notifications"
							title={t('account.settings.notifications.title')}
							subtitle={t('account.settings.notifications.subtitle')}
						>
							<Box sx={{ mx: -3, px: 3 }}>
								{(
									[
										'newOrder',
										'orderStatus',
										'newMessage',
										'moderation',
										'verification',
										'complaint',
										'weekly',
										'updates',
									] as (keyof NotifPrefs)[]
								).map((key) => (
									<ToggleRow
										key={key}
										label={t(`account.settings.notifications.${key}`)}
										description={t(`account.settings.notifications.${key}Desc`)}
										checked={notifPrefs[key]}
										onChange={(val) => setNotifPrefs((prev) => ({ ...prev, [key]: val }))}
									/>
								))}
							</Box>
						</SectionCard>

						{/* ── Language & region ── */}
						<SectionCard
							id="language"
							title={t('account.settings.language.title')}
							subtitle={t('account.settings.language.subtitle')}
						>
							<Grid container spacing={2}>
								<Grid item xs={12} sm={6}>
									<AppSelect
										label={t('account.settings.language.interfaceLang')}
										value={lang}
										onChange={(e) => setLang(e.target.value as string)}
										options={[
											{ value: 'en', label: 'English' },
											{ value: 'uk', label: 'Українська' },
										]}
									/>
								</Grid>
								<Grid item xs={12} sm={6}>
									<AppSelect
										label={t('account.settings.language.timezone')}
										value={timezone}
										onChange={(e) => setTimezone(e.target.value as string)}
										options={[
											{ value: 'Europe/Kyiv', label: 'Europe/Kyiv (GMT+2)' },
											{ value: 'Europe/London', label: 'Europe/London (GMT+0)' },
											{ value: 'America/New_York', label: 'America/New York (GMT−5)' },
										]}
									/>
								</Grid>
								<Grid item xs={12} sm={6}>
									<AppSelect
										label={t('account.settings.language.currency')}
										value={currency}
										onChange={(e) => setCurrency(e.target.value as string)}
										options={[
											{ value: 'USD', label: 'USD — US dollar' },
											{ value: 'UAH', label: 'UAH — Ukrainian hryvnia' },
											{ value: 'EUR', label: 'EUR — Euro' },
										]}
									/>
								</Grid>
								<Grid item xs={12} sm={6}>
									<AppSelect
										label={t('account.settings.language.dateFormat')}
										value={dateFormat}
										onChange={(e) => setDateFormat(e.target.value as string)}
										options={[
											{ value: 'dd MMM yyyy', label: '22 May 2026' },
											{ value: 'MM/dd/yyyy', label: '05/22/2026' },
											{ value: 'yyyy-MM-dd', label: '2026-05-22' },
										]}
									/>
								</Grid>
							</Grid>
						</SectionCard>

						{/* ── Security ── */}
						<SectionCard
							id="security"
							title={t('account.settings.security.title')}
							subtitle={t('account.settings.security.subtitle')}
						>
							<form onSubmit={handlePassSubmit(onChangePassword)}>
								<Grid container spacing={2}>
									<Grid item xs={12} sm={6}>
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
													placeholder="At least 12 characters"
													error={!!fieldState.error}
													helperText={fieldState.error?.message}
												/>
											)}
										/>
									</Grid>
								</Grid>
							</form>

							<Divider sx={{ my: 2.5 }} />

							<ToggleRow
								label="Two-factor authentication"
								description="Use an authenticator app for sign-in challenges."
								checked={false}
								onChange={() => {}}
							/>

							<Box
								sx={{
									display: 'grid',
									gridTemplateColumns: '1fr auto',
									gap: 2,
									py: 1.75,
									alignItems: 'center',
								}}
							>
								<Box>
									<Typography sx={{ fontWeight: 600, fontSize: 14 }}>
										Sign out other sessions
									</Typography>
									<Typography sx={{ fontSize: 12.5, color: tokens.ink3, mt: 0.375 }}>
										You have active sessions on other devices.
									</Typography>
								</Box>
								<AppButton tone="ghost" size="small">
									Sign out all
								</AppButton>
							</Box>
						</SectionCard>

						{/* ── Danger zone ── */}
						<SectionCard
							id="danger"
							title="Close account"
							subtitle="Permanently close your account and remove all data. Pending orders must be resolved first."
							headerAction={
								<AppButton tone="danger" onClick={() => setCloseDialogOpen(true)}>
									Close account
								</AppButton>
							}
							danger
						/>

						{/* ── Save bar ── */}
						<Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.25, pt: 0.75 }}>
							<AppButton tone="ghost">{t('common.discard')}</AppButton>
							<AppButton tone="accent" loading={passSubmitting}>
								{t('account.settings.notifications.savePreferences')}
							</AppButton>
						</Box>
					</Box>
				</Grid>
			</Grid>

			{/* Close account confirm dialog */}
			<ConfirmDialog
				open={closeDialogOpen}
				onClose={() => setCloseDialogOpen(false)}
				onConfirm={() => setCloseDialogOpen(false)}
				title="Close account"
				message="Are you sure you want to permanently close your account? This action cannot be undone."
				confirmLabel="Close account"
				confirmColor="error"
			/>
		</Box>
	);
}
