import { Navigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/store/authStore';
import { AppLoader } from '@/components/ui';

/** Sends logged-in user to their public storefront/profile page. */
export default function AccountProfileRedirect() {
	const user = useAuthStore((s) => s.user);

	if (!user) {
		return <AppLoader />;
	}

	return <Navigate to={ROUTES.SELLER_PUBLIC(user.id)} replace />;
}
