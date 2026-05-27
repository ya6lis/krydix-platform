import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { AppLoader } from '@/components/ui';
import { getProfileRouteForUser } from '@/utils/roleAccess';

/** Sends logged-in user to their role-appropriate profile page. */
export default function AccountProfileRedirect() {
	const user = useAuthStore((s) => s.user);

	if (!user) {
		return <AppLoader />;
	}

	return <Navigate to={getProfileRouteForUser(user)} replace />;
}
