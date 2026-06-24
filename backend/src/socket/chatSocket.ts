import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { decodeAccessToken } from '../utils/jwt.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { CHAT_SOCKET_EVENT } from '../constants/chatEvents.js';

let io: Server | null = null;

export function initChatSocket(httpServer: HttpServer): Server {
	io = new Server(httpServer, {
		cors: {
			origin: env.SOCKET_IO_CORS_ORIGIN.split(',').map((origin) => origin.trim()),
			credentials: true,
		},
	});

	io.use((socket, next) => {
		const token = socket.handshake.auth?.token;
		if (typeof token !== 'string' || !token) {
			return next(new Error('UNAUTHENTICATED'));
		}
		const user = decodeAccessToken(token);
		if (!user) {
			return next(new Error('UNAUTHENTICATED'));
		}
		socket.data.userId = user.userId;
		return next();
	});

	io.on('connection', (socket) => {
		const userId = socket.data.userId as string;
		logger.info({ userId, socketId: socket.id }, 'Chat socket connected');

		socket.join(userRoom(userId));

		socket.on(CHAT_SOCKET_EVENT.JOIN_CONVERSATIONS, (conversationIds: unknown) => {
			if (!Array.isArray(conversationIds)) return;
			for (const id of conversationIds) {
				if (typeof id === 'string') {
					socket.join(conversationRoom(id));
				}
			}
		});

		socket.on(CHAT_SOCKET_EVENT.LEAVE_CONVERSATIONS, (conversationIds: unknown) => {
			if (!Array.isArray(conversationIds)) return;
			for (const id of conversationIds) {
				if (typeof id === 'string') {
					socket.leave(conversationRoom(id));
				}
			}
		});

		socket.on(CHAT_SOCKET_EVENT.TYPING, (payload: unknown) => {
			if (!payload || typeof payload !== 'object') return;
			const conversationId = (payload as { conversationId?: string }).conversationId;
			if (!conversationId) return;
			socket.to(conversationRoom(conversationId)).emit(CHAT_SOCKET_EVENT.TYPING, {
				conversationId,
				userId,
			});
		});

		socket.on('disconnect', () => {
			logger.info({ userId, socketId: socket.id }, 'Chat socket disconnected');
		});
	});

	return io;
}

function conversationRoom(conversationId: string): string {
	return `conversation:${conversationId}`;
}

function userRoom(userId: string): string {
	return `user:${userId}`;
}

export function emitChatEvent(conversationId: string, event: string, payload: unknown): void {
	io?.to(conversationRoom(conversationId)).emit(event, payload);
}

export function emitUserNotification(userId: string, event: string, payload: unknown): void {
	io?.to(userRoom(userId)).emit(event, payload);
}

export function getChatIo(): Server | null {
	return io;
}
