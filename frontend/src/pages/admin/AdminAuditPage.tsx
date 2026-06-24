import { useCallback, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@apollo/client';
import { Box, Checkbox, Stack, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

import { Icons } from '@/constants/icons';
import { tokens } from '@/theme';
import type {
	AuditActionKeyValue,
	AuditActionVariant,
	AuditActorRoleFilter,
	AuditDateRangePreset,
} from '@/constants/auditActionKeys';
import {
	AppAvatar,
	AppButton,
	AppLoader,
	AppPagination,
	AppSelect,
	EmptyState,
} from '@/components/ui';
import { AUDIT_LOGS_QUERY } from '@/graphql/operations/adminAudit';
import type { AuditLogItem, AuditLogsData, AuditLogsVars } from '@/graphql/operations/adminAudit';
import { AuditLogDetailModal } from '@/components/audit/AuditLogDetailModal';
import styles from './AdminAuditPage.module.scss';

const PAGE_SIZE = 50;

const DATE_PRESET_OPTIONS: AuditDateRangePreset[] = [
	'LAST_24_HOURS',
	'LAST_7_DAYS',
	'LAST_30_DAYS',
];

const VARIANT_ICON: Record<AuditActionVariant, IconDefinition> = {
	approve: Icons.check,
	reject: Icons.close,
	block: Icons.ban,
	delete: Icons.delete,
	update: Icons.edit,
	role: Icons.user,
	create: Icons.add,
};

const VARIANT_CLASS: Record<AuditActionVariant, string> = {
	approve: styles.actionIconApprove,
	reject: styles.actionIconReject,
	block: styles.actionIconBlock,
	delete: styles.actionIconDelete,
	update: styles.actionIconUpdate,
	role: styles.actionIconRole,
	create: styles.actionIconCreate,
};

function formatTime(iso: string): string {
	return new Date(iso).toLocaleTimeString(undefined, {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
	});
}

function dayKey(iso: string): string {
	const date = new Date(iso);
	return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function groupByDay(items: AuditLogItem[]): Array<{ key: string; items: AuditLogItem[] }> {
	const map = new Map<string, AuditLogItem[]>();
	for (const item of items) {
		const key = dayKey(item.createdAt);
		const group = map.get(key) ?? [];
		group.push(item);
		map.set(key, group);
	}
	return [...map.entries()].map(([key, groupItems]) => ({ key, items: groupItems }));
}

function FilterCheckboxRow({
	label,
	count,
	checked,
	testId,
	onChange,
}: {
	label: string;
	count: number;
	checked: boolean;
	testId: string;
	onChange: (checked: boolean) => void;
}) {
	return (
		<label className={styles.checkRow} data-testid={testId}>
			<Checkbox
				size="small"
				checked={checked}
				onChange={(e) => onChange(e.target.checked)}
				sx={{ p: 0, '& .MuiSvgIcon-root': { fontSize: 16 } }}
			/>
			<span>{label}</span>
			<span className={styles.checkCount}>{count}</span>
		</label>
	);
}

function AuditEventRow({
	item,
	onSelect,
}: {
	item: AuditLogItem;
	onSelect: (item: AuditLogItem) => void;
}) {
	const { t } = useTranslation();
	const variant = item.actionVariant as AuditActionVariant;
	const icon = VARIANT_ICON[variant] ?? Icons.info;
	const iconClass = VARIANT_CLASS[variant] ?? '';

	return (
		<div
			className={styles.event}
			data-testid="audit-event-row"
			data-action-key={item.actionKey}
			role="button"
			tabIndex={0}
			onClick={() => onSelect(item)}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					onSelect(item);
				}
			}}
		>
			<span className={styles.timestamp}>{formatTime(item.createdAt)}</span>
			<AppAvatar src={item.actor.avatarUrl ?? undefined} name={item.actor.displayName} size="sm" />
			<span className={`${styles.actionIcon} ${iconClass}`}>
				<FontAwesomeIcon icon={icon} style={{ fontSize: 12 }} />
			</span>
			<div className={styles.body}>
				<span className={styles.actorName}>{item.actor.displayName}</span>
				<span className={styles.actionText}>{item.description}</span>
				{item.targetPath ? (
					<RouterLink
						to={item.targetPath}
						className={styles.targetLink}
						onClick={(e) => e.stopPropagation()}
					>
						{item.targetLabel}
					</RouterLink>
				) : (
					<span className={styles.targetLink}>{item.targetLabel}</span>
				)}
				{item.note ? <div className={styles.note}>{item.note}</div> : null}
			</div>
			<div className={styles.meta}>
				<span>{t(`adminAudit.actorRoles.${item.actor.role}`)}</span>
			</div>
			<span className={styles.chev} aria-hidden>
				<FontAwesomeIcon icon={Icons.chevronRight} style={{ fontSize: 12 }} />
			</span>
		</div>
	);
}

