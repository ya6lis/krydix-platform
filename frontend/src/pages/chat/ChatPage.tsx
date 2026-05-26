import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useApolloClient } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { Icons } from '@/constants/icons';
import { ROUTES } from '@/constants/routes';
import { Role } from '@/constants/enums';
import { CHAT_FILTER, type ChatFilter } from '@/constants/chatEvents';
import { AppLoader, AppMenu, ConfirmDialog, AppImage } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { useChatSocket, type ConversationUpdatedPayload, type TypingPayload } from '@/hooks/useChatSocket';
import {
	CONVERSATION_QUERY,
	DELETE_CONVERSATION_MUTATION,
	MARK_CONVERSATION_READ_MUTATION,
	MESSAGES_QUERY,
	MY_CONVERSATIONS_QUERY,
	SEND_MESSAGE_MUTATION,
	START_CONVERSATION_MUTATION,
	UNREAD_MESSAGE_COUNT_QUERY,
} from '@/graphql/operations/chat';
import {
	MY_NOTIFICATIONS_QUERY,
	UNREAD_NOTIFICATION_COUNT_QUERY,
	UNREAD_ORDER_NOTIFICATION_COUNT_QUERY,
} from '@/graphql/operations/notifications';
import type {
	ChatMessage,
	ConversationDetail,
	ConversationSummary,
	MessageListResult,
} from '@/types/chat';
import {
	formatLocation,
	formatLastSeen,
	formatMemberSince,
	formatMessageTime,
	formatMoney,
	formatRelativeWhen,
	groupMessagesByDay,
} from './chatUtils';
import styles from './ChatPage.module.scss';

const MESSAGE_PAGE_SIZE = 100;
const TYPING_CLEAR_MS = 3000;

function participantProfileRoute(participant: ConversationSummary['otherParticipant']): string | null {
	if (!participant) return null;
	if (participant.role === Role.SELLER) {
		return ROUTES.SELLER_PUBLIC(participant.id);
	}
	return null;
}

function participantPresence(
	participant: ConversationSummary['otherParticipant'],
	t: (key: string, opts?: Record<string, unknown>) => string,
	locale: string,
) {
	if (!participant) return '';
	if (participant.isOnline) {
		return t('chat.onlineNow');
	}
	return t('chat.lastSeenAt', { time: formatLastSeen(participant.lastSeenAt, locale) });
}

function MessageStatus({ isDelivered, isRead }: { isDelivered: boolean; isRead: boolean }) {
	if (isRead) {
		return (
			<span className={styles.msgStatusRead} aria-label="read">
				<FontAwesomeIcon icon={Icons.checkDouble} />
			</span>
		);
	}
	if (isDelivered) {
		return (
			<span className={styles.msgStatusDelivered} aria-label="delivered">
				<FontAwesomeIcon icon={Icons.checkDouble} />
			</span>
		);
	}
	return (
		<span className={styles.msgStatusSent} aria-label="sent">
			<FontAwesomeIcon icon={Icons.check} />
		</span>
	);
}

function participantLabel(participant: ConversationSummary['otherParticipant'], t: (k: string) => string) {
	if (!participant) return '';
	if (participant.role === Role.MODERATOR) {
		return `${participant.displayName} · ${t('chat.roleModerator')}`;
	}
	if (participant.role === Role.SELLER) {
		return participant.displayName;
	}
	return participant.displayName;
}

function conversationContext(
	conversation: ConversationSummary | ConversationDetail,
	t: (k: string, opts?: Record<string, unknown>) => string,
) {
	if (conversation.product) {
		return (
			<>
				{t('chat.contextProductPrefix')}{' '}
				<span className={styles.convCtxStrong}>{conversation.product.title}</span>
			</>
		);
	}
	return t('chat.contextGeneral');
}

function Avatar({
	url,
	initials,
	className = '',
	online = false,
}: {
	url: string | null;
	initials: string;
	className?: string;
	online?: boolean;
}) {
	return (
		<div
			className={`${styles.avatar} ${online ? styles.avatarOnline : ''} ${className}`.trim()}
			aria-hidden
		>
			{url ? <img src={url} alt="" className={styles.avatarImage} /> : initials}
		</div>
	);
}

