import { Box, BoxProps, Stack, Typography } from '@mui/material';

export interface PageSectionWrapperProps {
	title?: string;
	subtitle?: string;
	actions?: React.ReactNode;
	children: React.ReactNode;
	sx?: BoxProps['sx'];
}

export function PageSectionWrapper({
	title,
	subtitle,
	actions,
	children,
	sx,
}: PageSectionWrapperProps) {
	const hasHeader = title || subtitle || actions;

	return (
		<Box sx={sx}>
			{hasHeader && (
				<Stack
					direction="row"
					alignItems="flex-start"
					justifyContent="space-between"
					mb={3}
					gap={2}
					flexWrap="wrap"
				>
					<Box>
						{title && (
							<Typography variant="h5" fontWeight={700}>
								{title}
							</Typography>
						)}
						{subtitle && (
							<Typography variant="body2" color="text.secondary" mt={0.5}>
								{subtitle}
							</Typography>
						)}
					</Box>
					{actions && <Box flexShrink={0}>{actions}</Box>}
				</Stack>
			)}
			{children}
		</Box>
	);
}
