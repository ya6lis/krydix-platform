import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { CHAT_SOCKET_EVENT } from '@/constants/chatEvents';
import { useAuthStore } from '@/store/authStore';
import type { ChatMessage } from '@/types/chat';

const SOCKET_URL =
	import.meta.env.VITE_API_URL ??
	import.meta.env.VITE_GRAPHQL_URL?.replace(/\/graphql$/, '') ??
	'http://localhost:5000';

export interface ConversationUpdatedPayload {
	conversationId: string;
	lastMessage?: ChatMessage;
	unreadCount?: number;
	readerId?: string;
	deliveredBy?: string;
}

export interface TypingPayload {
	conversationId: string;
	userId: string;
}

interface UseChatSocketOptions {
	conversationIds: string[];
	onMessage?: (message: ChatMessage) => void;
	onConversationUpdated?: (payload: ConversationUpdatedPayload) => void;
	onTyping?: (payload: TypingPayload) => void;
}

export function useChatSocket({
	conversationIds,
	onMessage,
	onConversationUpdated,
	onTyping,
}: UseChatSocketOptions) {
	const accessToken = useAuthStore((state) => state.accessToken);
	const socketRef = useRef<Socket | null>(null);
	const onMessageRef = useRef(onMessage);
	const onConversationUpdatedRef = useRef(onConversationUpdated);
	const onTypingRef = useRef(onTyping);

	useEffect(() => {
		onMessageRef.current = onMessage;
	}, [onMessage]);

	useEffect(() => {
		onConversationUpdatedRef.current = onConversationUpdated;
	}, [onConversationUpdated]);

	useEffect(() => {
		onTypingRef.current = onTyping;
	}, [onTyping]);

	useEffect(() => {
		if (!accessToken) return undefined;

		const socket = io(SOCKET_URL, {
			auth: { token: accessToken },
			transports: ['websocket', 'polling'],
		});
		socketRef.current = socket;

		socket.on('connect', () => {
			if (conversationIds.length > 0) {
				socket.emit(CHAT_SOCKET_EVENT.JOIN_CONVERSATIONS, conversationIds);
			}
		});

		socket.on(CHAT_SOCKET_EVENT.MESSAGE_NEW, (message: ChatMessage) => {
			onMessageRef.current?.(message);
		});

		socket.on(CHAT_SOCKET_EVENT.CONVERSATION_UPDATED, (payload: ConversationUpdatedPayload) => {
			onConversationUpdatedRef.current?.(payload);
		});

		socket.on(CHAT_SOCKET_EVENT.TYPING, (payload: TypingPayload) => {
			onTypingRef.current?.(payload);
		});

		return () => {
			socket.disconnect();
			socketRef.current = null;
		};
	}, [accessToken]);

	useEffect(() => {
		const socket = socketRef.current;
		if (!socket?.connected || conversationIds.length === 0) return;
		socket.emit(CHAT_SOCKET_EVENT.JOIN_CONVERSATIONS, conversationIds);
	}, [conversationIds]);

	const emitTyping = (conversationId: string) => {
		socketRef.current?.emit(CHAT_SOCKET_EVENT.TYPING, { conversationId });
	};

	return { emitTyping };
}
