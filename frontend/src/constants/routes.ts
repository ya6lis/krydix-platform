export const ROUTES = {
	// Public
	HOME: '/',
	PRODUCTS: '/catalog',
	PRODUCT: (slug: string) => `/catalog/${slug}`,
	SEARCH: '/search',
	SELLER_PUBLIC: (id: string) => `/sellers/${id}`,
	USER_PUBLIC: (id: string) => `/users/${id}`,

	// Auth
	LOGIN: '/auth/login',
	REGISTER: '/auth/register',
	VERIFY_EMAIL: '/auth/verify-email',
	FORGOT_PASSWORD: '/auth/forgot-password',
	RESET_PASSWORD: '/auth/reset-password',

	// Commerce
	CART: '/cart',
	WISHLIST: '/wishlist',
	CHECKOUT: '/checkout',

	// Shared authenticated (same URL for every role)
	DASHBOARD: '/dashboard',
	ORDERS: '/orders',
	ORDER: (id: string) => `/orders/${id}`,
	NOTIFICATIONS: '/notifications',
	SETTINGS: '/settings',
	PROFILE: '/profile',
	MY_REVIEWS: '/reviews',

	// Chat
	CHAT: '/chat',

	// Help
	SUPPORT: '/support',
	STAFF_SUPPORT: '/support/inbox',

	// Seller cabinet (seller-only selling tools)
	SELLER: '/seller',
	SELLER_PRODUCTS: '/seller/products',
	SELLER_PRODUCT_NEW: '/seller/products/new',
	SELLER_PRODUCT_EDIT: (id: string) => `/seller/products/${id}/edit`,
	SELLER_ORDERS: '/seller/orders',
	SELLER_ORDER: (id: string) => `/seller/orders/${id}`,
	SELLER_FINANCE: '/seller/finance',
	SELLER_IMPORT: '/seller/import',
	SELLER_VERIFICATION: '/seller/verification',

	// Staff (moderator + admin — same pages, same URLs)
	PRODUCT_MODERATION: '/moderation/products',
	REVIEW_MODERATION: '/moderation/reviews',
	USERS: '/users',
	USER: (id: string) => `/users/${id}`,
	MANAGE_PRODUCTS: '/manage/products',
	MANAGE_REVIEWS: '/manage/reviews',
	COMPLAINTS: '/complaints',

	// Admin only
	CATEGORIES: '/categories',
	AUDIT: '/audit',
	FEEDBACK: '/feedback',
	RELEASE_NOTES: '/release-notes',

	// Misc
	NOT_FOUND: '/404',
	FORBIDDEN: '/403',
} as const;