export default function ChatPage() {
	const { t, i18n } = useTranslation();
	const navigate = useNavigate();
	const apolloClient = useApolloClient();
	const [searchParams, setSearchParams] = useSearchParams();
	const currentUser = useAuthStore((state) => state.user);
	const language = i18n.language === 'uk' ? 'UK' : 'EN';
	const locale = i18n.language;

	const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('conversation'));
	const [search, setSearch] = useState('');
	const [filter, setFilter] = useState<ChatFilter>(CHAT_FILTER.ALL);
	const [draft, setDraft] = useState('');
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
	const [isOtherTyping, setIsOtherTyping] = useState(false);
	const msgsRef = useRef<HTMLDivElement>(null);
	const bootstrappedRef = useRef(false);
	const typingTimeoutRef = useRef<number>();
	const typingEmitTimeoutRef = useRef<number>();

	const isSellerView = currentUser?.role === Role.SELLER;

	const {
		data: conversationsData,
		loading: conversationsLoading,
		refetch: refetchConversations,
	} = useQuery<{ myConversations: ConversationSummary[] }>(MY_CONVERSATIONS_QUERY, {
		variables: { language },
		fetchPolicy: 'cache-and-network',
	});

	const { data: conversationData, refetch: refetchConversation } = useQuery<{
		conversation: ConversationDetail;
	}>(CONVERSATION_QUERY, {
		variables: { id: selectedId, language },
		skip: !selectedId,
	});

	const { loading: messagesLoading, refetch: refetchMessages } = useQuery<{
		messages: MessageListResult;
	}>(MESSAGES_QUERY, {
		variables: { conversationId: selectedId, page: 1, pageSize: MESSAGE_PAGE_SIZE },
		skip: !selectedId,
		onCompleted: (data) => setMessages(data.messages.items),
	});

	const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE_MUTATION, {
		refetchQueries: [{ query: UNREAD_MESSAGE_COUNT_QUERY }],
	});
	const [markRead] = useMutation(MARK_CONVERSATION_READ_MUTATION, {
		refetchQueries: [
			{ query: UNREAD_MESSAGE_COUNT_QUERY },
			{ query: MY_NOTIFICATIONS_QUERY, variables: { limit: 30 } },
			{ query: UNREAD_NOTIFICATION_COUNT_QUERY },
			{ query: UNREAD_ORDER_NOTIFICATION_COUNT_QUERY },
		],
	});
	const [startConversation] = useMutation(START_CONVERSATION_MUTATION);
	const [deleteConversation, { loading: deleting }] = useMutation(DELETE_CONVERSATION_MUTATION, {
		refetchQueries: [
			{ query: MY_CONVERSATIONS_QUERY, variables: { language } },
			{ query: UNREAD_MESSAGE_COUNT_QUERY },
		],
	});

	const conversations = conversationsData?.myConversations ?? [];
	const conversationIds = useMemo(() => conversations.map((item) => item.id), [conversations]);
	const activeConversation = conversationData?.conversation ?? null;

	const filteredConversations = useMemo(() => {
		const query = search.trim().toLowerCase();
		return conversations.filter((item) => {
			if (!item.otherParticipant) return false;
			if (filter === CHAT_FILTER.UNREAD && item.unreadCount === 0) return false;
			if (filter === CHAT_FILTER.BUYERS && item.otherParticipant.role !== Role.BUYER) return false;
			if (filter === CHAT_FILTER.MODS && item.otherParticipant.role !== Role.MODERATOR) return false;
			if (!query) return true;
			const haystack = [
				item.otherParticipant.displayName,
				item.product?.title ?? '',
				item.lastMessage?.content ?? '',
			]
				.join(' ')
				.toLowerCase();
			return haystack.includes(query);
		}) as Array<
			ConversationSummary & { otherParticipant: NonNullable<ConversationSummary['otherParticipant']> }
		>;
	}, [conversations, filter, search]);

	const activeOther = activeConversation?.otherParticipant ?? null;

	const filterCounts = useMemo(
		() => ({
			all: conversations.length,
			buyers: conversations.filter(
				(item) => item.otherParticipant?.role === Role.BUYER,
			).length,
			mods: conversations.filter(
				(item) => item.otherParticipant?.role === Role.MODERATOR,
			).length,
			unread: conversations.filter((item) => item.unreadCount > 0).length,
		}),
		[conversations],
	);

	const handleSocketMessage = useCallback(
		(message: ChatMessage) => {
			if (message.conversationId === selectedId) {
				setMessages((prev) => (prev.some((item) => item.id === message.id) ? prev : [...prev, message]));
			}
			void refetchConversations();
			if (message.senderId !== currentUser?.id) {
				void apolloClient.refetchQueries({ include: [UNREAD_MESSAGE_COUNT_QUERY] });
			}
		},
		[apolloClient, currentUser?.id, refetchConversations, selectedId],
	);

	const handleConversationUpdated = useCallback(
		(payload: ConversationUpdatedPayload) => {
			void refetchConversations();
			if (payload.conversationId !== selectedId) return;

			if (payload.readerId) {
				setMessages((prev) =>
					prev.map((message) =>
						message.senderId === currentUser?.id
							? { ...message, isDelivered: true, isRead: true }
							: message,
					),
				);
			} else if (payload.deliveredBy) {
				setMessages((prev) =>
					prev.map((message) =>
						message.senderId === currentUser?.id && !message.isRead
							? { ...message, isDelivered: true }
							: message,
					),
				);
			} else {
				void refetchConversation();
				void refetchMessages();
			}
		},
		[currentUser?.id, refetchConversations, refetchConversation, refetchMessages, selectedId],
	);

	const handleTyping = useCallback(
		(payload: TypingPayload) => {
			if (payload.conversationId !== selectedId || payload.userId === currentUser?.id) return;
			setIsOtherTyping(true);
			window.clearTimeout(typingTimeoutRef.current);
			typingTimeoutRef.current = window.setTimeout(() => setIsOtherTyping(false), TYPING_CLEAR_MS);
		},
		[currentUser?.id, selectedId],
	);

	const { emitTyping } = useChatSocket({
		conversationIds,
		onMessage: handleSocketMessage,
		onConversationUpdated: handleConversationUpdated,
		onTyping: handleTyping,
	});

	useEffect(() => {
		const productId = searchParams.get('productId');
		const sellerId = searchParams.get('sellerId');
		const conversationId = searchParams.get('conversation');
		if (bootstrappedRef.current) return;

		if (conversationId) {
			setSelectedId(conversationId);
			bootstrappedRef.current = true;
			return;
		}

		if (productId || sellerId) {
			bootstrappedRef.current = true;
			void startConversation({
				variables: {
					productId: productId ?? undefined,
					sellerId: sellerId ?? undefined,
					language,
				},
			}).then(({ data }) => {
				const id = data?.startConversation?.id;
				if (!id) return;
				setSelectedId(id);
				setSearchParams({ conversation: id }, { replace: true });
				void refetchConversations();
			});
		}
	}, [language, refetchConversations, searchParams, setSearchParams, startConversation]);

	useEffect(() => {
		if (!selectedId) return;
		void markRead({ variables: { conversationId: selectedId } });
	}, [markRead, selectedId]);

	useEffect(() => {
		setIsOtherTyping(false);
	}, [selectedId]);

	useEffect(() => {
		const node = msgsRef.current;
		if (!node || typeof node.scrollTo !== 'function') return;
		node.scrollTo({ top: node.scrollHeight });
	}, [messages, selectedId]);

	const selectConversation = (id: string) => {
		setSelectedId(id);
		setSearchParams({ conversation: id }, { replace: true });
	};

	const handleSend = async () => {
		const content = draft.trim();
		if (!selectedId || !content || sending) return;
		setDraft('');
		const { data } = await sendMessage({ variables: { conversationId: selectedId, content } });
		const message = data?.sendMessage as ChatMessage | undefined;
		if (message) {
			setMessages((prev) => (prev.some((item) => item.id === message.id) ? prev : [...prev, message]));
		}
		void refetchConversations();
		void refetchMessages();
	};

	const handleDraftChange = (value: string) => {
		setDraft(value);
		if (!selectedId) return;
		window.clearTimeout(typingEmitTimeoutRef.current);
		typingEmitTimeoutRef.current = window.setTimeout(() => emitTyping(selectedId), 250);
	};

	const handleDeleteConversation = async () => {
		if (!deleteTargetId) return;
		await deleteConversation({ variables: { conversationId: deleteTargetId } });
		if (selectedId === deleteTargetId) {
			setSelectedId(null);
			setMessages([]);
			setSearchParams({}, { replace: true });
		}
		setDeleteTargetId(null);
	};

	const openParticipantProfile = () => {
		if (!activeConversation) return;
		const route = participantProfileRoute(activeOther);
		if (route) navigate(route);
	};

	const messageGroups = useMemo(
		() => groupMessagesByDay(messages, locale),
		[messages, locale],
	);

	const filterOptions: Array<{ id: ChatFilter; label: string; count: number }> = [
		{ id: CHAT_FILTER.ALL, label: t('chat.filters.all'), count: filterCounts.all },
		...(isSellerView
			? [{ id: CHAT_FILTER.BUYERS, label: t('chat.filters.buyers'), count: filterCounts.buyers }]
			: []),
		...(currentUser?.role === Role.MODERATOR || currentUser?.role === Role.ADMIN
			? [{ id: CHAT_FILTER.MODS, label: t('chat.filters.mods'), count: filterCounts.mods }]
			: []),
		{ id: CHAT_FILTER.UNREAD, label: t('chat.filters.unread'), count: filterCounts.unread },
	];

	if (conversationsLoading && conversations.length === 0) {
		return <AppLoader />;
	}

	return (
		<div className={styles.page} data-testid="chat-page">
			<div className={styles.chatShell}>
				<aside className={styles.convList} data-testid="chat-conversation-list">
					<div className={styles.clHead}>
						<div className={styles.clTitleRow}>
							<span>{t('chat.inbox')}</span>
						</div>
						<label className={styles.searchWrap}>
							<FontAwesomeIcon icon={Icons.search} />
							<input
								className={styles.searchInput}
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								placeholder={t('chat.searchPlaceholder')}
								data-testid="chat-search"
							/>
						</label>
						<div className={styles.clFilters}>
							{filterOptions.map((option) => (
								<button
									key={option.id}
									type="button"
									className={`${styles.filterPill} ${filter === option.id ? styles.filterPillActive : ''}`}
									onClick={() => setFilter(option.id)}
								>
									{option.label}
									<span className={styles.filterCount}>{option.count}</span>
								</button>
							))}
						</div>
					</div>

					<div className={styles.convItems}>
						{filteredConversations.map((item) => (
							<button
								key={item.id}
								type="button"
								className={`${styles.convItem} ${selectedId === item.id ? styles.convItemActive : ''}`}
								onClick={() => selectConversation(item.id)}
								data-testid={`chat-conversation-${item.id}`}
							>
								<Avatar
									url={item.otherParticipant.avatarUrl}
									initials={item.otherParticipant.initials}
									online={item.otherParticipant.isOnline}
								/>
								<div className={styles.convBody}>
									<div className={styles.convTop}>
										<span className={styles.convName}>
											{participantLabel(item.otherParticipant, t)}
										</span>
										<span className={styles.convWhen}>
											{formatRelativeWhen(item.updatedAt, locale)}
										</span>
									</div>
									<div className={styles.convCtx}>{conversationContext(item, t)}</div>
									<div className={styles.convPreview}>{item.lastMessage?.content ?? t('chat.noMessagesYet')}</div>
								</div>
								{item.unreadCount > 0 ? (
									<span className={styles.unreadBadge}>{item.unreadCount}</span>
								) : null}
							</button>
						))}
					</div>
				</aside>

				<section className={styles.conv}>
					{!selectedId || !activeConversation || !activeOther ? (
						<div className={styles.emptyState}>{t('chat.selectConversation')}</div>
					) : (
						<>
							<div className={styles.convHead}>
								<Avatar
									url={activeOther.avatarUrl}
									initials={activeOther.initials}
									className={styles.avatarSm}
									online={activeOther.isOnline}
								/>
								<div className={styles.convHeadInfo}>
									<div className={styles.convHeadName}>
										{activeOther.displayName}
									</div>
									<div className={styles.convHeadSub}>
										<span className={activeOther.isOnline ? styles.onlineLabel : ''}>
											{participantPresence(activeOther, t, locale)}
										</span>
										<span>
											{t(`chat.role.${activeOther.role.toLowerCase()}`, {
												defaultValue: activeOther.role,
											})}
										</span>
									</div>
								</div>
								<button
									type="button"
									className={styles.iconBtn}
									aria-label={t('chat.moreActions')}
									onClick={(event) => setMenuAnchor(event.currentTarget)}
								>
									<FontAwesomeIcon icon={Icons.more} />
								</button>
								<AppMenu
									anchorEl={menuAnchor}
									open={Boolean(menuAnchor)}
									onClose={() => setMenuAnchor(null)}
									items={[
										{
											label: t('chat.deleteConversation'),
											icon: Icons.delete,
											danger: true,
											onClick: () => setDeleteTargetId(selectedId),
										},
									]}
								/>
							</div>

							{activeConversation.product ? (
								<div className={styles.convContext} data-testid="chat-product-context">
									<div className={styles.convContextThumb}>
										{activeConversation.product.imageUrl ? (
											<AppImage src={activeConversation.product.imageUrl} alt="" />
										) : null}
									</div>
									<div>
										<div className={styles.convContextName}>{activeConversation.product.title}</div>
										<div className={styles.convContextRef}>
											#{activeConversation.product.sku} ·{' '}
											{formatMoney(Number(activeConversation.product.price))}
										</div>
									</div>
									<RouterLink
										to={ROUTES.PRODUCT(activeConversation.product.slug)}
										className={styles.convContextLink}
									>
										{t('chat.openProduct')}
									</RouterLink>
								</div>
							) : null}

							<div className={styles.msgs} ref={msgsRef} data-testid="chat-messages">
								{messagesLoading ? <AppLoader /> : null}
								{messageGroups.map((group) => (
									<div key={group.label} className={styles.dayGroup}>
										<div className={styles.daySep}>{group.label}</div>
										{group.messages.map((message) => {
											const isMine = message.senderId === currentUser?.id;
											return (
												<div
													key={message.id}
													className={`${styles.msgRow} ${isMine ? styles.msgRowMe : ''}`}
													data-testid={`chat-message-${message.id}`}
												>
													{!isMine ? (
														<Avatar
															url={message.sender.avatarUrl}
															initials={message.sender.initials}
															className={styles.avatarXs}
														/>
													) : null}
													<div className={styles.stack}>
														<div
															className={`${styles.msgBubble} ${isMine ? styles.msgBubbleMe : ''}`}
														>
															<span className={styles.msgContent}>{message.content}</span>
															{isMine ? (
																<span className={styles.msgFooter}>
																	<span className={styles.msgTime}>
																		{formatMessageTime(message.createdAt, locale)}
																	</span>
																	<MessageStatus
																		isDelivered={message.isDelivered}
																		isRead={message.isRead}
																	/>
																</span>
															) : null}
														</div>
														{!isMine ? (
															<div className={styles.msgMeta}>
																<span>{formatMessageTime(message.createdAt, locale)}</span>
															</div>
														) : null}
													</div>
												</div>
											);
										})}
									</div>
								))}
								{isOtherTyping && activeConversation ? (
									<div className={styles.typing} data-testid="chat-typing-indicator">
										<div className={styles.typingDots}>
											<i />
											<i />
											<i />
										</div>
										{t('chat.typing', { name: activeOther.displayName })}
									</div>
								) : null}
							</div>

							<div className={styles.composer}>
								<div className={styles.inputBox}>
									<textarea
										className={styles.textarea}
										value={draft}
										onChange={(event) => handleDraftChange(event.target.value)}
										placeholder={t('chat.composerPlaceholder')}
										onKeyDown={(event) => {
											if (event.key === 'Enter' && !event.shiftKey) {
												event.preventDefault();
												void handleSend();
											}
										}}
										data-testid="chat-composer"
									/>
								</div>
								<button
									type="button"
									className={styles.sendBtn}
									onClick={() => void handleSend()}
									disabled={!draft.trim() || sending}
									aria-label={t('chat.send')}
									data-testid="chat-send"
								>
									<FontAwesomeIcon icon={Icons.send} />
								</button>
							</div>
						</>
					)}
				</section>

				<aside className={styles.sideInfo} data-testid="chat-side-info">
					{activeConversation && activeOther ? (
						<>
							<button
								type="button"
								className={styles.person}
								onClick={openParticipantProfile}
								disabled={!participantProfileRoute(activeOther)}
								data-testid="chat-person-profile"
							>
								<Avatar
									url={activeOther.avatarUrl}
									initials={activeOther.initials}
									className={styles.avatarLg}
								/>
								<div className={styles.personName}>{activeOther.displayName}</div>
								<div className={styles.personPresence}>
									{participantPresence(activeOther, t, locale)}
								</div>
								<div className={styles.personRole}>
									{t(`chat.role.${activeOther.role.toLowerCase()}`, {
										defaultValue: activeOther.role,
									})}{' '}
									· {t('chat.memberSince', {
										date: formatMemberSince(activeOther.memberSince, locale),
									})}
								</div>
							</button>

							<div className={styles.infoSection}>
								<div className={styles.infoTitle}>{t('chat.about')}</div>
								<div className={styles.kv}>
									<div className={styles.kvRow}>
										<span className={styles.kvKey}>{t('chat.email')}</span>
										<span className={styles.kvValue}>{activeOther.email}</span>
									</div>
									{formatLocation(
										activeOther.city,
										activeOther.country,
									) ? (
										<div className={styles.kvRow}>
											<span className={styles.kvKey}>{t('chat.location')}</span>
											<span className={styles.kvValue}>
												{formatLocation(
													activeOther.city,
													activeOther.country,
												)}
											</span>
										</div>
									) : null}
								</div>
							</div>
						</>
					) : null}
				</aside>
			</div>

			<ConfirmDialog
				open={Boolean(deleteTargetId)}
				onClose={() => setDeleteTargetId(null)}
				onConfirm={() => void handleDeleteConversation()}
				title={t('chat.deleteConversationTitle')}
				message={t('chat.deleteConversationMessage')}
				confirmLabel={t('chat.deleteConversation')}
				loading={deleting}
			/>
		</div>
	);
}
