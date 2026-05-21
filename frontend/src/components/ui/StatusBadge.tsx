import { Chip, ChipProps } from '@mui/material';

type BadgeColor = ChipProps['color'];

const STATUS_COLORS: Record<string, BadgeColor> = {
	DRAFT: 'default',
	PENDING: 'warning',
	PENDING_MODERATION: 'warning',
	UNDER_REVIEW: 'info',
	APPROVED: 'success',
	ENABLED: 'success',
	PAID: 'success',
	DELIVERED: 'success',
	RESOLVED: 'success',
	COMPLETED: 'success',
	REJECTED: 'error',
	BLOCKED: 'error',
	FAILED: 'error',
	NOT_RECEIVED: 'error',
	CANCELLED: 'error',
	ARCHIVED: 'default',
	DISABLED: 'default',
	RETURNED: 'default',
	CONFIRMED: 'info',
	SHIPPED: 'info',
	AUTHORIZED: 'info',
	PACKED: 'info',
	SENT: 'info',
	IN_TRANSIT: 'info',
	NEW: 'info',
	IN_REVIEW: 'warning',
	REFUNDED: 'warning',
	VALIDATED: 'info',
	PROCESSING: 'info',
};

export interface StatusBadgeProps {
	status: string;
	label: string;
	size?: ChipProps['size'];
}

export function StatusBadge({ status, label, size = 'small' }: StatusBadgeProps) {
	const color: BadgeColor = STATUS_COLORS[status] ?? 'default';
	return <Chip label={label} color={color} size={size} />;
}
