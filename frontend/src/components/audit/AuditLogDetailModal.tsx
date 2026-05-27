import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Stack, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

import { Icons } from '@/constants/icons';
import { ROUTES } from '@/constants/routes';
import { tokens } from '@/theme';
import type { AuditActionVariant } from '@/constants/auditActionKeys';
import { AppAvatar, AppButton, AppModal } from '@/components/ui';
import type { AuditLogItem } from '@/graphql/operations/adminAudit';
import { buildAuditMetadataRows, formatAuditDateTime } from '@/utils/auditLogMetadata';
import styles from './AuditLogDetailModal.module.scss';

const VARIANT_ICON: Record<AuditActionVariant, IconDefinition> = {
	approve: Icons.check,
	reject: Icons.close,
	block: Icons.ban,
	delete: Icons.delete,
	update: Icons.edit,
	role: Icons.user,
	create: Icons.add,
};

function DetailRow({
	label,
	value,
	mono = false,
}: {
	label: string;
	value: React.ReactNode;
	mono?: boolean;
}) {
	return (
		<Box className={styles.detailRow}>
			<Typography className={styles.detailLabel}>{label}</Typography>
			<Typography
				className={styles.detailValue}
				sx={mono ? { fontFamily: 'JetBrains Mono, ui-monospace, monospace' } : undefined}
			>
				{value}
			</Typography>
		</Box>
	);
}

function SectionTitle({ children }: { children: React.ReactNode }) {
	return <Typography className={styles.sectionTitle}>{children}</Typography>;
}

export interface AuditLogDetailModalProps {
	item: AuditLogItem | null;
	open: boolean;
	onClose: () => void;
}

export function AuditLogDetailModal({ item, open, onClose }: AuditLogDetailModalProps) {
	const { t } = useTranslation();

	if (!item) return null;

	const variant = item.actionVariant as AuditActionVariant;
	const icon = VARIANT_ICON[variant] ?? Icons.info;
	const metadataRows = buildAuditMetadataRows(item.metadata, t);

	return (
		<AppModal
			open={open}
			onClose={onClose}
			maxWidth="sm"
			title={t('adminAudit.detail.title')}
			data-testid="audit-detail-modal"
			footer={
				<Stack direction="row" spacing={1} width="100%">
					{item.targetPath ? (
						<RouterLink
							to={item.targetPath}
							onClick={onClose}
							style={{ textDecoration: 'none', flex: 1 }}
						>
							<AppButton
								tone="accent"
								fullWidth
								startIcon={<FontAwesomeIcon icon={Icons.externalLink} />}
							>
								{t('adminAudit.detail.openTarget')}
							</AppButton>
						</RouterLink>
					) : null}
					<AppButton tone="ghost" fullWidth={!item.targetPath} onClick={onClose}>
						{t('adminAudit.detail.close')}
					</AppButton>
				</Stack>
			}
		>
			<Stack spacing={3}>
				<Stack direction="row" spacing={2} alignItems="flex-start">
					<Box className={`${styles.heroIcon} ${styles[`heroIcon_${variant}`] ?? ''}`}>
						<FontAwesomeIcon icon={icon} />
					</Box>
					<Box sx={{ flex: 1, minWidth: 0 }}>
						<Typography sx={{ fontWeight: 800, fontSize: 18 }}>
							{t(`adminAudit.actions.${item.actionKey}`)}
						</Typography>
						<Typography sx={{ fontSize: 12.5, color: tokens.ink3, mt: 0.5 }}>
							{item.eventRef} · {formatAuditDateTime(item.createdAt)}
						</Typography>
						<Typography sx={{ fontSize: 13.5, color: tokens.ink2, mt: 1 }}>
							<span style={{ fontWeight: 700 }}>{item.actor.displayName}</span>{' '}
							{item.description}
						</Typography>
					</Box>
				</Stack>

				<Box className={styles.section}>
					<SectionTitle>{t('adminAudit.detail.sections.actor')}</SectionTitle>
					<Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
						<AppAvatar
							name={item.actor.displayName}
							src={item.actor.avatarUrl ?? undefined}
							size="md"
						/>
						<Box>
							<Typography sx={{ fontWeight: 700, fontSize: 14 }}>{item.actor.displayName}</Typography>
							<Typography sx={{ fontSize: 12.5, color: tokens.ink3 }}>{item.actor.email}</Typography>
						</Box>
					</Stack>
					<DetailRow
						label={t('adminAudit.detail.fields.role')}
						value={t(`adminAudit.actorRoles.${item.actor.role}`)}
					/>
					<DetailRow
						label={t('adminAudit.detail.fields.actorId')}
						value={
							<RouterLink to={ROUTES.USER(item.actor.id)} className={styles.inlineLink}>
								{item.actor.id}
							</RouterLink>
						}
						mono
					/>
				</Box>

				<Box className={styles.section}>
					<SectionTitle>{t('adminAudit.detail.sections.target')}</SectionTitle>
					<DetailRow
						label={t('adminAudit.detail.fields.targetType')}
						value={t(`adminAudit.detail.targetTypes.${item.targetType}`, {
							defaultValue: item.targetType,
						})}
					/>
					<DetailRow label={t('adminAudit.detail.fields.targetLabel')} value={item.targetLabel} />
					<DetailRow
						label={t('adminAudit.detail.fields.targetId')}
						value={item.targetId}
						mono
					/>
				</Box>

				<Box className={styles.section}>
					<SectionTitle>{t('adminAudit.detail.sections.action')}</SectionTitle>
					<DetailRow
						label={t('adminAudit.detail.fields.actionKey')}
						value={item.actionKey}
						mono
					/>
					<DetailRow
						label={t('adminAudit.detail.fields.rawAction')}
						value={item.rawAction}
						mono
					/>
					{item.note ? (
						<DetailRow label={t('adminAudit.detail.fields.note')} value={item.note} />
					) : null}
				</Box>

				{metadataRows.length > 0 ? (
					<Box className={styles.section}>
						<SectionTitle>{t('adminAudit.detail.sections.changes')}</SectionTitle>
						{metadataRows.map((row) => (
							<DetailRow key={row.key} label={row.label} value={row.value} mono />
						))}
					</Box>
				) : null}
			</Stack>
		</AppModal>
	);
}
