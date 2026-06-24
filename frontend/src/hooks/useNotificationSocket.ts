import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { NOTIFICATION_SOCKET_EVENT } from '@/constants/notificationEvents';
import { useAuthStore } from '@/store/authStore';
import type { NotificationSocketPayload } from '@/types/notification';

const SOCKET_URL =
	import.meta.env.VITE_API_URL ??
	import.meta.env.VITE_GRAPHQL_URL?.replace(/\/graphql$/, '') ??
	'http://localhost:5000';

interface UseNotificationSocketOptions {
	onNotification?: (payload: NotificationSocketPayload) => void;
}

export function useNotificationSocket({ onNotification }: UseNotificationSocketOptions) {
	const accessToken = useAuthStore((state) => state.accessToken);
	const socketRef = useRef<Socket | null>(null);
	const onNotificationRef = useRef(onNotification);

	useEffect(() => {
		onNotificationRef.current = onNotification;
	}, [onNotification]);

	useEffect(() => {
		if (!accessToken) return undefined;

		const socket = io(SOCKET_URL, {
			auth: { token: accessToken },
			transports: ['websocket', 'polling'],
		});
		socketRef.current = socket;

		socket.on(NOTIFICATION_SOCKET_EVENT.NEW, (payload: NotificationSocketPayload) => {
			onNotificationRef.current?.(payload);
		});

		return () => {
			socket.disconnect();
			socketRef.current = null;
		};
	}, [accessToken]);
}
