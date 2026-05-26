import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@apollo/client';
import { Box, InputAdornment, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { ReleaseNoteStatus } from '@/constants/enums';
import { Icons } from '@/constants/icons';
import { RELEASE_NOTE_BODY_MIN } from '@/constants/releaseNotes';
import { tokens } from '@/theme';
import {
	AppButton,
	AppCheckbox,
	AppInput,
	AppModal,
	AppSelect,
	AppTextarea,
	AppTooltip,
	useAppToast,
} from '@/components/ui';
import {
	CREATE_RELEASE_NOTE_MUTATION,
	UPDATE_RELEASE_NOTE_MUTATION,
	type ReleaseNoteItem,
} from '@/graphql/operations/releaseNotes';
import {
	normalizeReleaseNoteVersion,
	validateReleaseNoteForm,
	type ReleaseNoteFormErrors,
} from '@/utils/releaseNoteFormValidation';

export interface ReleaseNoteFormValues {
	version: string;
	titleEn: string;
	titleUk: string;
	bodyEn: string;
	bodyUk: string;
	status: ReleaseNoteStatus;
}

interface ReleaseNoteFormModalProps {
	open: boolean;
	onClose: () => void;
	note: ReleaseNoteItem | null;
	onSaved: () => void;
}

const EMPTY_FORM: ReleaseNoteFormValues = {
	version: '',
	titleEn: '',
	titleUk: '',
	bodyEn: '',
	bodyUk: '',
	status: ReleaseNoteStatus.DRAFT,
};

function buildFormValues(note: ReleaseNoteItem | null): ReleaseNoteFormValues {
	if (!note) return EMPTY_FORM;

	const en = note.translations.find((item) => item.language === 'EN');
	const uk = note.translations.find((item) => item.language === 'UK');

	return {
		version: note.version,
		titleEn: en?.title ?? note.title,
		titleUk: uk?.title ?? '',
		bodyEn: en?.body ?? note.body,
		bodyUk: uk?.body ?? '',
		status: note.status,
	};
}

export function ReleaseNoteFormModal({ open, onClose, note, onSaved }: ReleaseNoteFormModalProps) {
	const { t } = useTranslation();
	const { showToast } = useAppToast();
	const isEdit = Boolean(note);

	const [form, setForm] = useState<ReleaseNoteFormValues>(EMPTY_FORM);
	const [publishOnCreate, setPublishOnCreate] = useState(true);
	const [fieldErrors, setFieldErrors] = useState<ReleaseNoteFormErrors>({});

	useEffect(() => {
		if (open) {
			setForm(buildFormValues(note));
			setPublishOnCreate(true);
			setFieldErrors({});
		}
	}, [note, open]);

	const statusOptions = useMemo(
		() => [
			{ value: ReleaseNoteStatus.DRAFT, label: t('adminReleaseNotes.status.DRAFT') },
			{ value: ReleaseNoteStatus.PUBLISHED, label: t('adminReleaseNotes.status.PUBLISHED') },
		],
		[t],
	);

	const [createReleaseNote, { loading: creating }] = useMutation(CREATE_RELEASE_NOTE_MUTATION, {
		onCompleted: () => {
			showToast(t('adminReleaseNotes.toast.created'), 'success');
			onSaved();
			onClose();
		},
		onError: (error) => showToast(error.message || t('adminReleaseNotes.toast.createError'), 'error'),
	});

	const [updateReleaseNote, { loading: updating }] = useMutation(UPDATE_RELEASE_NOTE_MUTATION, {
		onCompleted: () => {
			showToast(t('adminReleaseNotes.toast.updated'), 'success');
			onSaved();
			onClose();
		},
		onError: (error) => showToast(error.message || t('adminReleaseNotes.toast.updateError'), 'error'),
	});

	const loading = creating || updating;

	const handleSubmit = () => {
		const errors = validateReleaseNoteForm(form, t);
		setFieldErrors(errors);

		if (Object.keys(errors).length > 0) {
			showToast(t('adminReleaseNotes.toast.validationError'), 'error');
			return;
		}

		const version = normalizeReleaseNoteVersion(form.version);

		if (isEdit && note) {
			updateReleaseNote({
				variables: {
					input: {
						id: note.id,
						version,
						titleEn: form.titleEn.trim(),
						titleUk: form.titleUk.trim(),
						bodyEn: form.bodyEn.trim(),
						bodyUk: form.bodyUk.trim(),
						status: form.status,
					},
				},
			});
			return;
		}

		createReleaseNote({
			variables: {
				input: {
					version,
					titleEn: form.titleEn.trim(),
					titleUk: form.titleUk.trim(),
					bodyEn: form.bodyEn.trim(),
					bodyUk: form.bodyUk.trim(),
					publish: publishOnCreate,
				},
			},
		});
	};

	const clearFieldError = (field: keyof ReleaseNoteFormErrors) => {
		setFieldErrors((prev) => {
			if (!prev[field]) return prev;
			const next = { ...prev };
			delete next[field];
			return next;
		});
	};

	return (
		<AppModal
			open={open}
			onClose={onClose}
			title={isEdit ? t('adminReleaseNotes.form.editTitle') : t('adminReleaseNotes.form.createTitle')}
			maxWidth="md"
			footer={
				<>
					<AppButton tone="ghost" onClick={onClose} disabled={loading}>
						{t('common.cancel')}
					</AppButton>
					<AppButton tone="primary" onClick={handleSubmit} loading={loading}>
						{isEdit ? t('adminReleaseNotes.form.save') : t('adminReleaseNotes.form.create')}
					</AppButton>
				</>
			}
		>
			<Box sx={{ display: 'grid', gap: 2 }}>
				<AppInput
					label={t('adminReleaseNotes.form.version')}
					value={form.version}
					onChange={(event) => {
						clearFieldError('version');
						setForm((prev) => ({ ...prev, version: event.target.value }));
					}}
					placeholder={t('adminReleaseNotes.form.versionPlaceholder')}
					helperText={fieldErrors.version ?? t('adminReleaseNotes.form.versionHint')}
					error={Boolean(fieldErrors.version)}
					required
					InputProps={{
						endAdornment: (
							<InputAdornment position="end">
								<AppTooltip title={t('adminReleaseNotes.form.versionTooltip')}>
									<Box
										component="span"
										sx={{ display: 'inline-flex', color: tokens.ink3, cursor: 'help' }}
									>
										<FontAwesomeIcon icon={Icons.info} />
									</Box>
								</AppTooltip>
							</InputAdornment>
						),
					}}
				/>

				{isEdit ? (
					<AppSelect
						label={t('adminReleaseNotes.form.status')}
						value={form.status}
						onChange={(event) =>
							setForm((prev) => ({
								...prev,
								status: event.target.value as ReleaseNoteStatus,
							}))
						}
						options={statusOptions}
					/>
				) : (
					<AppCheckbox
						label={t('adminReleaseNotes.form.publishNow')}
						checked={publishOnCreate}
						onChange={(checked) => setPublishOnCreate(checked)}
					/>
				)}

				<Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
					{t('adminReleaseNotes.form.englishSection')}
				</Typography>
				<AppInput
					label={t('adminReleaseNotes.form.titleEn')}
					value={form.titleEn}
					onChange={(event) => {
						clearFieldError('titleEn');
						setForm((prev) => ({ ...prev, titleEn: event.target.value }));
					}}
					helperText={fieldErrors.titleEn ?? t('adminReleaseNotes.form.titleHint', { min: 3 })}
					error={Boolean(fieldErrors.titleEn)}
					required
				/>
				<AppTextarea
					label={t('adminReleaseNotes.form.bodyEn')}
					value={form.bodyEn}
					onChange={(event) => {
						clearFieldError('bodyEn');
						setForm((prev) => ({ ...prev, bodyEn: event.target.value }));
					}}
					rows={5}
					helperText={
						fieldErrors.bodyEn ??
						t('adminReleaseNotes.form.bodyHint', {
							min: RELEASE_NOTE_BODY_MIN,
							count: form.bodyEn.trim().length,
						})
					}
					error={Boolean(fieldErrors.bodyEn)}
					required
				/>

				<Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
					{t('adminReleaseNotes.form.ukrainianSection')}
				</Typography>
				<AppInput
					label={t('adminReleaseNotes.form.titleUk')}
					value={form.titleUk}
					onChange={(event) => {
						clearFieldError('titleUk');
						setForm((prev) => ({ ...prev, titleUk: event.target.value }));
					}}
					helperText={fieldErrors.titleUk ?? t('adminReleaseNotes.form.titleHint', { min: 3 })}
					error={Boolean(fieldErrors.titleUk)}
					required
				/>
				<AppTextarea
					label={t('adminReleaseNotes.form.bodyUk')}
					value={form.bodyUk}
					onChange={(event) => {
						clearFieldError('bodyUk');
						setForm((prev) => ({ ...prev, bodyUk: event.target.value }));
					}}
					rows={5}
					helperText={
						fieldErrors.bodyUk ??
						t('adminReleaseNotes.form.bodyHint', {
							min: RELEASE_NOTE_BODY_MIN,
							count: form.bodyUk.trim().length,
						})
					}
					error={Boolean(fieldErrors.bodyUk)}
					required
				/>
			</Box>
		</AppModal>
	);
}
