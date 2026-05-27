import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { RouteZone } from '@/utils/roleAccess';

import PublicLayout from '@/layouts/PublicLayout';
import AppShell from '@/components/shell/AppShell';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import LoginPage from '@/pages/public/LoginPage';
import RegisterPage from '@/pages/public/RegisterPage';
import VerifyEmailPage from '@/pages/public/VerifyEmailPage';
import CatalogPage from '@/pages/public/CatalogPage';
import ProductPage from '@/pages/public/ProductPage';
import CartPage from '@/pages/public/CartPage';
import WishlistPage from '@/pages/public/WishlistPage';
import CheckoutPage from '@/pages/public/CheckoutPage';
import BuyerOrdersPage from '@/pages/buyer/BuyerOrdersPage';
import BuyerOrderDetailPage from '@/pages/buyer/BuyerOrderDetailPage';
import NotificationsPage from '@/pages/buyer/NotificationsPage';
import PublicSellerProfilePage from '@/pages/public/PublicSellerProfilePage';
import PublicUserProfilePage from '@/pages/public/PublicUserProfilePage';
import AccountProfileRedirect from '@/pages/buyer/AccountProfileRedirect';
import ChatPage from '@/pages/chat/ChatPage';
import DashboardPage from '@/pages/DashboardPage';
import SettingsPage from '@/pages/SettingsPage';
import SellerProductFormPage from '@/pages/seller/SellerProductFormPage';
import SellerProductsPage from '@/pages/seller/SellerProductsPage';
import SellerOrdersPage from '@/pages/seller/SellerOrdersPage';
import SellerOrderDetailPage from '@/pages/seller/SellerOrderDetailPage';
import SellerFinancePage from '@/pages/seller/SellerFinancePage';
import ProductModerationPage from '@/pages/moderator/ProductModerationPage';
import ReviewModerationPage from '@/pages/moderator/ReviewModerationPage';
import ModeratorSupportPage from '@/pages/moderator/ModeratorSupportPage';
import UsersManagementPage from '@/pages/admin/UsersManagementPage';
import ProductsManagementPage from '@/pages/admin/ProductsManagementPage';
import ReviewsManagementPage from '@/pages/admin/ReviewsManagementPage';
import AdminCategoriesPage from '@/pages/admin/AdminCategoriesPage';
import AdminAuditPage from '@/pages/admin/AdminAuditPage';
import AdminFeedbackPage from '@/pages/admin/AdminFeedbackPage';
import AdminReleaseNotesPage from '@/pages/admin/AdminReleaseNotesPage';
import SupportPage from '@/pages/support/SupportPage';
import NotFound404Page from '@/pages/public/404Page';
import HomeRedirectPage from '@/pages/public/HomeRedirectPage';
import { LegacyOrderRedirect, LegacyUserRedirect } from '@/router/legacyRedirects';

const Placeholder = ({ name }: { name: string }) => (
	<div style={{ padding: 32 }}>
		<h2>{name}</h2>
		<p>Coming soon.</p>
	</div>
);

const auth = (zone: RouteZone, element: React.ReactNode) => (
	<ProtectedRoute zone={zone}>{element}</ProtectedRoute>
);

