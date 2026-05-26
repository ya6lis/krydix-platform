export const AuditActionKey = {
	PRODUCT_APPROVE: 'product.approve',
	PRODUCT_REJECT: 'product.reject',
	PRODUCT_BLOCK: 'product.block',
	PRODUCT_UPDATE: 'product.update',
	PRODUCT_DELETE: 'product.delete',
	SELLER_APPROVE: 'seller.approve',
	SELLER_REJECT: 'seller.reject',
	SELLER_UPDATE: 'seller.update',
	USER_ROLE_CHANGE: 'user.roleChange',
	USER_BAN: 'user.ban',
	USER_INVITE: 'user.invite',
	USER_DELETE: 'user.delete',
	REVIEW_APPROVE: 'review.approve',
	REVIEW_BLOCK: 'review.block',
	REVIEW_DELETE: 'review.delete',
	REVIEW_UPDATE: 'review.update',
	COMPLAINT_RESOLVE: 'complaint.resolve',
	CATEGORY_CREATE: 'category.create',
	CATEGORY_UPDATE: 'category.update',
	CATEGORY_DELETE: 'category.delete',
	CATEGORY_MOVE: 'category.move',
	CATEGORY_TRANSLATION: 'category.translation',
} as const;

export type AuditActionKeyValue = (typeof AuditActionKey)[keyof typeof AuditActionKey];

export type AuditActionVariant =
	| 'approve'
	| 'reject'
	| 'block'
	| 'delete'
	| 'update'
	| 'role'
	| 'create';

export type AuditDateRangePreset = 'LAST_24_HOURS' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'CUSTOM';

export type AuditActorRoleFilter = 'ADMIN' | 'MODERATOR';
