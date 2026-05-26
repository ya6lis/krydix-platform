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

	// Cart & Checkout (public — guest accessible)
	CART: '/cart',
	WISHLIST: '/wishlist',
	CHECKOUT: '/checkout',

	// Buyer cabinet
	ACCOUNT: '/account',
	ACCOUNT_ORDERS: '/account/orders',
	ACCOUNT_ORDER: (id: string) => `/account/orders/${id}`,
	ACCOUNT_PROFILE: '/account/profile',
	ACCOUNT_SETTINGS: '/account/settings',
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
	MODERATOR_PRODUCT_MODERATION: '/moderator/product-moderation',
	MODERATOR_REVIEW_MODERATION: '/moderator/review-moderation',
	MODERATOR_PRODUCTS: '/moderator/product-moderation',
	MODERATOR_QUEUE: '/moderator/product-moderation',
	MODERATOR_COMPLAINTS: '/moderator/complaints',
	MODERATOR_REVIEWS: '/moderator/review-moderation',
	MODERATOR_USERS: '/moderator/users',
	MODERATOR_USER: (id: string) => `/moderator/users/${id}`,
	MODERATOR_ALL_PRODUCTS: '/moderator/all-products',
	MODERATOR_ALL_REVIEWS: '/moderator/all-reviews',
	MODERATOR_VERIFICATION: '/moderator/verification',
	MODERATOR_SUPPORT: '/moderator/support',

	// Admin panel
	ADMIN: '/admin',
	ADMIN_USERS: '/admin/users',
	ADMIN_USER: (id: string) => `/admin/users/${id}`,
	ADMIN_CATEGORIES: '/admin/categories',
	ADMIN_PRODUCTS: '/admin/products',
	ADMIN_COMPLAINTS: '/admin/complaints',
	ADMIN_REVIEWS: '/admin/reviews',
	ADMIN_SETTINGS: '/admin/settings',
	ADMIN_AUDIT: '/admin/audit',
	ADMIN_FEEDBACK: '/admin/feedback',
	ADMIN_RELEASE_NOTES: '/admin/release-notes',

	// Help
	SUPPORT: '/support',

	// Misc
	NOT_FOUND: '/404',
	FORBIDDEN: '/403',

	// Chat
	CHAT: '/chat',
	SELLER_CHAT: '/seller/chat',
} as const;
