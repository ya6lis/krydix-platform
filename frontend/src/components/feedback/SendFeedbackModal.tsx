import { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@apollo/client';
import { Box, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { FeedbackCategory } from '@/constants/enums';
import { Icons } from '@/constants/icons';
import { tokens } from '@/theme';
import {
	AppButton,
	AppInput,
	AppModal,
	AppSelect,
	AppTextarea,
	AppImage,
	useAppToast,
} from '@/components/ui';
import { SUBMIT_FEEDBACK_MUTATION } from '@/graphql/operations/feedback';

interface SendFeedbackModalProps {
	open: boolean;
	onClose: () => void;
	initialCategory?: FeedbackCategory;
	initialSubject?: string;
	initialMessage?: string;
}

const CATEGORY_OPTIONS = [
	FeedbackCategory.BUG,
	FeedbackCategory.FEATURE,
	FeedbackCategory.UX,
	FeedbackCategory.OTHER,
] as const;

function readFileAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

export function SendFeedbackModal({
	open,
	onClose,
	initialCategory,
	initialSubject,
	initialMessage,
}: SendFeedbackModalProps) {
	const { t } = useTranslation();
	const { showToast } = useAppToast();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [category, setCategory] = useState<FeedbackCategory>(FeedbackCategory.BUG);
	const [subject, setSubject] = useState('');
	const [message, setMessage] = useState('');
	const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
	const [photoDataUrls, setPhotoDataUrls] = useState<string[]>([]);

	const [submitFeedback, { loading }] = useMutation(SUBMIT_FEEDBACK_MUTATION);

	useEffect(() => {
		if (!open) return;
		setCategory(initialCategory ?? FeedbackCategory.OTHER);
		setSubject(initialSubject ?? '');
		setMessage(initialMessage ?? '');
		setPhotoPreviews([]);
		setPhotoDataUrls([]);
	}, [open, initialCategory, initialMessage, initialSubject]);

	const resetForm = () => {
		setCategory(FeedbackCategory.BUG);
		setSubject('');
		setMessage('');
		setPhotoPreviews([]);
		setPhotoDataUrls([]);
	};

	const handleClose = () => {
		resetForm();
		onClose();
	};

	const handlePhotoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(event.target.files ?? []);
		if (files.length === 0) return;

		const remaining = 5 - photoDataUrls.length;
		const toAdd = files.slice(0, remaining);

		for (const file of toAdd) {
			const dataUrl = await readFileAsDataUrl(file);
			setPhotoDataUrls((prev) => [...prev, dataUrl]);
			setPhotoPreviews((prev) => [...prev, URL.createObjectURL(file)]);
		}

		if (fileInputRef.current) fileInputRef.current.value = '';
	};

	const removePhoto = (index: number) => {
		setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
		setPhotoDataUrls((prev) => prev.filter((_, i) => i !== index));
	};

	const handleSubmit = async () => {
		if (!subject.trim()) {
			showToast(t('feedback.modal.subjectRequired'), 'warning');
			return;
		}
		if (message.trim().length < 10) {
			showToast(t('feedback.modal.messageRequired'), 'warning');
			return;
		}

		try {
			await submitFeedback({
				variables: {
					input: {
						category,
						subject: subject.trim(),
						message: message.trim(),
						photoDataUrls: photoDataUrls.length > 0 ? photoDataUrls : undefined,
					},
				},
			});
			showToast(t('feedback.modal.success'), 'success');
			handleClose();
		} catch {
			showToast(t('feedback.modal.error'), 'error');
		}
	};

	return (
		<AppModal
			open={open}
			onClose={handleClose}
			title={t('feedback.modal.title')}
			maxWidth="sm"
			footer={
				<Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
					<AppButton tone="ghost" fullWidth onClick={handleClose} disabled={loading}>
						{t('feedback.modal.cancel')}
					</AppButton>
					<AppButton tone="primary" fullWidth loading={loading} onClick={handleSubmit}>
						{t('feedback.modal.submit')}
					</AppButton>
				</Box>
			}
		>
			<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
				<Typography sx={{ fontSize: 13, color: tokens.ink3, lineHeight: 1.5 }}>
					{t('feedback.modal.subtitle')}
				</Typography>

				<AppSelect
					label={t('feedback.modal.categoryLabel')}
					value={category}
					onChange={(event) => setCategory(event.target.value as FeedbackCategory)}
					options={CATEGORY_OPTIONS.map((value) => ({
						value,
						label: t(`feedback.category.${value}`),
					}))}
				/>

				<AppInput
					label={t('feedback.modal.subjectLabel')}
					placeholder={t('feedback.modal.subjectPlaceholder')}
					value={subject}
					onChange={(event) => setSubject(event.target.value)}
				/>

				<AppTextarea
					label={t('feedback.modal.messageLabel')}
					placeholder={t('feedback.modal.messagePlaceholder')}
					value={message}
					onChange={(event) => setMessage(event.target.value)}
					rows={5}
				/>

				<Box>
					<Typography sx={{ fontSize: 13, fontWeight: 600, color: tokens.ink2, mb: 1 }}>
						{t('feedback.modal.photosLabel')}
					</Typography>
					<Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
						{photoPreviews.map((preview, index) => (
							<Box key={preview} sx={{ position: 'relative' }}>
								<AppImage
									src={preview}
									gallery={photoPreviews}
									galleryIndex={index}
									sx={{
										width: 72,
										height: 72,
										borderRadius: '10px',
										objectFit: 'cover',
										border: `1px solid ${tokens.line}`,
									}}
								/>
								<Box
									component="button"
									type="button"
									onClick={() => removePhoto(index)}
									sx={{
										position: 'absolute',
										top: -6,
										right: -6,
										width: 20,
										height: 20,
										borderRadius: '50%',
										border: 0,
										bgcolor: tokens.ink1,
										color: '#fff',
										fontSize: 10,
										cursor: 'pointer',
										display: 'grid',
										placeItems: 'center',
									}}
								>
									<FontAwesomeIcon icon={Icons.close} />
								</Box>
							</Box>
						))}
						{photoPreviews.length < 5 ? (
							<AppButton
								tone="ghost"
								size="small"
								startIcon={<FontAwesomeIcon icon={Icons.camera} />}
								onClick={() => fileInputRef.current?.click()}
							>
								{t('feedback.modal.addPhoto')}
							</AppButton>
						) : null}
					</Box>
					<input
						ref={fileInputRef}
						type="file"
						accept="image/*"
						multiple
						hidden
						onChange={handlePhotoSelect}
					/>
				</Box>
			</Box>
		</AppModal>
	);
}
