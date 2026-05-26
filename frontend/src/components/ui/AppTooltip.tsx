import { Tooltip, TooltipProps } from '@mui/material';

export interface AppTooltipProps extends Omit<TooltipProps, 'title'> {
	title: React.ReactNode;
}

/** Anchored hint balloon — dark ink bubble with arrow (Components.html → Tooltips). */
export function AppTooltip({
	title,
	children,
	arrow = true,
	placement = 'top',
	enterDelay = 300,
	enterNextDelay = 120,
	slotProps,
	...props
}: AppTooltipProps) {
	return (
		<Tooltip
			title={title}
			arrow={arrow}
			placement={placement}
			enterDelay={enterDelay}
			enterNextDelay={enterNextDelay}
			slotProps={{
				...slotProps,
				popper: {
					...slotProps?.popper,
					modifiers: [
						{
							name: 'offset',
							options: { offset: [0, arrow ? 6 : 4] },
						},
						...(slotProps?.popper?.modifiers ?? []),
					],
				},
			}}
			{...props}
		>
			{children}
		</Tooltip>
	);
}
