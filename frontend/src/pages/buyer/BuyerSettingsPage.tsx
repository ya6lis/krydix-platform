import { useState } from 'react';
import { Box, Grid, Typography, Divider } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
	AppInput,
	AppTextarea,
	AppSelect,
	AppButton,
	AppSwitch,
	ConfirmDialog,
} from '@/components/ui';
import { Icons } from '@/constants/icons';
import { tokens } from '@/theme';
import { useAuthStore } from '@/store/authStore';

// ── validation schemas ───────────────────────────────────────────────────────
const ProfileSchema = z.object({
	firstName: z.string().min(1).max(60),
	lastName: z.string().min(1).max(60),
	displayName: z.string().max(80).optional(),
	email: z.string().email(),
	bio: z.string().max(500).optional(),
});

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

type ProfileForm = z.infer<typeof ProfileSchema>;
type PasswordForm = z.infer<typeof PasswordSchema>;

// ── notification toggle state ────────────────────────────────────────────────
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

// ── nav items ────────────────────────────────────────────────────────────────
type NavSection = 'profile' | 'security' | 'notifications' | 'language';

interface NavItem {
	id: NavSection;
	labelKey: string;
	icon: (typeof Icons)[keyof typeof Icons];
}

const ACCOUNT_NAV: NavItem[] = [
	{ id: 'profile', labelKey: 'account.settings.nav.profile', icon: Icons.user },
	{ id: 'security', labelKey: 'account.settings.nav.security', icon: Icons.lock },
	{ id: 'notifications', labelKey: 'account.settings.nav.notifications', icon: Icons.bell },
	{ id: 'language', labelKey: 'account.settings.nav.language', icon: Icons.globe },
];

