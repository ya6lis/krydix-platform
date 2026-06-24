import { useRef, useState } from 'react';
import { useMutation } from '@apollo/client';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Box, Divider, Grid, Typography } from '@mui/material';

import { AppButton, AppInput, AppTextarea, useAppToast } from '@/components/ui';
import {
	REMOVE_PROFILE_AVATAR_MUTATION,
	UPDATE_PROFILE_MUTATION,
	UPLOAD_PROFILE_AVATAR_MUTATION,
} from '@/graphql/operations/profile';
import { ME_QUERY } from '@/graphql/operations/auth';
import { useAuthStore } from '@/store/authStore';
import { tokens } from '@/theme';

const ProfileSchema = z.object({
	firstName: z.string().min(1).max(60),
	lastName: z.string().min(1).max(60),
	displayName: z.string().max(80).optional(),
	bio: z.string().max(500).optional(),
});

type ProfileForm = z.infer<typeof ProfileSchema>;

function readFileAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

function initialsFromName(firstName?: string, lastName?: string): string {
	return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || 'U';
}

export function ProfileEditSection() {
	const { t } = useTranslation();
	const { showToast } = useAppToast();
	const user = useAuthStore((s) => s.user);
	const patchProfile = useAuthStore((s) => s.patchProfile);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [avatarUrl, setAvatarUrl] = useState(user?.profile?.avatarUrl ?? null);

	const {
		control,
		handleSubmit,
		reset,
		formState: { isSubmitting },
	} = useForm<ProfileForm>({
		resolver: zodResolver(ProfileSchema),
		defaultValues: {
			firstName: user?.profile?.firstName ?? '',
			lastName: user?.profile?.lastName ?? '',
			displayName: user?.profile?.displayName ?? '',
			bio: user?.profile?.bio ?? '',
		},
	});

	const [updateProfile, { loading: saving }] = useMutation(UPDATE_PROFILE_MUTATION, {
		refetchQueries: [{ query: ME_QUERY }],
	});
	const [uploadAvatar, { loading: uploading }] = useMutation(UPLOAD_PROFILE_AVATAR_MUTATION);
	const [removeAvatar, { loading: removing }] = useMutation(REMOVE_PROFILE_AVATAR_MUTATION);

	if (!user) return null;

	const onSave = async (data: ProfileForm) => {
		try {
			const result = await updateProfile({
				variables: {
					input: {
						firstName: data.firstName,
						lastName: data.lastName,
						displayName: data.displayName?.trim() || null,
						bio: data.bio?.trim() || null,
					},
				},
			});

			const profile = result.data?.updateProfile;
			if (profile) {
				patchProfile({
					firstName: profile.firstName,
					lastName: profile.lastName,
					displayName: profile.displayName,
					bio: profile.bio,
					avatarUrl: profile.avatarUrl,
				});
			}

			showToast(t('account.profile.toast.saved'), 'success');
		} catch {
			showToast(t('account.profile.toast.saveError'), 'error');
		}
	};

	const onDiscard = () => {
		reset({
			firstName: user.profile?.firstName ?? '',
			lastName: user.profile?.lastName ?? '',
			displayName: user.profile?.displayName ?? '',
			bio: user.profile?.bio ?? '',
		});
		setAvatarUrl(user.profile?.avatarUrl ?? null);
	};

	const onPickAvatar = () => fileInputRef.current?.click();

	const onAvatarSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.target.value = '';
		if (!file) return;

		if (file.size > 2 * 1024 * 1024) {
			showToast(t('account.profile.toast.avatarTooLarge'), 'error');
			return;
		}

		try {
			const dataUrl = await readFileAsDataUrl(file);
			const result = await uploadAvatar({ variables: { input: { dataUrl } } });
			const nextUrl = result.data?.uploadProfileAvatar.avatarUrl ?? null;
			setAvatarUrl(nextUrl);
			patchProfile({ avatarUrl: nextUrl });
			showToast(t('account.profile.toast.avatarUpdated'), 'success');
		} catch {
			showToast(t('account.profile.toast.avatarError'), 'error');
		}
	};

	const onRemoveAvatar = async () => {
		try {
			await removeAvatar();
			setAvatarUrl(null);
			patchProfile({ avatarUrl: null });
			showToast(t('account.profile.toast.avatarRemoved'), 'success');
		} catch {
			showToast(t('account.profile.toast.avatarError'), 'error');
		}
	};

	return (
		<Box data-testid="profile-edit-section">
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
						overflow: 'hidden',
					}}
					data-testid="profile-avatar"
				>
					{avatarUrl ? (
						<Box
							component="img"
							src={avatarUrl}
							alt=""
							sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
						/>
					) : (
						initialsFromName(user.profile?.firstName, user.profile?.lastName)
					)}
				</Box>
				<Box>
					<Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
						<AppButton tone="ghost" onClick={onPickAvatar} disabled={uploading}>
							{t('account.settings.profile.uploadAvatar')}
						</AppButton>
						<AppButton
							tone="ghost"
							onClick={onRemoveAvatar}
							disabled={!avatarUrl || removing}
							sx={{ color: tokens.coralInk }}
						>
							{t('account.settings.profile.removeAvatar')}
						</AppButton>
					</Box>
					<Typography sx={{ fontSize: 12.5, color: tokens.ink3 }}>
						{t('account.settings.profile.avatarHelp')}
					</Typography>
					<input
						ref={fileInputRef}
						type="file"
						accept="image/png,image/jpeg,image/webp"
						style={{ display: 'none' }}
						onChange={onAvatarSelected}
					/>
				</Box>
			</Box>

			<Divider sx={{ mb: 2.5 }} />

			<form onSubmit={handleSubmit(onSave)}>
				<Grid container spacing={2}>
					<Grid item xs={12} sm={6}>
						<Controller
							name="firstName"
							control={control}
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
							control={control}
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
							control={control}
							render={({ field, fieldState }) => (
								<AppInput
									{...field}
									label={t('account.settings.profile.displayName')}
									helperText={
										fieldState.error?.message ?? t('account.settings.profile.displayNameHelp')
									}
									error={!!fieldState.error}
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} sm={6}>
						<AppInput
							label={t('account.settings.profile.email')}
							value={user.email}
							disabled
							helperText={t('account.profile.emailReadonly')}
						/>
					</Grid>
					<Grid item xs={12}>
						<Controller
							name="bio"
							control={control}
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

				<Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.25, mt: 2.5 }}>
					<AppButton tone="ghost" type="button" onClick={onDiscard}>
						{t('common.discard')}
					</AppButton>
					<AppButton
						tone="accent"
						type="submit"
						loading={isSubmitting || saving}
						data-testid="profile-save-btn"
					>
						{t('account.settings.profile.saveChanges')}
					</AppButton>
				</Box>
			</form>
		</Box>
	);
}
