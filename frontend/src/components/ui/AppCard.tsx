import { Card, CardProps, Box, Typography, Divider } from '@mui/material';

export interface AppCardProps extends Omit<CardProps, 'title'> {
	/** Optional header title — renders the bordered card-head region. */
	title?: React.ReactNode;
	subtitle?: React.ReactNode;
	/** Action node aligned to the right of the header. */
	headerAction?: React.ReactNode;
	/** Drop the default 24px body padding. */
	disablePadding?: boolean;
	children: React.ReactNode;
}

/** Surface container — matches `.card` / `.card-head` / `.card-pad` in the design system. */
export function AppCard({
	title,
	subtitle,
	headerAction,
	disablePadding = false,
	children,
	...props
}: AppCardProps) {
	const hasHeader = Boolean(title || subtitle || headerAction);

	return (
		<Card {...props}>
			{hasHeader && (
				<>
					<Box
						sx={{
							display: 'flex',
							alignItems: 'flex-start',
							justifyContent: 'space-between',
							gap: 2,
							px: 3,
							py: 2.5,
						}}
					>
						<Box>
							{title && (
								<Typography variant="h6" sx={{ fontSize: 17, fontWeight: 700 }}>
									{title}
								</Typography>
							)}
							{subtitle && (
								<Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: 12.5 }}>
									{subtitle}
								</Typography>
							)}
						</Box>
						{headerAction && <Box sx={{ flexShrink: 0 }}>{headerAction}</Box>}
					</Box>
					<Divider />
				</>
			)}
			<Box sx={{ p: disablePadding ? 0 : 3 }}>{children}</Box>
		</Card>
	);
}
