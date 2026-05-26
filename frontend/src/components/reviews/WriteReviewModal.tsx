import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@apollo/client';
import { Box, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { Icons } from '@/constants/icons';
import { tokens } from '@/theme';
import { AppButton, AppModal, AppTextarea, AppImage } from '@/components/ui';
import { useAppToast } from '@/components/ui/AppToast';
import { StarRating } from './StarRating';
import { CREATE_PRODUCT_REVIEW_MUTATION } from '@/graphql/operations/reviews';

interface WriteReviewModalProps {
	open: boolean;
	onClose: () => void;
	productId: string;
	orderId: string;
	onSuccess: () => void;
}

function readFileAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

export function WriteReviewModal({
	open,
	onClose,
	productId,
	orderId,
	onSuccess,
}: WriteReviewModalProps) {
	const { t } = useTranslation();
	const { showToast } = useAppToast();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [rating, setRating] = useState(5);
	const [text, setText] = useState('');
	const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
	const [photoDataUrls, setPhotoDataUrls] = useState<string[]>([]);

	const [createReview, { loading }] = useMutation(CREATE_PRODUCT_REVIEW_MUTATION);

	const handleClose = () => {
		setRating(5);
		setText('');
		setPhotoPreviews([]);
		setPhotoDataUrls([]);
		onClose();
	};

	const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files ?? []);
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
		if (rating < 1) {
			showToast(t('reviews.modal.ratingRequired'), 'warning');
			return;
		}

		try {
			await createReview({
				variables: {
					input: {
						productId,
						orderId,
						rating,
						text: text.trim() || undefined,
						photoDataUrls: photoDataUrls.length > 0 ? photoDataUrls : undefined,
					},
				},
			});
			showToast(t('reviews.modal.success'), 'success');
			handleClose();
			onSuccess();
		} catch {
			showToast(t('reviews.modal.error'), 'error');
		}
	};

	return (
		<AppModal
			open={open}
			onClose={handleClose}
			title={t('reviews.modal.title')}
			maxWidth="sm"
			footer={
				<Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
					<AppButton tone="ghost" fullWidth onClick={handleClose} disabled={loading}>
						{t('reviews.modal.cancel')}
					</AppButton>
					<AppButton tone="primary" fullWidth loading={loading} onClick={handleSubmit}>
						{t('reviews.modal.submit')}
					</AppButton>
				</Box>
			}
		>
			<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
				<Box>
					<Typography sx={{ fontSize: 13, fontWeight: 600, color: tokens.ink2, mb: 1 }}>
						{t('reviews.modal.ratingLabel')}
					</Typography>
					<StarRating rating={rating} size={28} interactive onChange={setRating} />
				</Box>

				<AppTextarea
					label={t('reviews.modal.textLabel')}
					placeholder={t('reviews.modal.textPlaceholder')}
					value={text}
					onChange={(e) => setText(e.target.value)}
					rows={4}
				/>

				<Box>
					<Typography sx={{ fontSize: 13, fontWeight: 600, color: tokens.ink2, mb: 1 }}>
						{t('reviews.modal.photosLabel')}
					</Typography>
					<Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
						{photoPreviews.map((preview, i) => (
							<Box key={preview} sx={{ position: 'relative' }}>
								<AppImage
									src={preview}
									gallery={photoPreviews}
									galleryIndex={i}
									sx={{
										width: 64,
										height: 64,
										borderRadius: '8px',
										objectFit: 'cover',
										border: `1px solid ${tokens.line}`,
									}}
								/>
								<Box
									component="button"
									onClick={() => removePhoto(i)}
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
						{photoPreviews.length < 5 && (
							<AppButton
								tone="ghost"
								size="small"
								startIcon={<FontAwesomeIcon icon={Icons.camera} />}
								onClick={() => fileInputRef.current?.click()}
							>
								{t('reviews.modal.addPhoto')}
							</AppButton>
						)}
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

				<Typography sx={{ fontSize: 12, color: tokens.ink3 }}>
					{t('reviews.modal.pendingNote')}
				</Typography>
			</Box>
		</AppModal>
	);
}
