import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Role } from '@/constants/enums';
import { ROUTES } from '@/constants/routes';
import BuyerSettingsPage from '@/pages/buyer/BuyerSettingsPage';
import AdminPlatformPage from '@/pages/admin/AdminPlatformPage';

const SellerSettingsPlaceholder = () => (
	<div style={{ padding: 32 }}>
		<h2>Seller Settings</h2>
		<p>Coming soon.</p>
	</div>
);

/** Single settings route — content depends on the user's role. */
export default function SettingsPage() {
	const user = useAuthStore((s) => s.user);

	if (!user) {
		return <Navigate to={ROUTES.LOGIN} replace />;
	}

	switch (user.role) {
		case Role.ADMIN:
			return <AdminPlatformPage />;
		case Role.SELLER:
			return <SellerSettingsPlaceholder />;
		default:
			return <BuyerSettingsPage />;
	}
}
