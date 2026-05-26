import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@apollo/client';
import { Box, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { ReleaseNoteStatus } from '@/constants/enums';
import { Icons } from '@/constants/icons';
import { tokens } from '@/theme';
import { ReleaseNoteFormModal } from '@/components/releaseNotes/ReleaseNoteFormModal';
import {
	AppButton,
	AppCard,
	AppInput,
	AppPagination,
	AppSelect,
	AppTable,
	AppTableColumn,
	ConfirmDialog,
	StatusBadge,
	useAppToast,
} from '@/components/ui';
import {
	ADMIN_RELEASE_NOTES_QUERY,
	DELETE_RELEASE_NOTE_MUTATION,
	type AdminReleaseNotesData,
	type AdminReleaseNotesVars,
	type ReleaseNoteItem,
} from '@/graphql/operations/releaseNotes';

const PAGE_SIZE = 25;

function formatDate(iso: string | null): string {
	if (!iso) return '—';
	return new Date(iso).toLocaleDateString(undefined, {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	});
}

export default function AdminReleaseNotesPage() {
	const { t } = useTranslation();
	const { showToast } = useAppToast();

	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState('ALL');
	const [page, setPage] = useState(0);
	const [formOpen, setFormOpen] = useState(false);
	const [selectedNote, setSelectedNote] = useState<ReleaseNoteItem | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<ReleaseNoteItem | null>(null);

	const queryInput = useMemo(
		() => ({
			page,
			pageSize: PAGE_SIZE,
			search: search.trim() || undefined,
			status: statusFilter === 'ALL' ? undefined : (statusFilter as ReleaseNoteStatus),
		}),
		[page, search, statusFilter],
	);

	const { data, loading, refetch } = useQuery<AdminReleaseNotesData, AdminReleaseNotesVars>(
		ADMIN_RELEASE_NOTES_QUERY,
		{
			variables: { input: queryInput },
			fetchPolicy: 'cache-and-network',
		},
	);

	const [deleteReleaseNote, { loading: deleting }] = useMutation(DELETE_RELEASE_NOTE_MUTATION, {
		onCompleted: () => {
			showToast(t('adminReleaseNotes.toast.deleted'), 'success');
			setDeleteTarget(null);
			refetch();
		},
		onError: (error) => showToast(error.message || t('adminReleaseNotes.toast.deleteError'), 'error'),
	});

	const items = data?.adminReleaseNotes.items ?? [];
	const total = data?.adminReleaseNotes.total ?? 0;

	const columns: AppTableColumn<ReleaseNoteItem>[] = [
		{
			key: 'version',
			label: t('adminReleaseNotes.table.version'),
			render: (row) => (
				<Typography sx={{ fontWeight: 700, color: tokens.ink1 }}>{row.version}</Typography>
			),
		},
		{
			key: 'title',
			label: t('adminReleaseNotes.table.title'),
			render: (row) => row.title,
		},
		{
			key: 'status',
			label: t('adminReleaseNotes.table.status'),
			render: (row) => (
				<StatusBadge status={row.status} label={t(`adminReleaseNotes.status.${row.status}`)} />
			),
		},
		{
			key: 'publishedAt',
			label: t('adminReleaseNotes.table.publishedAt'),
			render: (row) => formatDate(row.publishedAt),
		},
		{
			key: 'updatedAt',
			label: t('adminReleaseNotes.table.updatedAt'),
			render: (row) => formatDate(row.updatedAt),
		},
		{
			key: 'author',
			label: t('adminReleaseNotes.table.author'),
			render: (row) => row.authorName ?? '—',
		},
		{
			key: 'actions',
			label: t('adminReleaseNotes.table.actions'),
			align: 'right',
			render: (row) => (
				<AppButton
					tone="ghost"
					size="small"
					onClick={(event) => {
						event.stopPropagation();
						setDeleteTarget(row);
					}}
				>
					{t('common.delete')}
				</AppButton>
			),
		},
	];

	const handleCreate = () => {
		setSelectedNote(null);
		setFormOpen(true);
	};

	const handleEdit = (note: ReleaseNoteItem) => {
		setSelectedNote(note);
		setFormOpen(true);
	};

	return (
		<Box>
			<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 3 }}>
				<Box>
					<Typography sx={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: tokens.ink1 }}>
						{t('adminReleaseNotes.pageTitle')}
					</Typography>
					<Typography sx={{ mt: 0.75, fontSize: 14.5, color: tokens.ink3, maxWidth: 640 }}>
						{t('adminReleaseNotes.pageSubtitle')}
					</Typography>
				</Box>
				<AppButton tone="primary" onClick={handleCreate}>
					<FontAwesomeIcon icon={Icons.add} style={{ marginRight: 8 }} />
					{t('adminReleaseNotes.actions.create')}
				</AppButton>
			</Box>

			<AppCard>
				<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
					<Box sx={{ flex: '1 1 280px' }}>
						<AppInput
							label={t('adminReleaseNotes.filters.searchPlaceholder')}
							value={search}
							onChange={(event) => {
								setSearch(event.target.value);
								setPage(0);
							}}
						/>
					</Box>
					<Box sx={{ width: 220 }}>
						<AppSelect
							label={t('adminReleaseNotes.filters.status')}
							value={statusFilter}
							onChange={(event) => {
								setStatusFilter(String(event.target.value));
								setPage(0);
							}}
							options={[
								{ value: 'ALL', label: t('adminReleaseNotes.filters.allStatuses') },
								{
									value: ReleaseNoteStatus.PUBLISHED,
									label: t('adminReleaseNotes.status.PUBLISHED'),
								},
								{ value: ReleaseNoteStatus.DRAFT, label: t('adminReleaseNotes.status.DRAFT') },
							]}
						/>
					</Box>
				</Box>

				<AppTable
					columns={columns}
					rows={items}
					loading={loading}
					rowKey={(row) => row.id}
					onRowClick={handleEdit}
					emptyTitle={t('adminReleaseNotes.empty.title')}
					emptyDescription={t('adminReleaseNotes.empty.description')}
				/>

				{total > PAGE_SIZE ? (
					<Box sx={{ mt: 2 }}>
						<AppPagination
							page={page}
							pageSize={PAGE_SIZE}
							total={total}
							onChange={(nextPage) => setPage(nextPage)}
						/>
					</Box>
				) : null}
			</AppCard>

			<ReleaseNoteFormModal
				open={formOpen}
				onClose={() => setFormOpen(false)}
				note={selectedNote}
				onSaved={() => refetch()}
			/>

			<ConfirmDialog
				open={Boolean(deleteTarget)}
				title={t('adminReleaseNotes.delete.title')}
				message={t('adminReleaseNotes.delete.message', { version: deleteTarget?.version ?? '' })}
				confirmLabel={t('common.delete')}
				cancelLabel={t('common.cancel')}
				onConfirm={() => {
					if (deleteTarget) {
						deleteReleaseNote({ variables: { id: deleteTarget.id } });
					}
				}}
				onClose={() => setDeleteTarget(null)}
				loading={deleting}
				confirmColor="error"
			/>
		</Box>
	);
}
