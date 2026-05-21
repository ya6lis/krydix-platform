import { createBrowserRouter } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';

import PublicLayout from '@/layouts/PublicLayout';
import BuyerLayout from '@/layouts/BuyerLayout';
import SellerLayout from '@/layouts/SellerLayout';
import ModeratorLayout from '@/layouts/ModeratorLayout';
import AdminLayout from '@/layouts/AdminLayout';

const Placeholder = ({ name }: { name: string }) => (
	<div style={{ padding: 32 }}>
		<h2>{name}</h2>
		<p>Coming soon.</p>
	</div>
);

export const router = createBrowserRouter([
	{
		element: <PublicLayout />,
		children: [
			{ path: ROUTES.HOME, element: <Placeholder name="Home" /> },
			{ path: ROUTES.PRODUCTS, element: <Placeholder name="Products" /> },
			{ path: '/products/:slug', element: <Placeholder name="Product Detail" /> },
			{ path: ROUTES.SEARCH, element: <Placeholder name="Search" /> },
			{ path: '/seller/:id', element: <Placeholder name="Seller Profile" /> },
			{ path: ROUTES.LOGIN, element: <Placeholder name="Login" /> },
			{ path: ROUTES.REGISTER, element: <Placeholder name="Register" /> },
			{ path: ROUTES.VERIFY_EMAIL, element: <Placeholder name="Verify Email" /> },
			{ path: ROUTES.FORGOT_PASSWORD, element: <Placeholder name="Forgot Password" /> },
			{ path: ROUTES.RESET_PASSWORD, element: <Placeholder name="Reset Password" /> },
			{ path: ROUTES.NOT_FOUND, element: <Placeholder name="404 Not Found" /> },
			{ path: ROUTES.FORBIDDEN, element: <Placeholder name="403 Forbidden" /> },
			{ path: '*', element: <Placeholder name="404 Not Found" /> },
		],
	},
	{
		path: '/account',
		element: <BuyerLayout />,
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
		element: <SellerLayout />,
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
		element: <ModeratorLayout />,
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
		element: <AdminLayout />,
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
