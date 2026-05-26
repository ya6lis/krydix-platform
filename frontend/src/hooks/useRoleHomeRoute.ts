import { useAuthStore } from '@/store/authStore';
import { getHomeRouteForRole } from '@/utils/roleAccess';

/** Role-specific dashboard (or catalog for guests). */
export function useRoleHomeRoute(): string {
	const user = useAuthStore((s) => s.user);
	return getHomeRouteForRole(user?.role);
}
