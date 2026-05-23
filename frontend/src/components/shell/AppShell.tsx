import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import AppSidebar from './AppSidebar';
import AppNavbar, { type Breadcrumb } from './AppNavbar';
import { tokens } from '@/theme';

interface AppShellProps {
	breadcrumbs?: Breadcrumb[];
}

export default function AppShell({ breadcrumbs }: AppShellProps) {
	return (
		<Box sx={{ display: 'flex', minHeight: '100vh', background: tokens.bg }}>
			{/* sticky sidebar */}
			<AppSidebar />

			{/* main column */}
			<Box
				sx={{
					flex: 1,
					minWidth: 0,
					display: 'flex',
					flexDirection: 'column',
				}}
			>
				<AppNavbar breadcrumbs={breadcrumbs} />
				<Box
					component="main"
					sx={{
						flex: 1,
						padding: '32px 36px',
						overflowX: 'hidden',
					}}
				>
					<Outlet />
				</Box>
			</Box>
		</Box>
	);
}
