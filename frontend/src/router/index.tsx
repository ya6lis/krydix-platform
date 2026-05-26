import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { RouteZone } from '@/utils/roleAccess';

import PublicLayout from '@/layouts/PublicLayout';
import BuyerLayout from '@/layouts/BuyerLayout';
import SellerLayout from '@/layouts/SellerLayout';
import ModeratorLayout from '@/layouts/ModeratorLayout';
import AdminLayout from '@/layouts/AdminLayout';
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
import BuyerDashboardPage from '@/pages/buyer/BuyerDashboardPage';
import BuyerOrdersPage from '@/pages/buyer/BuyerOrdersPage';
import BuyerOrderDetailPage from '@/pages/buyer/BuyerOrderDetailPage';
import BuyerSettingsPage from '@/pages/buyer/BuyerSettingsPage';
import NotificationsPage from '@/pages/buyer/NotificationsPage';
import PublicSellerProfilePage from '@/pages/public/PublicSellerProfilePage';
import AccountProfileRedirect from '@/pages/buyer/AccountProfileRedirect';
import ChatPage from '@/pages/chat/ChatPage';
import SellerProductFormPage from '@/pages/seller/SellerProductFormPage';
import SellerProductsPage from '@/pages/seller/SellerProductsPage';
import SellerDashboardPage from '@/pages/seller/SellerDashboardPage';
import SellerOrdersPage from '@/pages/seller/SellerOrdersPage';
import SellerOrderDetailPage from '@/pages/seller/SellerOrderDetailPage';
import ProductModerationPage from '@/pages/moderator/ProductModerationPage';
import ModeratorDashboardPage from '@/pages/moderator/ModeratorDashboardPage';
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
import AdminPlatformPage from '@/pages/admin/AdminPlatformPage';
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import NotFound404Page from '@/pages/public/404Page';
import HomeRedirectPage from '@/pages/public/HomeRedirectPage';