export default function AdminAuditPage() {
	const { t } = useTranslation();
	const [page, setPage] = useState(0);
	const [datePreset, setDatePreset] = useState<AuditDateRangePreset>('LAST_7_DAYS');
	const [selectedActionKeys, setSelectedActionKeys] = useState<AuditActionKeyValue[]>([]);
	const [selectedActorRoles, setSelectedActorRoles] = useState<AuditActorRoleFilter[]>([]);
	const [selectedItem, setSelectedItem] = useState<AuditLogItem | null>(null);

	const { data, loading } = useQuery<AuditLogsData, AuditLogsVars>(AUDIT_LOGS_QUERY, {
		variables: {
			input: {
				datePreset,
				actionKeys: selectedActionKeys.length ? selectedActionKeys : undefined,
				actorRoles: selectedActorRoles.length ? selectedActorRoles : undefined,
				page: page + 1,
				pageSize: PAGE_SIZE,
			},
		},
		fetchPolicy: 'cache-and-network',
	});

	const auditLogs = data?.auditLogs;
	const items = auditLogs?.items ?? [];

	const dayGroups = useMemo(() => groupByDay(items), [items]);

	const formatDayLabel = useCallback(
		(iso: string) => {
			const date = new Date(iso);
			const today = new Date();
			const yesterday = new Date();
			yesterday.setDate(today.getDate() - 1);

			const sameDay = (a: Date, b: Date) =>
				a.getFullYear() === b.getFullYear() &&
				a.getMonth() === b.getMonth() &&
				a.getDate() === b.getDate();

			const formatted = date.toLocaleDateString(undefined, {
				day: 'numeric',
				month: 'long',
				year: 'numeric',
			});

			if (sameDay(date, today)) {
				return t('adminAudit.dayLabels.today', { date: formatted });
			}
			if (sameDay(date, yesterday)) {
				return t('adminAudit.dayLabels.yesterday', { date: formatted });
			}
			return formatted;
		},
		[t]
	);

	const toggleActionKey = (key: AuditActionKeyValue, checked: boolean) => {
		setPage(0);
		setSelectedActionKeys((prev) =>
			checked ? [...prev, key] : prev.filter((item) => item !== key)
		);
	};

	const toggleActorRole = (role: AuditActorRoleFilter, checked: boolean) => {
		setPage(0);
		setSelectedActorRoles((prev) =>
			checked ? [...prev, role] : prev.filter((item) => item !== role)
		);
	};

	const clearFilters = () => {
		setPage(0);
		setSelectedActionKeys([]);
		setSelectedActorRoles([]);
	};

	if (loading && !auditLogs) {
		return <AppLoader />;
	}

	return (
		<Box className={styles.page}>
			<Stack
				direction={{ xs: 'column', sm: 'row' }}
				justifyContent="space-between"
				alignItems={{ xs: 'flex-start', sm: 'center' }}
				spacing={2}
				sx={{ mb: 3 }}
			>
				<Box>
					<Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
						{t('adminAudit.pageTitle')}
					</Typography>
					<Typography sx={{ color: tokens.ink3, mt: 0.5, fontSize: 14 }}>
						{t('adminAudit.pageSubtitle')}
					</Typography>
				</Box>
				<Box data-testid="audit-date-preset">
					<AppSelect
						value={datePreset}
						onChange={(e) => {
							setPage(0);
							setDatePreset(e.target.value as AuditDateRangePreset);
						}}
						options={DATE_PRESET_OPTIONS.map((preset) => ({
							value: preset,
							label: t(`adminAudit.dateRange.${preset}`),
						}))}
						fullWidth={false}
						formControlProps={{ sx: { minWidth: 180 } }}
					/>
				</Box>
			</Stack>

			<div className={styles.layout}>
				<aside className={styles.filters} data-testid="audit-filters">
					<div>
						<div className={styles.filterBlockTitle}>{t('adminAudit.filters.actionType')}</div>
						<div className={styles.checkList}>
							{(auditLogs?.actionFilterOptions ?? []).map((option) => (
								<FilterCheckboxRow
									key={option.key}
									label={t(`adminAudit.actions.${option.key}`)}
									count={option.count}
									checked={selectedActionKeys.includes(option.key as AuditActionKeyValue)}
									testId={`audit-filter-action-${option.key}`}
									onChange={(checked) =>
										toggleActionKey(option.key as AuditActionKeyValue, checked)
									}
								/>
							))}
						</div>
					</div>

					<div>
						<div className={styles.filterBlockTitle}>{t('adminAudit.filters.actorType')}</div>
						<div className={styles.checkList}>
							{(auditLogs?.actorRoleFilterOptions ?? []).map((option) => (
								<FilterCheckboxRow
									key={option.role}
									label={t(`adminAudit.actorRoles.${option.role}`)}
									count={option.count}
									checked={selectedActorRoles.includes(option.role as AuditActorRoleFilter)}
									testId={`audit-filter-actor-${option.role}`}
									onChange={(checked) =>
										toggleActorRole(option.role as AuditActorRoleFilter, checked)
									}
								/>
							))}
						</div>
					</div>

					<AppButton tone="ghost" fullWidth onClick={clearFilters}>
						{t('adminAudit.filters.clear')}
					</AppButton>
				</aside>

				<Stack spacing={2.5}>
					<div className={styles.logCard} data-testid="audit-log-card">
						{items.length === 0 ? (
							<EmptyState
								title={t('adminAudit.empty.title')}
								description={t('adminAudit.empty.description')}
							/>
						) : (
							dayGroups.map((group) => (
								<div key={group.key} className={styles.dayBlock}>
									<div className={styles.dayLabel}>{formatDayLabel(group.items[0].createdAt)}</div>
									{group.items.map((item) => (
										<AuditEventRow key={item.id} item={item} onSelect={setSelectedItem} />
									))}
								</div>
							))
						)}
					</div>

					{auditLogs && auditLogs.total > PAGE_SIZE ? (
						<AppPagination
							page={page}
							pageSize={auditLogs.pageSize}
							total={auditLogs.total}
							pageSizeOptions={[25, 50, 100]}
							onChange={(nextPage) => setPage(nextPage)}
						/>
					) : null}
				</Stack>
			</div>

			<AuditLogDetailModal
				item={selectedItem}
				open={selectedItem !== null}
				onClose={() => setSelectedItem(null)}
			/>
		</Box>
	);
}
