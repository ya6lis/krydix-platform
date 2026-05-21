import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';

export default function PublicLayout() {
	return (
		<Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
			{/* TODO: Header */}
			<Box component="main" sx={{ flex: 1 }}>
				<Outlet />
			</Box>
			{/* TODO: Footer */}
		</Box>
	);
}
