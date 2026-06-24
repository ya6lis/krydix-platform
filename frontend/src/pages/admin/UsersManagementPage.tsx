import { useCallback, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@apollo/client';
import { Box, IconButton, Menu, MenuItem, Stack, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { Icons } from '@/constants/icons';
import { ROUTES } from '@/constants/routes';
import { tokens } from '@/theme';
import { Role } from '@/constants/enums';
import { useAuth } from '@/hooks/useAuth';
import {
	AppAvatar,
	AppButton,
	AppCard,
	AppInput,
	AppModal,
	AppPagination,
	AppSelect,
	AppTabs,
	AppTable,
	AppTableColumn,
	ConfirmDialog,
	StatusBadge,
	useAppToast,
} from '@/components/ui';
import { RoleBadge } from '@/components/users/RoleBadge';
import { getPublicProfileRoute } from '@/utils/roleAccess';
import {
	ADMIN_STATS_QUERY,
	ALL_USERS_QUERY,
	CHANGE_USER_ROLE_MUTATION,
	SOFT_BAN_USER_MUTATION,
	SOFT_UNBAN_USER_MUTATION,
	SOFT_DELETE_USER_MUTATION,
	INVITE_USER_MUTATION,
} from '@/graphql/operations/adminUsers';
import type {
	AdminUserItem,
	AdminStatsData,
	AllUsersData,
	AllUsersVars,
	AdminUserRoleFilter,
	AdminUserStatusFilter,
} from '@/graphql/operations/adminUsers';

type RoleTab = 'all' | 'buyers' | 'sellers' | 'moderators' | 'administrators' | 'blocked';

const TAB_ROLE_MAP: Record<RoleTab, AdminUserRoleFilter> = {
	all: 'ALL',
	buyers: 'BUYER',
	sellers: 'SELLER',
	moderators: 'MODERATOR',
	administrators: 'ADMIN',
	blocked: 'BLOCKED',
};

const ASSIGNABLE_ROLES = [Role.BUYER, Role.SELLER, Role.MODERATOR, Role.ADMIN];
const INVITE_ROLES = [Role.BUYER, Role.SELLER, Role.MODERATOR];
const PAGE_SIZE = 25;
const USERS_POLL_INTERVAL_MS = 60_000;

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString(undefined, {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	});
}

function formatRelativeTime(isoString: string): string {
	const diff = Date.now() - new Date(isoString).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return 'Just now';
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d ago`;
	const weeks = Math.floor(days / 7);
	return `${weeks}w ago`;
}

function isOnlineUser(user: AdminUserItem): boolean {
	return user.isOnline;
}

function StatMini({ label, value, delta }: { label: string; value: number; delta?: string }) {
	return (
		<Box
			sx={{
				bgcolor: tokens.surface,
				border: `1px solid ${tokens.line}`,
				borderRadius: '12px',
				p: '16px 18px',
			}}
		>
			<Typography
				sx={{
					fontSize: 11.5,
					color: tokens.ink3,
					fontWeight: 700,
					letterSpacing: '0.06em',
					textTransform: 'uppercase',
				}}
			>
				{label}
			</Typography>
			<Typography
				sx={{
					fontSize: 24,
					fontWeight: 800,
					letterSpacing: '-0.02em',
					mt: 0.75,
					lineHeight: 1,
					color: tokens.ink1,
				}}
			>
				{value.toLocaleString()}
			</Typography>
			{delta && (
				<Typography sx={{ fontSize: 11.5, color: tokens.ink3, mt: 0.5 }}>{delta}</Typography>
			)}
		</Box>
	);
}

function canBanTarget(user: AdminUserItem, isAdmin: boolean): boolean {
	if (isAdmin) return true;
	return user.role === Role.BUYER || user.role === Role.SELLER;
}

function canDeleteTarget(user: AdminUserItem, isAdmin: boolean): boolean {
	return isAdmin && user.role !== Role.ADMIN;
}

function hasRowActions(user: AdminUserItem, isAdmin: boolean): boolean {
	return canBanTarget(user, isAdmin) || canDeleteTarget(user, isAdmin);
}

interface RowMenuProps {
	user: AdminUserItem;
	isAdmin: boolean;
	onBan: () => void;
	onUnban: () => void;
	onDelete: () => void;
}

function RowMenu({ user, isAdmin, onBan, onUnban, onDelete }: RowMenuProps) {
	const { t } = useTranslation();
	const [anchor, setAnchor] = useState<null | HTMLElement>(null);
	const canBan = canBanTarget(user, isAdmin);
	const canDelete = canDeleteTarget(user, isAdmin);

	if (!canBan && !canDelete) return null;

	return (
		<>
			<IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)}>
				<FontAwesomeIcon icon={Icons.more} size="xs" />
			</IconButton>
			<Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
				{user.isActive && canBan && (
					<MenuItem
						onClick={() => {
							setAnchor(null);
							onBan();
						}}
						sx={{ fontSize: 13, color: tokens.coralInk }}
					>
						{t('users.actions.softBan')}
					</MenuItem>
				)}
				{!user.isActive && canBan && (
					<MenuItem
						onClick={() => {
							setAnchor(null);
							onUnban();
						}}
						sx={{ fontSize: 13 }}
					>
						{t('users.actions.unban')}
					</MenuItem>
				)}
				{canDelete && (
					<MenuItem
						onClick={() => {
							setAnchor(null);
							onDelete();
						}}
						sx={{ fontSize: 13, color: tokens.coralInk }}
					>
						{t('users.actions.softDelete')}
					</MenuItem>
				)}
			</Menu>
		</>
	);
}

export default function UsersManagementPage() {
	const { t } = useTranslation();
	const { showToast } = useAppToast();
	const { user: currentUser, hasRole } = useAuth();
	const isAdmin = hasRole(Role.ADMIN);

	const [activeTab, setActiveTab] = useState<RoleTab>('all');
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState<AdminUserStatusFilter>('ALL');
	const [page, setPage] = useState(0);
	const [inviteOpen, setInviteOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<AdminUserItem | null>(null);
	const [inviteForm, setInviteForm] = useState({
		email: '',
		firstName: '',
		lastName: '',
		role: Role.BUYER,
	});

	const { data: statsData } = useQuery<AdminStatsData>(ADMIN_STATS_QUERY);
	const { data, loading, refetch } = useQuery<AllUsersData, AllUsersVars>(ALL_USERS_QUERY, {
		variables: {
			input: {
				roleFilter: TAB_ROLE_MAP[activeTab],
				statusFilter: statusFilter === 'ALL' ? undefined : statusFilter,
				search: search || undefined,
				page: page + 1,
				pageSize: PAGE_SIZE,
			},
		},
		fetchPolicy: 'cache-and-network',
		pollInterval: USERS_POLL_INTERVAL_MS,
	});

	const [changeRole] = useMutation(CHANGE_USER_ROLE_MUTATION);
	const [softBan] = useMutation(SOFT_BAN_USER_MUTATION);
	const [softUnban] = useMutation(SOFT_UNBAN_USER_MUTATION);
	const [softDelete] = useMutation(SOFT_DELETE_USER_MUTATION);
	const [inviteUser, { loading: inviting }] = useMutation(INVITE_USER_MUTATION);

	const stats = statsData?.adminStats;
	const list = data?.allUsers;
	const items = list?.items ?? [];
	const total = list?.total ?? 0;
	const tabCounts = list?.tabCounts;

	const tabs = useMemo(
		() => [
			{ value: 'all', label: t('users.tabs.all'), count: tabCounts?.all },
			{ value: 'buyers', label: t('users.tabs.buyers'), count: tabCounts?.buyers },
			{ value: 'sellers', label: t('users.tabs.sellers'), count: tabCounts?.sellers },
			{ value: 'moderators', label: t('users.tabs.moderators'), count: tabCounts?.moderators },
			{
				value: 'administrators',
				label: t('users.tabs.administrators'),
				count: tabCounts?.administrators,
			},
			{ value: 'blocked', label: t('users.tabs.blocked'), count: tabCounts?.blocked },
		],
		[t, tabCounts]
	);

	const statusOptions = [
		{ value: 'ALL', label: t('users.filters.statusAll') },
		{ value: 'ACTIVE', label: t('users.filters.statusActive') },
		{ value: 'PENDING_EMAIL', label: t('users.filters.statusPendingEmail') },
		{ value: 'BLOCKED', label: t('users.filters.statusBlocked') },
	];

	const handleRoleChange = useCallback(
		async (userId: string, role: string) => {
			try {
				await changeRole({ variables: { id: userId, role } });
				showToast(t('users.toast.roleChanged'), 'success');
				await refetch();
			} catch {
				showToast(t('users.toast.roleChangeError'), 'error');
			}
		},
		[changeRole, showToast, t, refetch]
	);

	const handleBan = useCallback(
		async (userId: string) => {
			try {
				await softBan({ variables: { id: userId } });
				showToast(t('users.toast.banned'), 'info');
				await refetch();
			} catch {
				showToast(t('users.toast.banError'), 'error');
			}
		},
		[softBan, showToast, t, refetch]
	);

	const handleUnban = useCallback(
		async (userId: string) => {
			try {
				await softUnban({ variables: { id: userId } });
				showToast(t('users.toast.unbanned'), 'success');
				await refetch();
			} catch {
				showToast(t('users.toast.unbanError'), 'error');
			}
		},
		[softUnban, showToast, t, refetch]
	);

	const handleDelete = useCallback(async () => {
		if (!deleteTarget) return;
		try {
			await softDelete({ variables: { id: deleteTarget.id } });
			showToast(t('users.toast.deleted'), 'info');
			setDeleteTarget(null);
			await refetch();
		} catch {
			showToast(t('users.toast.deleteError'), 'error');
		}
	}, [deleteTarget, softDelete, showToast, t, refetch]);

	const handleInvite = async () => {
		try {
			await inviteUser({
				variables: {
					input: {
						email: inviteForm.email.trim(),
						firstName: inviteForm.firstName.trim(),
						lastName: inviteForm.lastName.trim(),
						role: inviteForm.role,
					},
				},
			});
			showToast(t('users.toast.invited'), 'success');
			setInviteOpen(false);
			setInviteForm({ email: '', firstName: '', lastName: '', role: Role.BUYER });
			await refetch();
		} catch {
			showToast(t('users.toast.inviteError'), 'error');
		}
	};

	const columns: AppTableColumn<AdminUserItem>[] = [
		{
			key: 'user',
			label: t('users.table.user'),
			render: (row) => {
				const profileHref = getPublicProfileRoute(row.id, row.role);
				return (
					<Box
						component={RouterLink}
						to={profileHref}
						sx={{
							display: 'flex',
							alignItems: 'center',
							gap: 1.5,
							textDecoration: 'none',
							color: 'inherit',
							'&:hover .user-name': { color: tokens.ink1 },
						}}
					>
						<AppAvatar name={row.displayName} size="sm" src={row.avatarUrl ?? undefined} />
						<Box>
							<Typography className="user-name" sx={{ fontWeight: 700, fontSize: 14 }}>
								{row.displayName}
							</Typography>
							<Typography sx={{ fontSize: 12, color: tokens.ink3 }}>
								{row.email} · {row.userRef}
							</Typography>
						</Box>
					</Box>
				);
			},
		},
		{
			key: 'role',
			label: t('users.table.role'),
			render: (row) =>
				isAdmin && row.id !== currentUser?.id ? (
					<AppSelect
						value={row.role}
						onChange={(e) => handleRoleChange(row.id, String(e.target.value))}
						options={ASSIGNABLE_ROLES.map((r) => ({
							value: r,
							label: t(`users.roles.${r.toLowerCase()}`),
						}))}
						size="small"
						fullWidth={false}
						formControlProps={{ sx: { minWidth: 140 } }}
					/>
				) : (
					<RoleBadge role={row.role} />
				),
		},
		{
			key: 'country',
			label: t('users.table.country'),
			render: (row) => row.country ?? '—',
		},
		{
			key: 'joined',
			label: t('users.table.joined'),
			render: (row) => (
				<Typography sx={{ fontSize: 13, color: tokens.ink2 }}>
					{formatDate(row.joinedAt)}
				</Typography>
			),
		},
		{
			key: 'lastSeen',
			label: t('users.table.lastSeen'),
			render: (row) => {
				const online = isOnlineUser(row);
				return (
					<Stack direction="row" spacing={0.75} alignItems="center">
						{online && (
							<Box
								sx={{
									width: 8,
									height: 8,
									borderRadius: '50%',
									bgcolor: tokens.cyan,
									boxShadow: `0 0 0 3px ${tokens.cyanSoft}`,
								}}
							/>
						)}
						<Typography sx={{ fontSize: 13, color: tokens.ink2 }}>
							{online
								? t('users.online')
								: t('users.lastSeenAt', { time: formatRelativeTime(row.lastSeenAt) })}
						</Typography>
					</Stack>
				);
			},
		},
		{
			key: 'status',
			label: t('users.table.status'),
			render: (row) => (
				<StatusBadge
					status={row.status}
					label={t(`users.status.${row.status.toLowerCase()}`, { defaultValue: row.status })}
				/>
			),
		},
		{
			key: 'actions',
			label: '',
			width: 48,
			align: 'right',
			render: (row) =>
				row.id !== currentUser?.id && hasRowActions(row, isAdmin) ? (
					<RowMenu
						user={row}
						isAdmin={isAdmin}
						onBan={() => handleBan(row.id)}
						onUnban={() => handleUnban(row.id)}
						onDelete={() => setDeleteTarget(row)}
					/>
				) : null,
		},
	];

	return (
		<Box>
			<Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3} gap={2}>
				<Box>
					<Typography variant="h5" fontWeight={700}>
						{t('users.pageTitle')}
					</Typography>
					<Typography sx={{ fontSize: 13, color: tokens.ink3, mt: 0.5 }}>
						{isAdmin
							? t('users.pageSubtitle', { count: stats?.total ?? 0 })
							: t('users.pageSubtitleModerator', { count: stats?.total ?? 0 })}
					</Typography>
				</Box>
				<Stack direction="row" spacing={1}>
					{isAdmin && (
						<AppButton
							tone="accent"
							size="small"
							startIcon={<FontAwesomeIcon icon={Icons.add} />}
							onClick={() => setInviteOpen(true)}
						>
							{t('users.inviteBtn')}
						</AppButton>
					)}
				</Stack>
			</Stack>

			<Box
				sx={{
					display: 'grid',
					gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr)' },
					gap: 2,
					mb: 3,
				}}
			>
				<StatMini
					label={t('users.stats.all')}
					value={stats?.total ?? 0}
					delta={t('users.stats.newThisMonth', { count: stats?.newThisMonth ?? 0 })}
				/>
				<StatMini label={t('users.stats.buyers')} value={stats?.buyers ?? 0} />
				<StatMini label={t('users.stats.sellers')} value={stats?.sellers ?? 0} />
				<StatMini
					label={t('users.stats.moderators')}
					value={stats?.moderators ?? 0}
					delta={t('users.stats.activeTeam')}
				/>
				<StatMini
					label={t('users.stats.administrators')}
					value={stats?.administrators ?? 0}
					delta={t('users.stats.platformTeam')}
				/>
			</Box>

			<AppCard disablePadding>
				<Box sx={{ px: 2.5 }}>
					<AppTabs
						tabs={tabs}
						value={activeTab}
						onChange={(tab) => {
							setActiveTab(tab as RoleTab);
							setPage(0);
						}}
					/>
				</Box>

				<Box
					sx={{
						px: 2.5,
						py: 1.75,
						display: 'flex',
						gap: 1.5,
						flexWrap: 'wrap',
						borderTop: `1px solid ${tokens.line2}`,
					}}
				>
					<AppInput
						size="small"
						placeholder={t('users.searchPlaceholder')}
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(0);
						}}
						InputProps={{
							startAdornment: (
								<FontAwesomeIcon
									icon={Icons.search}
									color={tokens.ink3}
									style={{ marginRight: 8, fontSize: 12 }}
								/>
							),
						}}
						sx={{ flex: 1, minWidth: 220 }}
					/>
					<AppSelect
						value={statusFilter}
						onChange={(e) => {
							setStatusFilter(e.target.value as AdminUserStatusFilter);
							setPage(0);
						}}
						options={statusOptions}
						formControlProps={{ sx: { minWidth: 160 } }}
						fullWidth={false}
					/>
				</Box>

				<Box sx={{ px: 0 }}>
					<AppTable
						columns={columns}
						rows={items}
						loading={loading}
						rowKey={(row) => row.id}
						emptyTitle={t('users.empty.title')}
						emptyDescription={t('users.empty.description')}
					/>
				</Box>

				{total > PAGE_SIZE && (
					<AppPagination
						page={page}
						pageSize={PAGE_SIZE}
						total={total}
						pageSizeOptions={[10, 25, 50, 100]}
						onChange={(nextPage) => setPage(nextPage)}
					/>
				)}
			</AppCard>

			<AppModal
				open={inviteOpen}
				onClose={() => setInviteOpen(false)}
				title={t('users.invite.title')}
				maxWidth="sm"
				footer={
					<Stack direction="row" spacing={1} width="100%">
						<AppButton tone="ghost" fullWidth onClick={() => setInviteOpen(false)}>
							{t('users.invite.cancel')}
						</AppButton>
						<AppButton tone="accent" fullWidth loading={inviting} onClick={handleInvite}>
							{t('users.invite.submit')}
						</AppButton>
					</Stack>
				}
			>
				<Stack spacing={2}>
					<AppInput
						label={t('users.invite.email')}
						value={inviteForm.email}
						onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
					/>
					<AppInput
						label={t('users.invite.firstName')}
						value={inviteForm.firstName}
						onChange={(e) => setInviteForm((f) => ({ ...f, firstName: e.target.value }))}
					/>
					<AppInput
						label={t('users.invite.lastName')}
						value={inviteForm.lastName}
						onChange={(e) => setInviteForm((f) => ({ ...f, lastName: e.target.value }))}
					/>
					<AppSelect
						label={t('users.invite.role')}
						value={inviteForm.role}
						onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value as Role }))}
						options={INVITE_ROLES.map((r) => ({
							value: r,
							label: t(`users.roles.${r.toLowerCase()}`),
						}))}
					/>
				</Stack>
			</AppModal>

			<ConfirmDialog
				open={Boolean(deleteTarget)}
				title={t('users.delete.title')}
				message={t('users.delete.message', { name: deleteTarget?.displayName ?? '' })}
				confirmLabel={t('users.delete.confirm')}
				cancelLabel={t('users.delete.cancel')}
				onConfirm={handleDelete}
				onClose={() => setDeleteTarget(null)}
				confirmColor="error"
			/>
		</Box>
	);
}
