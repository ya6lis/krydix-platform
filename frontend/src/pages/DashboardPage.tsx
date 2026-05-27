import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Role } from '@/constants/enums';
import { ROUTES } from '@/constants/routes';
import BuyerDashboardPage from '@/pages/buyer/BuyerDashboardPage';
import SellerDashboardPage from '@/pages/seller/SellerDashboardPage';
import ModeratorDashboardPage from '@/pages/moderator/ModeratorDashboardPage';
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';

/** Single dashboard route — content depends on the user's role. */
export default function DashboardPage() {
	const user = useAuthStore((s) => s.user);

	if (!user) {
		return <Navigate to={ROUTES.LOGIN} replace />;
	}

	switch (user.role) {
		case Role.SELLER:
			return <SellerDashboardPage />;
		case Role.MODERATOR:
			return <ModeratorDashboardPage />;
		case Role.ADMIN:
			return <AdminDashboardPage />;
		case Role.BUYER:
			return <BuyerDashboardPage />;
		default:
			return <Navigate to={ROUTES.PRODUCTS} replace />;
	}
}
