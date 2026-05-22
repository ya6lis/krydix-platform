import { Tabs, Tab, Box } from '@mui/material';

export interface AppTabItem {
	value: string;
	label: string;
	/** Optional count badge rendered after the label. */
	count?: number;
}

export interface AppTabsProps {
	tabs: AppTabItem[];
	value: string;
	onChange: (value: string) => void;
}

/** Underlined tab strip with optional count badges (Components.html → Tabs). */
export function AppTabs({ tabs, value, onChange }: AppTabsProps) {
	return (
		<Tabs
			value={value}
			onChange={(_, v) => onChange(v as string)}
			variant="scrollable"
			scrollButtons="auto"
			sx={{ borderBottom: '1px solid', borderColor: 'divider', minHeight: 48 }}
		>
			{tabs.map((tab) => (
				<Tab
					key={tab.value}
					value={tab.value}
					iconPosition="end"
					icon={
						tab.count !== undefined ? (
							<Box
								component="span"
								sx={{
									fontSize: 10.5,
									fontWeight: 700,
									px: 0.875,
									py: 0.25,
									borderRadius: 999,
									bgcolor: value === tab.value ? 'text.primary' : 'action.hover',
									color: value === tab.value ? 'background.paper' : 'text.secondary',
								}}
							>
								{tab.count}
							</Box>
						) : undefined
					}
					label={tab.label}
				/>
			))}
		</Tabs>
	);
}