export const router = createBrowserRouter([
	// ── Full-screen auth pages — no layout, no shell ──────────────
	{ path: ROUTES.LOGIN, element: <LoginPage /> },
	{ path: ROUTES.REGISTER, element: <RegisterPage /> },

	// ── Auth-flow pages — minimal public header, no shell ─────────
	{
		element: <PublicLayout />,
		children: [
			{ path: ROUTES.VERIFY_EMAIL, element: <VerifyEmailPage /> },
			{ path: ROUTES.FORGOT_PASSWORD, element: <Placeholder name="Forgot Password" /> },
			{ path: ROUTES.RESET_PASSWORD, element: <Placeholder name="Reset Password" /> },
		],
	},

	// ── App shell — unified routes for all roles ───────────────────
	{
		element: <AppShell />,
		children: [
			{ path: ROUTES.HOME, element: <HomeRedirectPage /> },

			// Public marketplace
			{ path: ROUTES.PRODUCTS, element: <CatalogPage /> },
			{ path: '/catalog/:slug', element: <ProductPage /> },
			{ path: ROUTES.SEARCH, element: <Placeholder name="Search" /> },
			{ path: ROUTES.CART, element: auth(RouteZone.BUYER_COMMERCE, <CartPage />) },
			{ path: ROUTES.WISHLIST, element: auth(RouteZone.BUYER, <WishlistPage />) },
			{ path: ROUTES.CHECKOUT, element: auth(RouteZone.BUYER, <CheckoutPage />) },
			{ path: ROUTES.SUPPORT, element: <SupportPage /> },
			{ path: ROUTES.CHAT, element: auth(RouteZone.AUTH, <ChatPage />) },
			{ path: '/sellers/:id', element: <PublicSellerProfilePage /> },

			// Shared authenticated
			{ path: ROUTES.DASHBOARD, element: auth(RouteZone.AUTH, <DashboardPage />) },
			{ path: ROUTES.ORDERS, element: auth(RouteZone.BUYER, <BuyerOrdersPage />) },
			{ path: `${ROUTES.ORDERS}/:id`, element: auth(RouteZone.BUYER, <BuyerOrderDetailPage />) },
			{ path: ROUTES.NOTIFICATIONS, element: auth(RouteZone.AUTH, <NotificationsPage />) },
			{ path: ROUTES.SETTINGS, element: auth(RouteZone.AUTH, <SettingsPage />) },
			{ path: ROUTES.PROFILE, element: auth(RouteZone.AUTH, <AccountProfileRedirect />) },
			{ path: ROUTES.MY_REVIEWS, element: auth(RouteZone.BUYER, <Placeholder name="My Reviews" />) },

			// Seller cabinet
			{ path: ROUTES.SELLER, element: auth(RouteZone.SELLER, <Navigate to={ROUTES.DASHBOARD} replace />) },
			{ path: ROUTES.SELLER_PRODUCTS, element: auth(RouteZone.SELLER, <SellerProductsPage />) },
			{ path: ROUTES.SELLER_PRODUCT_NEW, element: auth(RouteZone.SELLER, <SellerProductFormPage />) },
			{ path: '/seller/products/:id/edit', element: auth(RouteZone.SELLER, <SellerProductFormPage />) },
			{ path: ROUTES.SELLER_ORDERS, element: auth(RouteZone.SELLER, <SellerOrdersPage />) },
			{ path: '/seller/orders/:id', element: auth(RouteZone.SELLER, <SellerOrderDetailPage />) },
			{ path: ROUTES.SELLER_FINANCE, element: auth(RouteZone.SELLER, <SellerFinancePage />) },
			{ path: ROUTES.SELLER_IMPORT, element: auth(RouteZone.SELLER, <Navigate to={ROUTES.SELLER_PRODUCTS} replace />) },
			{ path: ROUTES.SELLER_VERIFICATION, element: auth(RouteZone.SELLER, <Placeholder name="Seller Verification" />) },

			// Staff (moderator + admin)
			{ path: ROUTES.PRODUCT_MODERATION, element: auth(RouteZone.MODERATOR, <ProductModerationPage />) },
			{ path: ROUTES.REVIEW_MODERATION, element: auth(RouteZone.MODERATOR, <ReviewModerationPage />) },
			{ path: ROUTES.STAFF_SUPPORT, element: auth(RouteZone.MODERATOR, <ModeratorSupportPage />) },
			{ path: ROUTES.USERS, element: auth(RouteZone.MODERATOR, <UsersManagementPage />) },
			{ path: `${ROUTES.USERS}/:id`, element: <PublicUserProfilePage /> },
			{ path: ROUTES.MANAGE_PRODUCTS, element: auth(RouteZone.MODERATOR, <ProductsManagementPage />) },
			{ path: ROUTES.MANAGE_REVIEWS, element: auth(RouteZone.MODERATOR, <ReviewsManagementPage />) },
			{ path: ROUTES.COMPLAINTS, element: auth(RouteZone.MODERATOR, <Placeholder name="Complaints" />) },

			// Admin only
			{ path: ROUTES.CATEGORIES, element: auth(RouteZone.ADMIN, <AdminCategoriesPage />) },
			{ path: ROUTES.AUDIT, element: auth(RouteZone.ADMIN, <AdminAuditPage />) },
			{ path: ROUTES.FEEDBACK, element: auth(RouteZone.ADMIN, <AdminFeedbackPage />) },
			{ path: ROUTES.RELEASE_NOTES, element: auth(RouteZone.ADMIN, <AdminReleaseNotesPage />) },

			// Legacy redirects (old role-prefixed URLs)
			{ path: '/account', element: <Navigate to={ROUTES.DASHBOARD} replace /> },
			{ path: '/account/orders', element: <Navigate to={ROUTES.ORDERS} replace /> },
			{ path: '/account/orders/:id', element: <LegacyOrderRedirect /> },
			{ path: '/account/profile', element: <Navigate to={ROUTES.PROFILE} replace /> },
			{ path: '/account/settings', element: <Navigate to={ROUTES.SETTINGS} replace /> },
			{ path: '/account/notifications', element: <Navigate to={ROUTES.NOTIFICATIONS} replace /> },
			{ path: '/account/reviews', element: <Navigate to={ROUTES.MY_REVIEWS} replace /> },
			{ path: '/seller/dashboard', element: <Navigate to={ROUTES.DASHBOARD} replace /> },
			{ path: '/seller/settings', element: <Navigate to={ROUTES.SETTINGS} replace /> },
			{ path: '/moderator', element: <Navigate to={ROUTES.DASHBOARD} replace /> },
			{ path: '/admin', element: <Navigate to={ROUTES.DASHBOARD} replace /> },
			{ path: '/moderator/product-moderation', element: <Navigate to={ROUTES.PRODUCT_MODERATION} replace /> },
			{ path: '/moderator/review-moderation', element: <Navigate to={ROUTES.REVIEW_MODERATION} replace /> },
			{ path: '/moderator/support', element: <Navigate to={ROUTES.STAFF_SUPPORT} replace /> },
			{ path: '/moderator/users', element: <Navigate to={ROUTES.USERS} replace /> },
			{ path: '/moderator/users/:id', element: <LegacyUserRedirect /> },
			{ path: '/moderator/all-products', element: <Navigate to={ROUTES.MANAGE_PRODUCTS} replace /> },
			{ path: '/moderator/all-reviews', element: <Navigate to={ROUTES.MANAGE_REVIEWS} replace /> },
			{ path: '/admin/users', element: <Navigate to={ROUTES.USERS} replace /> },
			{ path: '/admin/users/:id', element: <LegacyUserRedirect /> },
			{ path: '/admin/products', element: <Navigate to={ROUTES.MANAGE_PRODUCTS} replace /> },
			{ path: '/admin/reviews', element: <Navigate to={ROUTES.MANAGE_REVIEWS} replace /> },
			{ path: '/admin/categories', element: <Navigate to={ROUTES.CATEGORIES} replace /> },
			{ path: '/admin/settings', element: <Navigate to={ROUTES.SETTINGS} replace /> },
			{ path: '/admin/audit', element: <Navigate to={ROUTES.AUDIT} replace /> },
			{ path: '/admin/feedback', element: <Navigate to={ROUTES.FEEDBACK} replace /> },
			{ path: '/admin/release-notes', element: <Navigate to={ROUTES.RELEASE_NOTES} replace /> },
		],
	},

	// ── Standalone error pages — no AppShell ───────────────────────
	{ path: ROUTES.NOT_FOUND, element: <NotFound404Page /> },
	{ path: ROUTES.FORBIDDEN, element: <Placeholder name="403 Forbidden" /> },
	{ path: '*', element: <NotFound404Page /> },
]);
