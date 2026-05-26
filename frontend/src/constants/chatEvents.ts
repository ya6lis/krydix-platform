export const CHAT_SOCKET_EVENT = {
	JOIN_CONVERSATIONS: 'chat:join',
	LEAVE_CONVERSATIONS: 'chat:leave',
	MESSAGE_NEW: 'chat:message',
	CONVERSATION_UPDATED: 'chat:conversation_updated',
	TYPING: 'chat:typing',
} as const;

export type ChatFilter = 'ALL' | 'BUYERS' | 'MODS' | 'UNREAD';

export const CHAT_FILTER = {
	ALL: 'ALL',
	BUYERS: 'BUYERS',
	MODS: 'MODS',
	UNREAD: 'UNREAD',
} as const;
