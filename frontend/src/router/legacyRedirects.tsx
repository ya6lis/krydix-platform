import { Navigate, useParams } from 'react-router-dom';

/** Redirects legacy `/account/orders/:id` to `/orders/:id`. */
export function LegacyOrderRedirect() {
	const { id } = useParams<{ id: string }>();
	return <Navigate to={id ? `/orders/${id}` : '/orders'} replace />;
}

/** Redirects legacy `/admin/users/:id` and `/moderator/users/:id` to `/users/:id`. */
export function LegacyUserRedirect() {
	const { id } = useParams<{ id: string }>();
	return <Navigate to={id ? `/users/${id}` : '/users'} replace />;
}
