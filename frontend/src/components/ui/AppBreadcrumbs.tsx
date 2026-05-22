import { Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export interface AppBreadcrumbItem {
	label: string;
	/** SPA route — renders a link when present, plain text otherwise. */
	href?: string;
}

export interface AppBreadcrumbsProps {
	items: AppBreadcrumbItem[];
}

/** Breadcrumb trail — last item is emphasized as the current page (Components.html → Breadcrumbs). */
export function AppBreadcrumbs({ items }: AppBreadcrumbsProps) {
	return (
		<Box
			component="nav"
			aria-label="breadcrumb"
			sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 13, color: 'text.secondary' }}
		>
			{items.map((item, index) => {
				const isLast = index === items.length - 1;
				return (
					<Box
						key={`${item.label}-${index}`}
						sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
					>
						{item.href && !isLast ? (
							<Box
								component={RouterLink}
								to={item.href}
								sx={{
									color: 'inherit',
									textDecoration: 'none',
									'&:hover': { color: 'text.primary' },
								}}
							>
								{item.label}
							</Box>
						) : (
							<Box
								component="span"
								sx={{ color: isLast ? 'text.primary' : 'inherit', fontWeight: isLast ? 600 : 400 }}
							>
								{item.label}
							</Box>
						)}
						{!isLast && (
							<Box component="span" sx={{ opacity: 0.5 }}>
								/
							</Box>
						)}
					</Box>
				);
			})}
		</Box>
	);
}
