import { Box } from '@mui/material';
import { tokens } from '@/theme';

type StatusTone = 'cyan' | 'amber' | 'coral' | 'accent' | 'neutral';

interface ToneStyle {
	bg: string;
	fg: string;
	dot: string;
}

const TONE_STYLES: Record<StatusTone, ToneStyle> = {
	cyan: { bg: tokens.cyanSoft, fg: tokens.cyanInk, dot: tokens.cyan },
	amber: { bg: tokens.amberSoft, fg: tokens.amberInk, dot: tokens.amber },
	coral: { bg: tokens.coralSoft, fg: tokens.coralInk, dot: tokens.coral },
	accent: { bg: tokens.accentSoft, fg: tokens.accentInk, dot: tokens.accent },
	neutral: { bg: tokens.surface2, fg: tokens.ink2, dot: tokens.ink3 },
};

/** Maps every lifecycle status to a colored-badge tone (see Components.html). */
const STATUS_TONES: Record<string, StatusTone> = {
	// cyan — positive / completed
	PAID: 'cyan',
	APPROVED: 'cyan',
	ENABLED: 'cyan',
	DELIVERED: 'cyan',
	COMPLETED: 'cyan',
	RESOLVED: 'cyan',
	IN_TRANSIT: 'cyan',
	VALIDATED: 'cyan',
	CLOSED: 'neutral',
	REQUESTED: 'amber',
	// amber — in-progress / awaiting
	PENDING: 'amber',
	DRAFT: 'amber',
	UNDER_REVIEW: 'amber',
	AUTHORIZED: 'amber',
	CONFIRMED: 'amber',
	PACKED: 'amber',
	SENT: 'amber',
	SHIPPED: 'amber',
	OPEN: 'amber',
	IN_PROGRESS: 'accent',
	IN_REVIEW: 'amber',
	ACKNOWLEDGED: 'cyan',
	PLANNED: 'accent',
	DISMISSED: 'neutral',
	PROCESSING: 'amber',
	// coral — negative / terminal
	REFUNDED: 'coral',
	REJECTED: 'coral',
	BLOCKED: 'coral',
	CANCELLED: 'coral',
	FAILED: 'coral',
	NOT_RECEIVED: 'coral',
	RETURNED: 'coral',
	ARCHIVED: 'coral',
	DISABLED: 'coral',
	// accent — moderation
	PENDING_MODERATION: 'accent',
	PUBLISHED: 'cyan',
};

export interface StatusBadgeProps {
	/** Status enum key, e.g. `DELIVERED`, `PENDING_MODERATION`. */
	status: string;
	/** Human-readable, i18n-translated label. */
	label: string;
	size?: 'small' | 'medium';
}

export function StatusBadge({ status, label, size = 'small' }: StatusBadgeProps) {
	const tone = STATUS_TONES[status?.toUpperCase()] ?? 'neutral';
	const style = TONE_STYLES[tone];
	const medium = size === 'medium';

	return (
		<Box
			component="span"
			sx={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: 0.75,
				bgcolor: style.bg,
				color: style.fg,
				fontSize: medium ? '12.5px' : '11.5px',
				fontWeight: 700,
				lineHeight: 1.4,
				px: medium ? 1.5 : 1.25,
				py: medium ? 0.625 : 0.5,
				borderRadius: 999,
				whiteSpace: 'nowrap',
			}}
		>
			<Box
				component="span"
				sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: style.dot, flexShrink: 0 }}
			/>
			{label}
		</Box>
	);
}
