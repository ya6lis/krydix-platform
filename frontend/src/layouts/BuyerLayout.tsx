import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';

export default function BuyerLayout() {
	return (
		<Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
			{/* TODO: Header + buyer sidebar */}
			<Box component="main" sx={{ flex: 1 }}>
				<Outlet />
			</Box>
		</Box>
	);
}
