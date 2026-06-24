import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@apollo/client';
import { Box, Typography } from '@mui/material';

import { FeedbackStatus } from '@/constants/enums';
import { tokens } from '@/theme';
import {
	AppButton,
	AppModal,
	AppSelect,
	AppTextarea,
	StatusBadge,
	AppImage,
	useAppToast,
} from '@/components/ui';
import { UPDATE_FEEDBACK_MUTATION, type UserFeedbackItem } from '@/graphql/operations/feedback';

const STATUS_OPTIONS = [
	FeedbackStatus.NEW,
	FeedbackStatus.UNDER_REVIEW,
	FeedbackStatus.ACKNOWLEDGED,
	FeedbackStatus.PLANNED,
	FeedbackStatus.RESOLVED,
	FeedbackStatus.DISMISSED,
] as const;

interface FeedbackDetailModalProps {
	feedback: UserFeedbackItem | null;
	open: boolean;
	onClose: () => void;
	onUpdated: () => void;
}

function formatDateTime(iso: string): string {
	return new Date(iso).toLocaleString(undefined, {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

export function FeedbackDetailModal({
	feedback,
	open,
	onClose,
	onUpdated,
}: FeedbackDetailModalProps) {
	const { t } = useTranslation();
	const { showToast } = useAppToast();
	const [status, setStatus] = useState<FeedbackStatus>(FeedbackStatus.NEW);
	const [adminNotes, setAdminNotes] = useState('');

	const [updateFeedback, { loading }] = useMutation(UPDATE_FEEDBACK_MUTATION);

	useEffect(() => {
		if (!feedback) return;
		setStatus(feedback.status);
		setAdminNotes(feedback.adminNotes ?? '');
	}, [feedback]);

	if (!feedback) return null;

	const handleSave = async () => {
		try {
			await updateFeedback({
				variables: {
					input: {
						id: feedback.id,
						status,
						adminNotes: adminNotes.trim() || null,
					},
				},
			});
			showToast(t('adminFeedback.detail.saved'), 'success');
			onUpdated();
			onClose();
		} catch {
			showToast(t('adminFeedback.detail.saveError'), 'error');
		}
	};

	return (
		<AppModal
			open={open}
			onClose={onClose}
			title={t('adminFeedback.detail.title')}
			maxWidth="md"
			footer={
				<Box sx={{ display: 'flex', gap: 1, width: '100%', justifyContent: 'flex-end' }}>
					<AppButton tone="ghost" onClick={onClose} disabled={loading}>
						{t('common.cancel')}
					</AppButton>
					<AppButton tone="primary" loading={loading} onClick={handleSave}>
						{t('adminFeedback.detail.save')}
					</AppButton>
				</Box>
			}
		>
			<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
				<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
					<StatusBadge
						status={feedback.status}
						label={t(`adminFeedback.status.${feedback.status}`)}
						size="medium"
					/>
					<Typography sx={{ fontSize: 12.5, color: tokens.ink3 }}>
						{formatDateTime(feedback.createdAt)}
					</Typography>
				</Box>

				<Box>
					<Typography sx={{ fontSize: 18, fontWeight: 800, color: tokens.ink1, mb: 0.5 }}>
						{feedback.subject}
					</Typography>
					<Typography sx={{ fontSize: 13, color: tokens.ink3 }}>
						{feedback.authorName} · {feedback.authorEmail} · {feedback.authorRole}
					</Typography>
					<Typography sx={{ fontSize: 12.5, color: tokens.ink3, mt: 0.5 }}>
						{t(`feedback.category.${feedback.category}`)}
					</Typography>
				</Box>

				<Box>
					<Typography sx={{ fontSize: 13, fontWeight: 700, color: tokens.ink2, mb: 0.75 }}>
						{t('adminFeedback.detail.message')}
					</Typography>
					<Typography
						sx={{
							fontSize: 13.5,
							color: tokens.ink1,
							lineHeight: 1.6,
							whiteSpace: 'pre-wrap',
						}}
					>
						{feedback.message}
					</Typography>
				</Box>

				{feedback.attachments.length > 0 ? (
					<Box>
						<Typography sx={{ fontSize: 13, fontWeight: 700, color: tokens.ink2, mb: 1 }}>
							{t('adminFeedback.detail.attachments')}
						</Typography>
						<Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
							{feedback.attachments.map((attachment, index) => (
								<AppImage
									key={attachment.publicId}
									src={attachment.url}
									gallery={feedback.attachments.map((item) => item.url)}
									galleryIndex={index}
									sx={{
										width: 96,
										height: 96,
										borderRadius: '10px',
										objectFit: 'cover',
										border: `1px solid ${tokens.line}`,
									}}
								/>
							))}
						</Box>
					</Box>
				) : null}

				<AppSelect
					label={t('adminFeedback.detail.status')}
					value={status}
					onChange={(event) => setStatus(event.target.value as FeedbackStatus)}
					options={STATUS_OPTIONS.map((value) => ({
						value,
						label: t(`adminFeedback.status.${value}`),
					}))}
				/>

				<AppTextarea
					label={t('adminFeedback.detail.adminNotes')}
					placeholder={t('adminFeedback.detail.adminNotesPlaceholder')}
					value={adminNotes}
					onChange={(event) => setAdminNotes(event.target.value)}
					rows={4}
				/>

				{feedback.handledByName ? (
					<Typography sx={{ fontSize: 12.5, color: tokens.ink3 }}>
						{t('adminFeedback.detail.handledBy')}: {feedback.handledByName}
						{feedback.handledAt ? ` · ${formatDateTime(feedback.handledAt)}` : ''}
					</Typography>
				) : null}
			</Box>
		</AppModal>
	);
}
