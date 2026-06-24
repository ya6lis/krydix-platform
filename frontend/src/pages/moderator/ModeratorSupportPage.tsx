import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { SupportChatThread } from '@/components/support/SupportChatThread';
import {
	AppButton,
	AppInput,
	AppLoader,
	AppTabs,
	EmptyState,
	StatusBadge,
	useAppToast,
} from '@/components/ui';
import { SupportChatStatus } from '@/constants/enums';
import { Icons } from '@/constants/icons';
import {
	ASSIGN_SUPPORT_CONVERSATION_MUTATION,
	SUPPORT_CONVERSATION_QUERY,
	SUPPORT_QUEUE_QUERY,
	UPDATE_SUPPORT_STATUS_MUTATION,
} from '@/graphql/operations/chat';
import type { ConversationDetail, ConversationSummary } from '@/types/chat';
import styles from './ModeratorSupportPage.module.scss';

type QueueTab = 'all' | 'open' | 'inProgress' | 'resolved';

const PAGE_SIZE = 25;

const TAB_STATUS: Record<Exclude<QueueTab, 'all'>, SupportChatStatus> = {
	open: SupportChatStatus.OPEN,
	inProgress: SupportChatStatus.IN_PROGRESS,
	resolved: SupportChatStatus.RESOLVED,
};

