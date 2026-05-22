import { Box, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { tokens } from '@/theme';

export type NotificationTone = 'order' | 'message' | 'mod' | 'verif' | 'warn';

const TONE_STYLES: Record<NotificationTone, { bg: string; fg: string }> = {
	order: { bg: tokens.cyanSoft, fg: tokens.cyanInk },
	message: { bg: tokens.accentSoft, fg: tokens.accentInk },
	mod: { bg: tokens.cyanSoft, fg: tokens.cyanInk },
	verif: { bg: tokens.amberSoft, fg: tokens.amberInk },
	warn: { bg: tokens.coralSoft, fg: tokens.coralInk },
};

export interface NotificationItemProps {
	icon: IconDefinition;
	tone?: NotificationTone;
	title: React.ReactNode;
	body?: React.ReactNode;
	time: string;
	unread?: boolean;
	onClick?: () => void;
}

/** Single notification row for the topbar dropdown (Components.html → Notification item). */
export function NotificationItem({
	icon,
	tone = 'order',
	title,
	body,
	time,
	unread = false,
	onClick,
}: NotificationItemProps) {
	const style = TONE_STYLES[tone];

	return (
		<Box
			onClick={onClick}
			sx={{
				display: 'grid',
				gridTemplateColumns: '32px 1fr auto',
				gap: 1.5,
				alignItems: 'flex-start',
				px: 2.5,
				py: 1.5,
				cursor: onClick ? 'pointer' : 'default',
				borderBottom: '1px solid',
				borderColor: 'divider',
				bgcolor: unread ? 'primary.light' : 'transparent',
				'&:hover': { bgcolor: unread ? 'primary.light' : 'background.default' },
			}}
		>
			<Box
				sx={{
					width: 32,
					height: 32,
					borderRadius: 1.5,
					display: 'grid',
					placeItems: 'center',
					bgcolor: style.bg,
					color: style.fg,
					fontSize: 13,
				}}
			>
				<FontAwesomeIcon icon={icon} />
			</Box>
			<Box sx={{ minWidth: 0 }}>
				<Typography sx={{ fontSize: 13, lineHeight: 1.45, color: 'text.primary' }}>
					{title}
				</Typography>
				{body && (
					<Typography variant="body2" sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.25 }}>
						{body}
					</Typography>
				)}
				<Typography
					variant="caption"
					sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.5, display: 'block' }}
				>
					{time}
				</Typography>
			</Box>
			{unread && (
				<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', mt: 1 }} />
			)}
		</Box>
	);
}
