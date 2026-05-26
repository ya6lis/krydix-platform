import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Collapse, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { Icons } from '@/constants/icons';
import { tokens } from '@/theme';
import { AppButton, AppModal } from '@/components/ui';
import type { ReleaseNoteItem } from '@/graphql/operations/releaseNotes';
import { markReleaseNoteSeen } from '@/utils/releaseNotes';

interface WhatsNewModalProps {
	open: boolean;
	onClose: () => void;
	notes: ReleaseNoteItem[];
	loading?: boolean;
	onSeen?: () => void;
	lastSeenPublishedAt?: string | null;
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString(undefined, {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	});
}

function isNoteUnseen(note: ReleaseNoteItem, lastSeenPublishedAt?: string | null): boolean {
	if (!note.publishedAt) return false;
	if (!lastSeenPublishedAt) return true;
	return new Date(note.publishedAt) > new Date(lastSeenPublishedAt);
}

function ReleaseNoteEntry({
	note,
	isLatest,
	isUnseen,
	expanded,
	onToggle,
}: {
	note: ReleaseNoteItem;
	isLatest: boolean;
	isUnseen: boolean;
	expanded: boolean;
	onToggle: () => void;
}) {
	const { t } = useTranslation();

	return (
		<Box
			sx={{
				border: `1px solid ${isLatest ? tokens.accent : tokens.line}`,
				borderRadius: '14px',
				overflow: 'hidden',
				bgcolor: isLatest ? tokens.accentSoft : tokens.surface,
			}}
		>
			<Box
				component="button"
				type="button"
				onClick={onToggle}
				sx={{
					width: '100%',
					border: 'none',
					background: 'transparent',
					cursor: 'pointer',
					textAlign: 'left',
					p: 2,
					display: 'flex',
					alignItems: 'flex-start',
					justifyContent: 'space-between',
					gap: 1.5,
				}}
			>
				<Box sx={{ minWidth: 0 }}>
					<Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 0.75 }}>
						<Box
							sx={{
								display: 'inline-flex',
								alignItems: 'center',
								gap: 0.75,
								px: 1,
								py: 0.35,
								borderRadius: '999px',
								bgcolor: isLatest ? tokens.accent : tokens.surface2,
								color: isLatest ? '#fff' : tokens.ink2,
								fontSize: 11.5,
								fontWeight: 700,
							}}
						>
							<FontAwesomeIcon icon={Icons.bolt} />
							{t('whatsNew.modal.version', { version: note.version })}
						</Box>
						{isLatest ? (
							<Box
								sx={{
									px: 1,
									py: 0.35,
									borderRadius: '999px',
									bgcolor: tokens.cyanSoft,
									color: tokens.cyanInk,
									fontSize: 11,
									fontWeight: 700,
								}}
							>
								{t('whatsNew.modal.latest')}
							</Box>
						) : null}
						{isUnseen ? (
							<Box
								sx={{
									px: 1,
									py: 0.35,
									borderRadius: '999px',
									bgcolor: tokens.amber,
									color: tokens.amberInk,
									fontSize: 11,
									fontWeight: 700,
								}}
							>
								{t('whatsNew.modal.new')}
							</Box>
						) : null}
					</Box>

					<Typography
						sx={{
							fontSize: 16,
							fontWeight: 800,
							color: tokens.ink1,
							letterSpacing: '-0.02em',
							mb: 0.5,
						}}
					>
						{note.title}
					</Typography>

					{note.publishedAt ? (
						<Typography sx={{ fontSize: 12.5, color: tokens.ink3 }}>
							{t('whatsNew.modal.publishedAt', { date: formatDate(note.publishedAt) })}
						</Typography>
					) : null}
				</Box>

				<Box
					sx={{
						color: tokens.ink3,
						fontSize: 12,
						mt: 0.5,
						flexShrink: 0,
						transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
						transition: 'transform 160ms ease',
					}}
				>
					<FontAwesomeIcon icon={Icons.angleDown} />
				</Box>
			</Box>

			<Collapse in={expanded}>
				<Box sx={{ px: 2, pb: 2, pt: 0 }}>
					<Typography
						component="div"
						sx={{
							fontSize: 14.5,
							lineHeight: 1.65,
							color: tokens.ink2,
							whiteSpace: 'pre-wrap',
						}}
					>
						{note.body}
					</Typography>
				</Box>
			</Collapse>
		</Box>
	);
}

export function WhatsNewModal({
	open,
	onClose,
	notes,
	loading,
	onSeen,
	lastSeenPublishedAt,
}: WhatsNewModalProps) {
	const { t } = useTranslation();
	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

	const latestNote = notes[0] ?? null;

	useEffect(() => {
		if (!open || notes.length === 0) return;
		setExpandedIds(new Set([notes[0].id]));
	}, [open, notes]);

	const historyCount = Math.max(notes.length - 1, 0);

	const handleClose = () => {
		if (latestNote?.publishedAt) {
			markReleaseNoteSeen(latestNote.publishedAt);
			onSeen?.();
		}
		onClose();
	};

	const toggleExpanded = (id: string) => {
		setExpandedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const unseenLatest = useMemo(
		() => (latestNote ? isNoteUnseen(latestNote, lastSeenPublishedAt) : false),
		[latestNote, lastSeenPublishedAt],
	);

	return (
		<AppModal
			open={open}
			onClose={handleClose}
			title={t('whatsNew.modal.title')}
			maxWidth="md"
			footer={
				<AppButton tone="primary" onClick={handleClose}>
					{t('whatsNew.modal.gotIt')}
				</AppButton>
			}
		>
			{loading ? (
				<Typography sx={{ color: tokens.ink3, fontSize: 14 }}>{t('common.loading')}</Typography>
			) : notes.length === 0 ? (
				<Box sx={{ textAlign: 'center', py: 2 }}>
					<FontAwesomeIcon icon={Icons.bolt} style={{ fontSize: 28, color: tokens.ink3 }} />
					<Typography sx={{ mt: 1.5, fontWeight: 700, color: tokens.ink1 }}>
						{t('whatsNew.modal.emptyTitle')}
					</Typography>
					<Typography sx={{ mt: 0.5, fontSize: 14, color: tokens.ink3 }}>
						{t('whatsNew.modal.emptyDescription')}
					</Typography>
				</Box>
			) : (
				<Box sx={{ display: 'grid', gap: 2, maxHeight: 'min(70vh, 560px)', overflowY: 'auto', pr: 0.5 }}>
					{notes.map((note, index) => (
						<ReleaseNoteEntry
							key={note.id}
							note={note}
							isLatest={index === 0}
							isUnseen={index === 0 && unseenLatest}
							expanded={expandedIds.has(note.id)}
							onToggle={() => toggleExpanded(note.id)}
						/>
					))}

					{historyCount > 0 ? (
						<Typography sx={{ fontSize: 12.5, color: tokens.ink3, textAlign: 'center', pt: 0.5 }}>
							{t('whatsNew.modal.historyHint', { count: historyCount })}
						</Typography>
					) : null}
				</Box>
			)}
		</AppModal>
	);
}
