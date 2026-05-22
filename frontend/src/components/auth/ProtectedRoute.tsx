import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/constants/routes';
import { AppLoader } from '@/components/ui';
import { Role } from '@/constants/enums';

interface ProtectedRouteProps {
	children: React.ReactNode;
	allowedRoles?: Role[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
	const { user, isInitialized } = useAuthStore();
	const location = useLocation();

	if (!isInitialized) return <AppLoader fullPage />;

	if (!user) {
		return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
	}

	if (allowedRoles && !allowedRoles.includes(user.role)) {
		return <Navigate to={ROUTES.FORBIDDEN} replace />;
	}

	return <>{children}</>;
}
