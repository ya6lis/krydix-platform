import { useCallback } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useAppToast } from '@/components/ui/AppToast';
import { useNotificationSocket } from '@/hooks/useNotificationSocket';
import { NotificationEvent, Role } from '@/constants/enums';
import { UNREAD_MESSAGE_COUNT_QUERY } from '@/graphql/operations/chat';
import {
	MARK_NOTIFICATION_READ_MUTATION,
	MY_NOTIFICATIONS_QUERY,
	UNREAD_NOTIFICATION_COUNT_QUERY,
	UNREAD_ORDER_NOTIFICATION_COUNT_QUERY,
} from '@/graphql/operations/notifications';
import { router } from '@/router';
import { notificationDisplayText, notificationRoute, SUPPORT_NOTIFICATION_ACTION } from '@/utils/notificationUtils';
import type { NotificationSocketPayload } from '@/types/notification';

function toastSeverity(event: NotificationEvent): 'info' | 'success' | 'warning' | 'error' {
	switch (event) {
		case NotificationEvent.NEW_ORDER:
			return 'success';
		case NotificationEvent.ORDER_STATUS_CHANGE:
			return 'info';
		case NotificationEvent.NEW_MESSAGE:
			return 'info';
		case NotificationEvent.SUPPORT_UPDATE:
			return 'success';
		default:
			return 'info';
	}
}

export function NotificationListener() {
	const client = useApolloClient();
	const { t } = useTranslation();
	const { showToast } = useAppToast();
	const isInitialized = useAuthStore((state) => state.isInitialized);
	const user = useAuthStore((state) => state.user);
	const [markNotificationRead] = useMutation(MARK_NOTIFICATION_READ_MUTATION);

	const refetchCounts = useCallback(() => {
		void client.refetchQueries({
			include: [
				MY_NOTIFICATIONS_QUERY,
				UNREAD_NOTIFICATION_COUNT_QUERY,
				UNREAD_ORDER_NOTIFICATION_COUNT_QUERY,
				UNREAD_MESSAGE_COUNT_QUERY,
			],
		});
	}, [client]);

	const handleNotification = useCallback(
		(payload: NotificationSocketPayload) => {
			refetchCounts();
			const notification = payload.notification;
			const metadata = notification.metadata ?? {};
			const isStaffNewSupportRequest =
				(user?.role === Role.MODERATOR || user?.role === Role.ADMIN) &&
				notification.event === NotificationEvent.SUPPORT_UPDATE &&
				metadata.action === SUPPORT_NOTIFICATION_ACTION.NEW_REQUEST;

			if (isStaffNewSupportRequest) {
				return;
			}

			const { title, body } = notificationDisplayText(notification, t);
			const route = notificationRoute(notification, user?.role);

			showToast(body, toastSeverity(notification.event as NotificationEvent), {
				title,
				duration: 8000,
				onOpen: route
					? () => {
							void (async () => {
								if (!notification.isRead) {
									await markNotificationRead({ variables: { id: notification.id } });
									refetchCounts();
								}
								void router.navigate(route);
							})();
						}
					: undefined,
			});
		},
		[markNotificationRead, refetchCounts, showToast, t, user?.role],
	);

	useNotificationSocket({
		onNotification: user && isInitialized ? handleNotification : undefined,
	});

	return null;
}
