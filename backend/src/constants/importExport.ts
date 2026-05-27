export const IMPORT_EXPORT_ROLES = ['SELLER', 'MODERATOR', 'ADMIN'] as const;
export type ImportExportRole = (typeof IMPORT_EXPORT_ROLES)[number];

export enum ImportMode {
	CREATE_ONLY = 'CREATE_ONLY',
	UPDATE_ONLY = 'UPDATE_ONLY',
	UPSERT = 'UPSERT',
}

export const DEFAULT_EXPORT_CURRENCY = 'UAH';
export const MAX_IMPORT_ROWS = 500;
export const EXPORT_PAGE_SIZE = 200;

export const PRODUCT_SHEET = 'Products';
export const ORDERS_SHEET = 'Orders';
export const ORDER_ITEMS_SHEET = 'OrderItems';

/** Canonical product import/export columns (sheet header row). */
export const PRODUCT_TEMPLATE_COLUMNS = [
	'sku',
	'name_uk',
	'name_en',
	'description_uk',
	'description_en',
	'price',
	'currency',
	'quantity',
	'category',
	'status',
	'brand',
	'images',
	'isActive',
	'discountPrice',
	'seoTitle',
	'seoDescription',
] as const;

export const ORDER_TEMPLATE_COLUMNS = [
	'orderNumber',
	'createdAt',
	'status',
	'customerName',
	'customerEmail',
	'totalAmount',
	'currency',
	'paymentStatus',
	'deliveryStatus',
	'shippingAddress',
	'items',
] as const;

export const ORDER_ITEM_TEMPLATE_COLUMNS = [
	'orderNumber',
	'sku',
	'productTitle',
	'quantity',
	'unitPrice',
	'totalPrice',
] as const;
