export const ROUTES = {
	// Public
	HOME: '/',
	PRODUCTS: '/catalog',
	PRODUCT: (slug: string) => `/catalog/${slug}`,
	SEARCH: '/search',
	SELLER_PUBLIC: (id: string) => `/seller/${id}`,

	// Auth
	LOGIN: '/auth/login',
	REGISTER: '/auth/register',
	VERIFY_EMAIL: '/auth/verify-email',
	FORGOT_PASSWORD: '/auth/forgot-password',
	RESET_PASSWORD: '/auth/reset-password',

	// Buyer cabinet
	ACCOUNT: '/account',
	ACCOUNT_ORDERS: '/account/orders',
	ACCOUNT_ORDER: (id: string) => `/account/orders/${id}`,
	ACCOUNT_PROFILE: '/account/profile',
	ACCOUNT_REVIEWS: '/account/reviews',
	ACCOUNT_CART: '/account/cart',
	ACCOUNT_CHECKOUT: '/account/checkout',
	ACCOUNT_NOTIFICATIONS: '/account/notifications',

	// Seller cabinet
	SELLER: '/seller-cabinet',
	SELLER_DASHBOARD: '/seller-cabinet/dashboard',
	SELLER_PRODUCTS: '/seller-cabinet/products',
	SELLER_PRODUCT_NEW: '/seller-cabinet/products/new',
	SELLER_PRODUCT_EDIT: (id: string) => `/seller-cabinet/products/${id}/edit`,
	SELLER_ORDERS: '/seller-cabinet/orders',
	SELLER_ORDER: (id: string) => `/seller-cabinet/orders/${id}`,
	SELLER_IMPORT: '/seller-cabinet/import',
	SELLER_VERIFICATION: '/seller-cabinet/verification',
	SELLER_SETTINGS: '/seller-cabinet/settings',

	// Moderator panel
	MODERATOR: '/moderator',
	MODERATOR_PRODUCTS: '/moderator/products',
	MODERATOR_COMPLAINTS: '/moderator/complaints',
	MODERATOR_REVIEWS: '/moderator/reviews',
	MODERATOR_VERIFICATION: '/moderator/verification',

	// Admin panel
	ADMIN: '/admin',
	ADMIN_USERS: '/admin/users',
	ADMIN_CATEGORIES: '/admin/categories',
	ADMIN_PRODUCTS: '/admin/products',
	ADMIN_COMPLAINTS: '/admin/complaints',
	ADMIN_REVIEWS: '/admin/reviews',
	ADMIN_SETTINGS: '/admin/settings',
	ADMIN_AUDIT: '/admin/audit',

	// Misc
	NOT_FOUND: '/404',
	FORBIDDEN: '/403',
} as const;
