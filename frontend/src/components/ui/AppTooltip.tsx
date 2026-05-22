import { Tooltip, TooltipProps } from '@mui/material';

export interface AppTooltipProps extends Omit<TooltipProps, 'title'> {
	title: React.ReactNode;
}

/** Anchored hint balloon — dark ink bubble with arrow (Components.html → Tooltips). */
export function AppTooltip({ title, children, arrow = true, ...props }: AppTooltipProps) {
	return (
		<Tooltip title={title} arrow={arrow} {...props}>
			{children}
		</Tooltip>
	);
}
