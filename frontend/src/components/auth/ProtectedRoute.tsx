import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/constants/routes';
import { AppLoader } from '@/components/ui';
import { Role } from '@/constants/enums';
import { RouteZone, canAccessRouteZone } from '@/utils/roleAccess';

interface ProtectedRouteProps {
	children: React.ReactNode;
	/** @deprecated Prefer `zone` for role-area enforcement. */
	allowedRoles?: Role[];
	zone?: RouteZone;
}

export function ProtectedRoute({ children, allowedRoles, zone }: ProtectedRouteProps) {
	const { user, isInitialized } = useAuthStore();
	const location = useLocation();

	if (!isInitialized) return <AppLoader fullPage />;

	if (zone) {
		if (!canAccessRouteZone(user?.role, zone, !!user)) {
			if (zone !== RouteZone.GLOBAL && !user) {
				return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
			}
			return <Navigate to={ROUTES.FORBIDDEN} replace />;
		}
		return <>{children}</>;
	}

	if (!user) {
		return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
	}

	if (allowedRoles && !allowedRoles.includes(user.role)) {
		return <Navigate to={ROUTES.FORBIDDEN} replace />;
	}

	return <>{children}</>;
}
