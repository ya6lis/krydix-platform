import { createBrowserRouter } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { Role } from '@/constants/enums';

import PublicLayout from '@/layouts/PublicLayout';
import BuyerLayout from '@/layouts/BuyerLayout';
import SellerLayout from '@/layouts/SellerLayout';
import ModeratorLayout from '@/layouts/ModeratorLayout';
import AdminLayout from '@/layouts/AdminLayout';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import LoginPage from '@/pages/public/LoginPage';
import RegisterPage from '@/pages/public/RegisterPage';
import VerifyEmailPage from '@/pages/public/VerifyEmailPage';

const Placeholder = ({ name }: { name: string }) => (
	<div style={{ padding: 32 }}>
		<h2>{name}</h2>
		<p>Coming soon.</p>
	</div>
);

export const router = createBrowserRouter([
	// Full-screen pre-auth pages — no public chrome
	{ path: ROUTES.LOGIN, element: <LoginPage /> },
	{ path: ROUTES.REGISTER, element: <RegisterPage /> },
	{
		element: <PublicLayout />,
		children: [
			{ path: ROUTES.HOME, element: <Placeholder name="Home" /> },
			{ path: ROUTES.PRODUCTS, element: <Placeholder name="Products" /> },
			{ path: '/products/:slug', element: <Placeholder name="Product Detail" /> },
			{ path: ROUTES.SEARCH, element: <Placeholder name="Search" /> },
			{ path: '/seller/:id', element: <Placeholder name="Seller Profile" /> },
			{ path: ROUTES.VERIFY_EMAIL, element: <VerifyEmailPage /> },
			{ path: ROUTES.FORGOT_PASSWORD, element: <Placeholder name="Forgot Password" /> },
			{ path: ROUTES.RESET_PASSWORD, element: <Placeholder name="Reset Password" /> },
			{ path: ROUTES.NOT_FOUND, element: <Placeholder name="404 Not Found" /> },
			{ path: ROUTES.FORBIDDEN, element: <Placeholder name="403 Forbidden" /> },
			{ path: '*', element: <Placeholder name="404 Not Found" /> },
		],
	},
	{
		path: '/account',
		element: (
			<ProtectedRoute allowedRoles={[Role.BUYER, Role.SELLER, Role.MODERATOR, Role.ADMIN]}>
				<BuyerLayout />
			</ProtectedRoute>
		),
		children: [
			{ index: true, element: <Placeholder name="Account Home" /> },
			{ path: 'orders', element: <Placeholder name="My Orders" /> },
			{ path: 'orders/:id', element: <Placeholder name="Order Detail" /> },
			{ path: 'profile', element: <Placeholder name="Profile" /> },
			{ path: 'reviews', element: <Placeholder name="My Reviews" /> },
			{ path: 'cart', element: <Placeholder name="Cart" /> },
			{ path: 'checkout', element: <Placeholder name="Checkout" /> },
			{ path: 'notifications', element: <Placeholder name="Notifications" /> },
		],
	},
	{
		path: '/seller-cabinet',
		element: (
			<ProtectedRoute allowedRoles={[Role.SELLER, Role.ADMIN]}>
				<SellerLayout />
			</ProtectedRoute>
		),
		children: [
			{ index: true, element: <Placeholder name="Seller Home" /> },
			{ path: 'dashboard', element: <Placeholder name="Seller Dashboard" /> },
			{ path: 'products', element: <Placeholder name="My Products" /> },
			{ path: 'products/new', element: <Placeholder name="New Product" /> },
			{ path: 'products/:id/edit', element: <Placeholder name="Edit Product" /> },
			{ path: 'orders', element: <Placeholder name="Seller Orders" /> },
			{ path: 'orders/:id', element: <Placeholder name="Seller Order Detail" /> },
			{ path: 'import', element: <Placeholder name="Bulk Import" /> },
			{ path: 'verification', element: <Placeholder name="Seller Verification" /> },
			{ path: 'settings', element: <Placeholder name="Seller Settings" /> },
		],
	},
	{
		path: '/moderator',
		element: (
			<ProtectedRoute allowedRoles={[Role.MODERATOR, Role.ADMIN]}>
				<ModeratorLayout />
			</ProtectedRoute>
		),
		children: [
			{ index: true, element: <Placeholder name="Moderator Home" /> },
			{ path: 'products', element: <Placeholder name="Product Moderation" /> },
			{ path: 'complaints', element: <Placeholder name="Complaints" /> },
			{ path: 'reviews', element: <Placeholder name="Review Moderation" /> },
			{ path: 'verification', element: <Placeholder name="Seller Verification Queue" /> },
		],
	},
	{
		path: '/admin',
		element: (
			<ProtectedRoute allowedRoles={[Role.ADMIN]}>
				<AdminLayout />
			</ProtectedRoute>
		),
		children: [
			{ index: true, element: <Placeholder name="Admin Home" /> },
			{ path: 'users', element: <Placeholder name="Users" /> },
			{ path: 'categories', element: <Placeholder name="Categories" /> },
			{ path: 'products', element: <Placeholder name="All Products" /> },
			{ path: 'complaints', element: <Placeholder name="All Complaints" /> },
			{ path: 'reviews', element: <Placeholder name="All Reviews" /> },
			{ path: 'settings', element: <Placeholder name="Platform Settings" /> },
			{ path: 'audit', element: <Placeholder name="Audit Log" /> },
		],
	},
]);
