import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export interface AppMenuItem {
	label: string;
	icon?: IconDefinition;
	onClick: () => void;
	/** Renders the item in the error tone (e.g. delete actions). */
	danger?: boolean;
	disabled?: boolean;
}

export interface AppMenuProps {
	anchorEl: HTMLElement | null;
	open: boolean;
	onClose: () => void;
	items: AppMenuItem[];
}

/** Controlled dropdown menu anchored to a trigger element (Components.html → Dropdown menu). */
export function AppMenu({ anchorEl, open, onClose, items }: AppMenuProps) {
	return (
		<Menu
			anchorEl={anchorEl}
			open={open}
			onClose={onClose}
			anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
			transformOrigin={{ vertical: 'top', horizontal: 'right' }}
		>
			{items.map((item) => (
				<MenuItem
					key={item.label}
					disabled={item.disabled}
					onClick={() => {
						item.onClick();
						onClose();
					}}
					sx={{ color: item.danger ? 'error.main' : 'text.primary', fontSize: 13.5, gap: 1 }}
				>
					{item.icon && (
						<ListItemIcon sx={{ color: 'inherit', minWidth: 'auto !important' }}>
							<FontAwesomeIcon icon={item.icon} fixedWidth />
						</ListItemIcon>
					)}
					<ListItemText
						primaryTypographyProps={{ fontSize: 13.5, fontWeight: 500 }}
						primary={item.label}
					/>
				</MenuItem>
			))}
		</Menu>
	);
}
