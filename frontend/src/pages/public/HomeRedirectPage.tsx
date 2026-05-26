import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { getHomeRouteForRole } from '@/utils/roleAccess';

/** Sends users from `/` to their role-specific home page. */
export default function HomeRedirectPage() {
	const user = useAuthStore((s) => s.user);

	return <Navigate to={getHomeRouteForRole(user?.role)} replace />;
}