// ── sub-components ────────────────────────────────────────────────────────────
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
	const user = useAuthStore((s) => s.user);
	const [activeSection, setActiveSection] = useState<NavSection>('profile');
	const [closeDialogOpen, setCloseDialogOpen] = useState(false);

	const fullName = user
		? `${user.profile?.firstName ?? ''} ${user.profile?.lastName ?? ''}`.trim()
		: 'User';

	const {
		control: profileCtrl,
		handleSubmit: handleProfileSubmit,
		formState: { isSubmitting: profileSubmitting },
	} = useForm<ProfileForm>({
		resolver: zodResolver(ProfileSchema),
		defaultValues: {
			firstName: user?.profile?.firstName ?? '',
			lastName: user?.profile?.lastName ?? '',
			displayName: '',
			email: user?.email ?? '',
			bio: '',
		},
	});

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

	const onSaveProfile = (_data: ProfileForm) => {
		// TODO: wire to UPDATE_PROFILE mutation
	};

	const onChangePassword = (_data: PasswordForm) => {
		// TODO: wire to CHANGE_PASSWORD mutation
	};

	const scrollTo = (id: NavSection) => {
		setActiveSection(id);
		document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
					<Box
						sx={{
							position: 'sticky',
							top: 84,
							display: 'flex',
							flexDirection: 'column',
							gap: 0.25,
						}}
					>
						{/* Account group */}
						<Typography
							sx={{
								fontSize: 10.5,
								fontWeight: 700,
								letterSpacing: '0.08em',
								textTransform: 'uppercase',
								color: tokens.ink3,
								px: 1.75,
								pt: 0,
								pb: 0.75,
							}}
						>
							{t('account.settings.nav.account')}
						</Typography>

						{ACCOUNT_NAV.map((item) => {
							const active = activeSection === item.id;
							return (
								<Box
									key={item.id}
									component="a"
									href={`#${item.id}`}
									onClick={(e: React.MouseEvent) => {
										e.preventDefault();
										scrollTo(item.id);
									}}
									sx={{
										px: 1.75,
										py: 1.125,
										borderRadius: 2,
										fontSize: 13.5,
										fontWeight: active ? 700 : 500,
										color: active ? tokens.accentInk : tokens.ink2,
										background: active ? tokens.accentSoft : 'transparent',
										textDecoration: 'none',
										display: 'flex',
										alignItems: 'center',
										gap: 1.25,
										cursor: 'pointer',
										'&:hover': { background: tokens.surface2, color: tokens.ink1 },
									}}
								>
									<Box
										component="span"
										sx={{
											color: active ? tokens.accent : tokens.ink3,
											fontSize: 13,
											flexShrink: 0,
										}}
									>
										<FontAwesomeIcon icon={item.icon} />
									</Box>
									{t(item.labelKey)}
								</Box>
							);
						})}
					</Box>
				</Grid>

				{/* ── RIGHT BODY ── */}
				<Grid item xs={12} md>
					<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
						{/* ── Profile ── */}
						<SectionCard
							id="profile"
							title={t('account.settings.profile.title')}
							subtitle={t('account.settings.profile.subtitle')}
						>
							{/* Avatar block */}
							<Box
								sx={{
									display: 'grid',
									gridTemplateColumns: '96px 1fr',
									gap: 2.75,
									alignItems: 'center',
									mb: 2.5,
								}}
							>
								<Box
									sx={{
										width: 96,
										height: 96,
										borderRadius: '50%',
										background: `linear-gradient(135deg, ${tokens.accent}, ${tokens.cyan})`,
										color: '#fff',
										display: 'grid',
										placeItems: 'center',
										fontSize: 30,
										fontWeight: 700,
									}}
								>
									{fullName
										.trim()
										.split(/\s+/)
										.filter(Boolean)
										.slice(0, 2)
										.map((w) => w[0])
										.join('')
										.toUpperCase() || 'U'}
								</Box>
								<Box>
									<Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
										<AppButton tone="ghost" size="small">
											{t('account.settings.profile.uploadAvatar')}
										</AppButton>
										<AppButton tone="ghost" size="small" sx={{ color: tokens.coralInk }}>
											{t('account.settings.profile.removeAvatar')}
										</AppButton>
									</Box>
									<Typography sx={{ fontSize: 12.5, color: tokens.ink3 }}>
										{t('account.settings.profile.avatarHelp')}
									</Typography>
								</Box>
							</Box>

							<Divider sx={{ mb: 2.5 }} />

							<form onSubmit={handleProfileSubmit(onSaveProfile)}>
								<Grid container spacing={2}>
									<Grid item xs={12} sm={6}>
										<Controller
											name="firstName"
											control={profileCtrl}
											render={({ field, fieldState }) => (
												<AppInput
													{...field}
													label={t('account.settings.profile.firstName')}
													required
													error={!!fieldState.error}
													helperText={fieldState.error?.message}
												/>
											)}
										/>
									</Grid>
									<Grid item xs={12} sm={6}>
										<Controller
											name="lastName"
											control={profileCtrl}
											render={({ field, fieldState }) => (
												<AppInput
													{...field}
													label={t('account.settings.profile.lastName')}
													required
													error={!!fieldState.error}
													helperText={fieldState.error?.message}
												/>
											)}
										/>
									</Grid>
									<Grid item xs={12} sm={6}>
										<Controller
											name="displayName"
											control={profileCtrl}
											render={({ field, fieldState }) => (
												<AppInput
													{...field}
													label={t('account.settings.profile.displayName')}
													helperText={
														fieldState.error?.message ??
														t('account.settings.profile.displayNameHelp')
													}
													error={!!fieldState.error}
												/>
											)}
										/>
									</Grid>
									<Grid item xs={12} sm={6}>
										<Controller
											name="email"
											control={profileCtrl}
											render={({ field, fieldState }) => (
												<AppInput
													{...field}
													label={t('account.settings.profile.email')}
													type="email"
													required
													error={!!fieldState.error}
													helperText={fieldState.error?.message}
												/>
											)}
										/>
									</Grid>
									<Grid item xs={12}>
										<Controller
											name="bio"
											control={profileCtrl}
											render={({ field }) => (
												<AppTextarea
													{...field}
													label={t('account.settings.profile.bio')}
													placeholder={t('account.settings.profile.bioPlaceholder')}
													rows={4}
													maxLength={500}
												/>
											)}
										/>
									</Grid>
								</Grid>
							</form>
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
							<AppButton
								tone="accent"
								loading={profileSubmitting || passSubmitting}
								onClick={handleProfileSubmit(onSaveProfile)}
							>
								{t('account.settings.profile.saveChanges')}
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
