import type { TFunction } from 'i18next';

const METADATA_FIELDS = [
	'from',
	'to',
	'reason',
	'source',
	'operation',
	'language',
	'role',
	'action',
	'bulk',
	'count',
	'slug',
	'parentId',
	'sortOrder',
] as const;

function formatMetadataValue(key: string, value: unknown, t: TFunction): string {
	if (value === null || value === undefined) return '—';
	if (typeof value === 'boolean') {
		return value ? t('adminAudit.detail.yes') : t('adminAudit.detail.no');
	}
	if (key === 'bulk' && value === true) {
		return t('adminAudit.detail.yes');
	}
	return String(value);
}

export function buildAuditMetadataRows(
	metadata: Record<string, unknown> | null | undefined,
	t: TFunction,
): Array<{ key: string; label: string; value: string }> {
	if (!metadata) return [];

	const rows: Array<{ key: string; label: string; value: string }> = [];

	for (const field of METADATA_FIELDS) {
		if (!(field in metadata)) continue;
		const value = metadata[field];
		if (value === null || value === undefined || value === '') continue;

		rows.push({
			key: field,
			label: t(`adminAudit.detail.metadata.${field}`),
			value: formatMetadataValue(field, value, t),
		});
	}

	const known = new Set<string>(METADATA_FIELDS);
	for (const [key, value] of Object.entries(metadata)) {
		if (known.has(key) || value === null || value === undefined || value === '') continue;
		rows.push({
			key,
			label: key,
			value: formatMetadataValue(key, value, t),
		});
	}

	return rows;
}

export function formatAuditDateTime(iso: string): string {
	return new Date(iso).toLocaleString(undefined, {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});
}
