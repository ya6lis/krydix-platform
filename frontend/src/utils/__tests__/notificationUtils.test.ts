import {
	extractOrderLabel,
	extractOrderStatus,
	notificationDisplayText,
} from '../notificationUtils';
import { NotificationEvent } from '@/constants/enums';
import type { AppNotification } from '@/types/notification';

const t = (key: string, opts?: Record<string, unknown>) => {
	if (opts?.order && opts?.status) return `Order #${opts.order} is now ${opts.status}.`;
	if (opts?.order) return `Order #${opts.order} was placed.`;
	if (opts?.name) return `Message from ${opts.name}`;
	if (key.startsWith('status.order.')) return String(opts?.defaultValue ?? key);
	return key;
};

function mockNotification(overrides: Partial<AppNotification> & Pick<AppNotification, 'body'>): AppNotification {
	return {
		id: 'notif-1',
		event: NotificationEvent.ORDER_STATUS_CHANGE,
		title: 'Test notification',
		isRead: false,
		metadata: null,
		createdAt: '2026-01-01T00:00:00.000Z',
		...overrides,
	};
}

describe('notificationUtils order labels', () => {
	it('uses metadata.orderLabel when available', () => {
		const notification = mockNotification({
			body: 'fallback',
			metadata: { orderLabel: 'AB12CD34', orderId: 'full-id', status: 'SHIPPED' },
		});

		expect(extractOrderLabel(notification)).toBe('AB12CD34');
	});

	it('falls back to parsing body when metadata is missing', () => {
		const notification = mockNotification({
			body: 'Your order #1 has been placed successfully.',
			metadata: null,
		});

		expect(extractOrderLabel(notification)).toBe('1');
	});

	it('renders order status text from metadata', () => {
		const notification = mockNotification({
			event: NotificationEvent.ORDER_STATUS_CHANGE,
			title: 'Order status updated',
			body: 'Order #AB12CD34 is now shipped.',
			metadata: { orderLabel: 'AB12CD34', status: 'SHIPPED' },
		});

		const copy = notificationDisplayText(notification, t);
		expect(copy.body).toBe('Order #AB12CD34 is now shipped.');
	});
});

describe('extractOrderStatus', () => {
	it('parses status from legacy body text', () => {
		const notification = mockNotification({
			body: 'Your order #1 is on its way!',
			metadata: null,
		});

		expect(extractOrderStatus(notification, t)).toBeNull();
	});
});