const Placeholder = ({ name }: { name: string }) => (
	<div style={{ padding: 32 }}>
		<h2>{name}</h2>
		<p>Coming soon.</p>
	</div>
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

	// ── Public content + error pages — AppShell visible to all ────
	// Guests see minimal sidebar (catalog only); auth'd users see full nav.
	{
		element: <AppShell />,
		children: [
			{ path: ROUTES.HOME, element: <HomeRedirectPage /> },
			{ path: ROUTES.PRODUCTS, element: <CatalogPage /> },
			{ path: '/catalog/:slug', element: <ProductPage /> },
			{ path: ROUTES.SEARCH, element: <Placeholder name="Search" /> },
			{ path: ROUTES.CART, element: (
					<ProtectedRoute zone={RouteZone.BUYER_COMMERCE}>
						<CartPage />
					</ProtectedRoute>
				) },
			{
				path: ROUTES.WISHLIST,
				element: (
					<ProtectedRoute zone={RouteZone.BUYER}>
						<WishlistPage />
					</ProtectedRoute>
				),
			},
			{
				path: ROUTES.CHECKOUT,
				element: (
					<ProtectedRoute zone={RouteZone.BUYER}>
						<CheckoutPage />
					</ProtectedRoute>
				),
			},
			{ path: ROUTES.SUPPORT, element: <SupportPage /> },
			{
				path: ROUTES.CHAT,
				element: (
					<ProtectedRoute zone={RouteZone.BUYER}>
						<ChatPage />
					</ProtectedRoute>
				),
			},
			{
				path: ROUTES.SELLER_CHAT,
				element: (
					<ProtectedRoute zone={RouteZone.SELLER}>
						<ChatPage />
					</ProtectedRoute>
				),
			},
			{ path: '/seller/:id', element: <PublicSellerProfilePage /> },
			{
				path: ROUTES.ACCOUNT_NOTIFICATIONS,
				element: (
					<ProtectedRoute zone={RouteZone.AUTH}>
						<NotificationsPage />
					</ProtectedRoute>
				),
			},
		],
	},

	// ── Standalone error pages — no AppShell ───────────────────────
	{ path: ROUTES.NOT_FOUND, element: <NotFound404Page /> },

	// ── Protected: buyer account ───────────────────────────────────
	{
		path: '/account',
		element: (
			<ProtectedRoute zone={RouteZone.BUYER}>
				<BuyerLayout />
			</ProtectedRoute>
		),
		children: [
			{ index: true, element: <BuyerDashboardPage /> },
			{ path: 'orders', element: <BuyerOrdersPage /> },
			{ path: 'orders/:id', element: <BuyerOrderDetailPage /> },
			{ path: 'profile', element: <AccountProfileRedirect /> },
			{ path: 'settings', element: <BuyerSettingsPage /> },
			{ path: 'reviews', element: <Placeholder name="My Reviews" /> },
			{ path: 'cart', element: <Placeholder name="Cart" /> },
			{ path: 'checkout', element: <Placeholder name="Checkout" /> },
		],
	},

	// ── Protected: seller cabinet ──────────────────────────────────
	{
		path: '/seller-cabinet',
		element: (
			<ProtectedRoute zone={RouteZone.SELLER}>
				<SellerLayout />
			</ProtectedRoute>
		),
		children: [
			{ index: true, element: <SellerDashboardPage /> },
			{ path: 'dashboard', element: <SellerDashboardPage /> },
			{ path: 'products', element: <SellerProductsPage /> },
			{ path: 'products/new', element: <SellerProductFormPage /> },
			{ path: 'products/:id/edit', element: <SellerProductFormPage /> },
			{ path: 'orders', element: <SellerOrdersPage /> },
			{ path: 'orders/:id', element: <SellerOrderDetailPage /> },
			{ path: 'import', element: <Placeholder name="Bulk Import" /> },
			{ path: 'verification', element: <Placeholder name="Seller Verification" /> },
			{ path: 'settings', element: <Placeholder name="Seller Settings" /> },
		],
	},

	// ── Protected: moderator panel ─────────────────────────────────
	{
		path: '/moderator',
		element: (
			<ProtectedRoute zone={RouteZone.MODERATOR}>
				<ModeratorLayout />
			</ProtectedRoute>
		),
		children: [
			{ index: true, element: <ModeratorDashboardPage /> },
			{ path: 'product-moderation', element: <ProductModerationPage /> },
			{ path: 'products', element: <Navigate to={ROUTES.MODERATOR_PRODUCT_MODERATION} replace /> },
			{ path: 'queue', element: <Navigate to={ROUTES.MODERATOR_PRODUCT_MODERATION} replace /> },
			{ path: 'complaints', element: <Placeholder name="Complaints" /> },
			{ path: 'review-moderation', element: <ReviewModerationPage /> },
			{ path: 'reviews', element: <Navigate to={ROUTES.MODERATOR_REVIEW_MODERATION} replace /> },
			{ path: 'users', element: <UsersManagementPage /> },
			{ path: 'users/:id', element: <Placeholder name="User Profile" /> },
			{ path: 'all-products', element: <ProductsManagementPage /> },
			{ path: 'all-reviews', element: <ReviewsManagementPage /> },
			{ path: 'verification', element: <Placeholder name="Seller Verification Queue" /> },
			{ path: 'support', element: <ModeratorSupportPage /> },
		],
	},

	// ── Protected: admin panel ─────────────────────────────────────
	{
		path: '/admin',
		element: (
			<ProtectedRoute zone={RouteZone.ADMIN}>
				<AdminLayout />
			</ProtectedRoute>
		),
		children: [
			{ index: true, element: <AdminDashboardPage /> },
			{ path: 'users', element: <UsersManagementPage /> },
			{ path: 'users/:id', element: <Placeholder name="User Profile" /> },
			{ path: 'categories', element: <AdminCategoriesPage /> },
			{ path: 'products', element: <ProductsManagementPage /> },
			{ path: 'complaints', element: <Placeholder name="All Complaints" /> },
			{ path: 'reviews', element: <ReviewsManagementPage /> },
			{ path: 'settings', element: <AdminPlatformPage /> },
			{ path: 'audit', element: <AdminAuditPage /> },
			{ path: 'feedback', element: <AdminFeedbackPage /> },
			{ path: 'release-notes', element: <AdminReleaseNotesPage /> },
		],
	},

	{ path: ROUTES.FORBIDDEN, element: <Placeholder name="403 Forbidden" /> },
	{ path: '*', element: <NotFound404Page /> },
]);
