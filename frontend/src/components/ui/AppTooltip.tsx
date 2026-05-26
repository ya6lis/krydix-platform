import { Tooltip, TooltipProps } from '@mui/material';
import type { PopperProps } from '@mui/material/Popper';

export interface AppTooltipProps extends Omit<TooltipProps, 'title'> {
	title: React.ReactNode;
}

function resolvePopperSlotProps(
	popper: Partial<PopperProps> | undefined,
	arrow: boolean,
): Partial<PopperProps> {
	return {
		...popper,
		modifiers: [
			{
				name: 'offset',
				options: { offset: [0, arrow ? 6 : 4] },
			},
			...(popper?.modifiers ?? []),
		],
	};
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
				popper: resolvePopperSlotProps(
					typeof slotProps?.popper === 'function'
						? undefined
						: (slotProps?.popper as Partial<PopperProps> | undefined),
					arrow,
				),
			}}
			{...props}
		>
			{children}
		</Tooltip>
	);
}
