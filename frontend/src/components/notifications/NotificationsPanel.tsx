import { Link } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslation } from 'react-i18next';
import { NotificationItem } from '@/components/ui/NotificationItem';
import { Icons } from '@/constants/icons';
import { NotificationEvent } from '@/constants/enums';
import { ROUTES } from '@/constants/routes';
import { tokens } from '@/theme';
import {
	filterNotifications,
	formatNotificationTime,
	NOTIFICATION_TAB_KEYS,
	notificationDisplayText,
	notificationIcon,
	notificationTone,
	type NotificationTabKey,
} from '@/utils/notificationUtils';
import type { AppNotification } from '@/types/notification';

const NOTIF_TABS = NOTIFICATION_TAB_KEYS.map((key) => `shell.notif.tab.${key}`);

export interface NotificationsPanelProps {
	notifications: AppNotification[];
	activeTab: NotificationTabKey;
	onTabChange: (tab: NotificationTabKey) => void;
	unreadCount: number;
	locale: string;
	onMarkAllRead: () => void;
	markingAllRead: boolean;
	onNotificationClick: (notification: AppNotification) => void;
	onDeleteNotification?: (id: string) => void;
	deletingId?: string | null;
	variant?: 'dropdown' | 'page';
	showFooter?: boolean;
	maxHeight?: number | 'none';
}

export function NotificationsPanel({
	notifications,
	activeTab,
	onTabChange,
	unreadCount,
	locale,
	onMarkAllRead,
	markingAllRead,
	onNotificationClick,
	onDeleteNotification,
	deletingId = null,
	variant = 'dropdown',
	showFooter = variant === 'dropdown',
	maxHeight = variant === 'dropdown' ? 380 : 'none',
}: NotificationsPanelProps) {
	const { t } = useTranslation();
	const visibleNotifications = filterNotifications(notifications, activeTab);
	const activeTabIndex = NOTIFICATION_TAB_KEYS.indexOf(activeTab);

	return (
		<Box>
			<Box
				sx={{
					padding: variant === 'dropdown' ? '16px 18px' : '22px 22px 16px',
					display: 'flex',
					alignItems: 'flex-start',
					justifyContent: 'space-between',
					gap: 2,
				}}
			>
				<Box>
					<Typography sx={{ fontWeight: 700, fontSize: variant === 'dropdown' ? 15 : 17 }}>
						{variant === 'dropdown' ? t('shell.notif.title') : t('notificationsPage.listTitle')}
					</Typography>
					<Typography sx={{ fontSize: 12, color: tokens.ink3, mt: '2px' }}>
						{t('shell.notif.unread', { count: unreadCount })}
					</Typography>
				</Box>
				<Box
					component="button"
					type="button"
					onClick={onMarkAllRead}
					disabled={markingAllRead || unreadCount === 0}
					sx={{
						border: 'none',
						background: 'transparent',
						fontSize: 12,
						fontWeight: 600,
						color: tokens.ink2,
						cursor: 'pointer',
						padding: '4px 8px',
						borderRadius: 6,
						display: 'flex',
						alignItems: 'center',
						gap: '5px',
						transition: 'background 120ms',
						flexShrink: 0,
						'&:hover': { background: tokens.accentSoft },
						'&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
					}}
				>
					<FontAwesomeIcon icon={Icons.check} style={{ width: 12 }} />
					{t('shell.notif.markAllRead')}
				</Box>
			</Box>

			<Box
				sx={{
					display: 'flex',
					gap: '4px',
					padding: variant === 'dropdown' ? '0 18px 12px' : '0 22px 16px',
					borderBottom: `1px solid ${tokens.line}`,
					flexWrap: 'wrap',
				}}
			>
				{NOTIF_TABS.map((tab, i) => (
					<Box
						key={tab}
						component="button"
						type="button"
						onClick={() => onTabChange(NOTIFICATION_TAB_KEYS[i]!)}
						sx={{
							border: 'none',
							padding: '5px 10px',
							borderRadius: 7,
							fontSize: 12,
							fontWeight: 500,
							cursor: 'pointer',
							color: activeTabIndex === i ? '#fff' : tokens.ink2,
							background: activeTabIndex === i ? tokens.ink1 : 'transparent',
							transition: 'background 120ms, color 120ms',
							'&:hover':
								activeTabIndex !== i ? { background: tokens.surface2, color: tokens.ink2 } : {},
						}}
					>
						{t(tab)}
					</Box>
				))}
			</Box>

			<Box
				sx={{
					maxHeight: maxHeight === 'none' ? undefined : maxHeight,
					overflowY: maxHeight === 'none' ? undefined : 'auto',
				}}
			>
				{visibleNotifications.length === 0 ? (
					<Box
						sx={{
							padding: variant === 'dropdown' ? '32px 18px' : '48px 22px',
							textAlign: 'center',
							color: tokens.ink3,
							fontSize: 13,
						}}
					>
						{t('shell.notif.empty')}
					</Box>
				) : (
					visibleNotifications.map((notification) => {
						const event = notification.event as NotificationEvent;
						const copy = notificationDisplayText(notification, t);
						return (
							<NotificationItem
								key={notification.id}
								icon={notificationIcon(event)}
								tone={notificationTone(event)}
								title={copy.title}
								body={copy.body}
								time={formatNotificationTime(notification.createdAt, locale)}
								unread={!notification.isRead}
								onClick={() => onNotificationClick(notification)}
								showDelete={Boolean(onDeleteNotification)}
								onDelete={
									onDeleteNotification ? () => onDeleteNotification(notification.id) : undefined
								}
								deleting={deletingId === notification.id}
								deleteLabel={t('notificationsPage.delete')}
							/>
						);
					})
				)}
			</Box>

			{showFooter && (
				<Box
					sx={{
						padding: '12px 18px',
						borderTop: `1px solid ${tokens.line}`,
					}}
				>
					<Box
						component={Link}
						to={ROUTES.NOTIFICATIONS}
						sx={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: '6px',
							fontSize: 13,
							fontWeight: 600,
							color: tokens.accent,
							textDecoration: 'none',
							'&:hover': { textDecoration: 'underline' },
						}}
					>
						{t('shell.notif.viewAll')}
						<FontAwesomeIcon icon={Icons.chevronRight} style={{ width: 13 }} />
					</Box>
				</Box>
			)}
		</Box>
	);
}
