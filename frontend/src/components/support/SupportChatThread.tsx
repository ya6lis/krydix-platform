import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { Icons } from '@/constants/icons';
import { AppLoader } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { useChatSocket } from '@/hooks/useChatSocket';
import {
	MARK_CONVERSATION_READ_MUTATION,
	MESSAGES_QUERY,
	SEND_MESSAGE_MUTATION,
} from '@/graphql/operations/chat';
import type { ChatMessage, ConversationDetail, ConversationParticipant } from '@/types/chat';
import { formatMessageTime, groupMessagesByDay } from '@/pages/chat/chatUtils';
import styles from './SupportChatThread.module.scss';

const MESSAGE_PAGE_SIZE = 100;

interface SupportChatThreadProps {
	conversation: ConversationDetail;
	onConversationUpdated?: () => void;
}

function Avatar({
	participant,
	className = '',
}: {
	participant: ConversationParticipant;
	className?: string;
}) {
	return (
		<div className={`${styles.avatar} ${className}`.trim()} aria-hidden>
			{participant.avatarUrl ? (
				<img src={participant.avatarUrl} alt="" className={styles.avatarImage} />
			) : (
				participant.initials
			)}
		</div>
	);
}

export function SupportChatThread({ conversation, onConversationUpdated }: SupportChatThreadProps) {
	const { t, i18n } = useTranslation();
	const currentUser = useAuthStore((state) => state.user);
	const locale = i18n.language;

	const [draft, setDraft] = useState('');
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const msgsRef = useRef<HTMLDivElement>(null);

	const { loading: messagesLoading, refetch: refetchMessages } = useQuery<{
		messages: { items: ChatMessage[] };
	}>(MESSAGES_QUERY, {
		variables: { conversationId: conversation.id, page: 1, pageSize: MESSAGE_PAGE_SIZE },
		onCompleted: (data) => setMessages(data.messages.items),
	});

	const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE_MUTATION);
	const [markRead] = useMutation(MARK_CONVERSATION_READ_MUTATION);

	const handleSocketMessage = useCallback(
		(message: ChatMessage) => {
			if (message.conversationId !== conversation.id) return;
			setMessages((prev) => (prev.some((item) => item.id === message.id) ? prev : [...prev, message]));
			onConversationUpdated?.();
		},
		[conversation.id, onConversationUpdated],
	);

	useChatSocket({
		conversationIds: [conversation.id],
		onMessage: handleSocketMessage,
		onConversationUpdated: () => onConversationUpdated?.(),
	});

	useEffect(() => {
		void markRead({ variables: { conversationId: conversation.id } });
	}, [conversation.id, markRead]);

	useEffect(() => {
		msgsRef.current?.scrollTo({ top: msgsRef.current.scrollHeight, behavior: 'smooth' });
	}, [messages]);

	const handleSend = async () => {
		const trimmed = draft.trim();
		if (!trimmed || sending) return;
		setDraft('');
		await sendMessage({ variables: { conversationId: conversation.id, content: trimmed } });
		await refetchMessages();
		onConversationUpdated?.();
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			void handleSend();
		}
	};

	const groupedMessages = groupMessagesByDay(messages, locale);
	const staffParticipant = conversation.otherParticipant;
	const waitingForStaff = !staffParticipant;

	return (
		<div className={styles.thread}>
			<div className={styles.head}>
				{staffParticipant ? (
					<Avatar participant={staffParticipant} />
				) : (
					<div className={styles.avatarPlaceholder}>
						<FontAwesomeIcon icon={Icons.chat} />
					</div>
				)}
				<div className={styles.headInfo}>
					<div className={styles.headName}>
						{staffParticipant
							? staffParticipant.displayName
							: t('support.chat.waitingForTeam')}
					</div>
					<div className={styles.headSub}>
						{staffParticipant
							? staffParticipant.isOnline
								? t('support.chat.staffOnline')
								: t('support.chat.staffOffline')
							: t('support.chat.queueHint')}
					</div>
				</div>
				{conversation.supportMeta?.subject ? (
					<span className={styles.subjectBadge}>{conversation.supportMeta.subject}</span>
				) : null}
			</div>

			{waitingForStaff ? (
				<div className={styles.waitingBanner}>
					<FontAwesomeIcon icon={Icons.info} />
					<span>{t('support.chat.waitingBanner')}</span>
				</div>
			) : null}

			<div className={styles.messages} ref={msgsRef}>
				{messagesLoading && messages.length === 0 ? <AppLoader /> : null}
				{groupedMessages.map((group) => (
					<div key={group.label}>
						<div className={styles.daySep}>{group.label}</div>
						{group.messages.map((message) => {
							const isMine = message.senderId === currentUser?.id;
							return (
								<div
									key={message.id}
									className={`${styles.messageRow} ${isMine ? styles.messageRowMine : ''}`}
								>
									{!isMine ? <Avatar participant={message.sender} className={styles.messageAvatar} /> : null}
									<div className={styles.messageStack}>
										<div
											className={`${styles.messageBubble} ${isMine ? styles.messageBubbleMine : styles.messageBubbleOther}`}
										>
											{message.content}
										</div>
										<div className={styles.messageMeta}>
											{formatMessageTime(message.createdAt, locale)}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				))}
			</div>

			<div className={styles.composer}>
				<div className={styles.inputBox}>
					<textarea
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						onKeyDown={handleKeyDown}
						placeholder={t('support.composer.placeholder')}
						rows={1}
						disabled={conversation.supportMeta?.status === 'RESOLVED' || conversation.supportMeta?.status === 'CLOSED'}
					/>
					<div className={styles.composerHint}>{t('support.composer.hint')}</div>
				</div>
				<button
					type="button"
					className={styles.sendButton}
					aria-label={t('support.composer.send')}
					onClick={() => void handleSend()}
					disabled={
						sending ||
						!draft.trim() ||
						conversation.supportMeta?.status === 'RESOLVED' ||
						conversation.supportMeta?.status === 'CLOSED'
					}
				>
					<FontAwesomeIcon icon={Icons.send} />
				</button>
			</div>
		</div>
	);
}