function formatRelative(iso: string): string {
	const diff = Date.now() - new Date(iso).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 60) return `${mins}m`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h`;
	return `${Math.floor(hours / 24)}d`;
}

export default function ModeratorSupportPage() {
	const { t, i18n } = useTranslation();
	const { showToast } = useAppToast();
	const language = i18n.language === 'uk' ? 'UK' : 'EN';

	const [activeTab, setActiveTab] = useState<QueueTab>('open');
	const [search, setSearch] = useState('');
	const [page, setPage] = useState(0);
	const [selectedId, setSelectedId] = useState<string | null>(null);

	const filter = useMemo(
		() => ({
			page: page + 1,
			pageSize: PAGE_SIZE,
			search: search.trim() || undefined,
			status: activeTab === 'all' ? undefined : TAB_STATUS[activeTab],
		}),
		[activeTab, page, search]
	);

	const {
		data: queueData,
		loading: queueLoading,
		refetch: refetchQueue,
	} = useQuery<{
		supportQueue: {
			items: ConversationSummary[];
			total: number;
		};
	}>(SUPPORT_QUEUE_QUERY, {
		variables: { filter },
		fetchPolicy: 'cache-and-network',
	});

	const {
		data: conversationData,
		loading: conversationLoading,
		refetch: refetchConversation,
	} = useQuery<{ supportConversation: ConversationDetail }>(SUPPORT_CONVERSATION_QUERY, {
		variables: { id: selectedId, language },
		skip: !selectedId,
	});

	const [assignConversation, { loading: assigning }] = useMutation(
		ASSIGN_SUPPORT_CONVERSATION_MUTATION
	);
	const [updateStatus, { loading: updatingStatus }] = useMutation(UPDATE_SUPPORT_STATUS_MUTATION);

	const items = queueData?.supportQueue.items ?? [];
	const total = queueData?.supportQueue.total ?? 0;
	const selectedConversation = conversationData?.supportConversation ?? null;

	const tabs = useMemo(
		() => [
			{ value: 'open', label: t('moderatorSupport.tabs.open') },
			{ value: 'inProgress', label: t('moderatorSupport.tabs.inProgress') },
			{ value: 'resolved', label: t('moderatorSupport.tabs.resolved') },
			{ value: 'all', label: t('moderatorSupport.tabs.all') },
		],
		[t]
	);

	const refreshAll = useCallback(() => {
		void refetchQueue();
		if (selectedId) void refetchConversation();
	}, [refetchConversation, refetchQueue, selectedId]);

	const handleAssign = async () => {
		if (!selectedId) return;
		try {
			await assignConversation({ variables: { conversationId: selectedId, language } });
			showToast(t('moderatorSupport.actions.assigned'), 'success');
			refreshAll();
		} catch {
			showToast(t('common.error'), 'error');
		}
	};

	const handleStatusChange = async (status: SupportChatStatus) => {
		if (!selectedId) return;
		try {
			await updateStatus({ variables: { conversationId: selectedId, status, language } });
			showToast(t('moderatorSupport.actions.statusUpdated'), 'success');
			refreshAll();
		} catch {
			showToast(t('common.error'), 'error');
		}
	};

	return (
		<section className={styles.page}>
			<header className={styles.header}>
				<div>
					<h1 className={styles.title}>{t('moderatorSupport.pageTitle')}</h1>
					<p className={styles.subtitle}>{t('moderatorSupport.pageSubtitle')}</p>
				</div>
				<div className={styles.headerMeta}>
					<span>{t('moderatorSupport.queueCount', { count: total })}</span>
				</div>
			</header>

			<div className={styles.layout}>
				<div className={styles.queuePanel}>
					<div className={styles.queueToolbar}>
						<AppTabs
							value={activeTab}
							onChange={(value) => {
								setActiveTab(value as QueueTab);
								setPage(0);
								setSelectedId(null);
							}}
							tabs={tabs}
						/>
						<AppInput
							size="small"
							value={search}
							onChange={(event) => {
								setSearch(event.target.value);
								setPage(0);
							}}
							placeholder={t('moderatorSupport.searchPlaceholder')}
							InputProps={{
								startAdornment: (
									<FontAwesomeIcon icon={Icons.search} style={{ marginRight: 8, fontSize: 12 }} />
								),
							}}
						/>
					</div>

					<div className={styles.queueList}>
						{queueLoading && items.length === 0 ? <AppLoader /> : null}
						{!queueLoading && items.length === 0 ? (
							<EmptyState
								icon={Icons.chat}
								title={t('moderatorSupport.empty.title')}
								description={t('moderatorSupport.empty.description')}
							/>
						) : (
							items.map((item) => {
								const requester = item.supportMeta?.requester ?? item.otherParticipant;
								const isSelected = item.id === selectedId;
								return (
									<button
										key={item.id}
										type="button"
										className={`${styles.queueItem} ${isSelected ? styles.queueItemActive : ''}`}
										onClick={() => setSelectedId(item.id)}
									>
										<div className={styles.queueItemTop}>
											<span className={styles.queueItemSubject}>
												{item.supportMeta?.subject ?? t('moderatorSupport.unnamedRequest')}
											</span>
											{item.supportMeta?.status ? (
												<StatusBadge
													status={item.supportMeta.status}
													label={t(`support.statuses.${item.supportMeta.status}`)}
												/>
											) : null}
										</div>
										<div className={styles.queueItemUser}>
											{requester?.displayName ?? t('moderatorSupport.unknownUser')}
										</div>
										<div className={styles.queueItemMeta}>
											<span>{formatRelative(item.updatedAt)}</span>
											{item.unreadCount > 0 ? (
												<span className={styles.unreadBadge}>{item.unreadCount}</span>
											) : null}
										</div>
										{item.lastMessage ? (
											<div className={styles.queueItemPreview}>{item.lastMessage.content}</div>
										) : null}
									</button>
								);
							})
						)}
					</div>
				</div>

				<div className={styles.detailPanel}>
					{!selectedId ? (
						<EmptyState
							icon={Icons.chat}
							title={t('moderatorSupport.select.title')}
							description={t('moderatorSupport.select.description')}
						/>
					) : conversationLoading && !selectedConversation ? (
						<AppLoader />
					) : selectedConversation ? (
						<>
							<div className={styles.detailHead}>
								<div>
									<h2>{selectedConversation.supportMeta?.subject}</h2>
									<p>
										{selectedConversation.supportMeta?.requester?.displayName} ·{' '}
										{selectedConversation.supportMeta?.requester?.email}
									</p>
								</div>
								<div className={styles.detailActions}>
									{selectedConversation.supportMeta?.status === SupportChatStatus.OPEN ? (
										<AppButton loading={assigning} onClick={() => void handleAssign()}>
											{t('moderatorSupport.actions.assignToMe')}
										</AppButton>
									) : null}
									{selectedConversation.supportMeta?.status === SupportChatStatus.IN_PROGRESS ? (
										<AppButton
											tone="ghost"
											loading={updatingStatus}
											onClick={() => void handleStatusChange(SupportChatStatus.RESOLVED)}
										>
											{t('moderatorSupport.actions.markResolved')}
										</AppButton>
									) : null}
									{selectedConversation.supportMeta?.status === SupportChatStatus.RESOLVED ? (
										<AppButton
											tone="ghost"
											loading={updatingStatus}
											onClick={() => void handleStatusChange(SupportChatStatus.CLOSED)}
										>
											{t('moderatorSupport.actions.close')}
										</AppButton>
									) : null}
								</div>
							</div>
							<SupportChatThread
								conversation={selectedConversation}
								onConversationUpdated={refreshAll}
							/>
						</>
					) : null}
				</div>
			</div>
		</section>
	);
}
