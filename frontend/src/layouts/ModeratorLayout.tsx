import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';

export default function ModeratorLayout() {
	return (
		<Box sx={{ minHeight: '100vh', display: 'flex' }}>
			{/* TODO: Moderator sidebar */}
			<Box component="main" sx={{ flex: 1 }}>
				<Outlet />
			</Box>
		</Box>
	);
}
