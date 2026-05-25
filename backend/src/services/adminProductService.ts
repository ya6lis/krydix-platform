import { GraphQLError } from 'graphql';
import { ProductStatus } from '@prisma/client';
import * as repo from '../repositories/adminProductRepository.js';
import * as auditLog from './auditLogService.js';
import { Role } from '../constants/enums.js';

const ADMIN_PRODUCT_STATUSES = Object.values(ProductStatus);

function buildTitle(product: repo.RawAdminProduct): string {
	const en = product.translations.find((t) => t.language === 'EN');
	const uk = product.translations.find((t) => t.language === 'UK');
	return en?.title ?? uk?.title ?? product.sku;
}

function buildSellerName(product: repo.RawAdminProduct): string {
	const p = product.seller.profile;
	if (!p) return product.seller.email;
	return `${p.firstName} ${p.lastName}`.trim();
}

function buildCategoryPath(product: repo.RawAdminProduct): string | null {
	const first = product.categories[0]?.category;
	if (!first) return null;
	const name = first.translations[0]?.name ?? '';
	const parentName = first.parent?.translations[0]?.name ?? '';
	return parentName ? `${parentName} › ${name}` : name || null;
}

function buildProductRef(id: string): string {
	return `#PR-${id.slice(-4).toUpperCase()}`;
}

export function serializeAdminProduct(product: repo.RawAdminProduct) {
	const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
	const imageUrl = product.media[0]?.url ?? null;

	return {
		id: product.id,
		title: buildTitle(product),
		sku: product.sku,
		slug: product.slug,
		productRef: buildProductRef(product.id),
		imageUrl,
		sellerId: product.seller.id,
		sellerName: buildSellerName(product),
		sellerEmail: product.seller.email,
		basePrice: Number(product.basePrice),
		brand: product.brand ?? null,
		categoryPath: buildCategoryPath(product),
		status: product.status,
		isAvailable: product.isAvailable,
		totalStock,
		createdAt: product.createdAt.toISOString(),
		updatedAt: product.updatedAt.toISOString(),
		isDeleted: product.deletedAt !== null,
	};
}

const STAFF_ROLES: Role[] = [Role.MODERATOR, Role.ADMIN];

function assertStaffRole(actorRole: Role) {
	if (!STAFF_ROLES.includes(actorRole)) {
		throw new GraphQLError('Staff access required', { extensions: { code: 'FORBIDDEN' } });
	}
}

function assertAdminRole(actorRole: Role) {
	if (actorRole !== Role.ADMIN) {
		throw new GraphQLError('Administrator access required', { extensions: { code: 'FORBIDDEN' } });
	}
}

export async function getAdminProductStats() {
	return repo.getAdminProductStats();
}

export async function getAllProducts(input: {
	statusFilter?: repo.AdminProductStatusFilter;
	availabilityFilter?: repo.AdminProductAvailabilityFilter;
	search?: string;
	page?: number;
	pageSize?: number;
}) {
	const [data, tabCounts] = await Promise.all([
		repo.findAllAdminProducts(input),
		repo.getAdminProductTabCounts(),
	]);

	return {
		items: data.items.map(serializeAdminProduct),
		total: data.total,
		page: data.page,
		pageSize: data.pageSize,
		tabCounts,
	};
}

export async function changeAdminProductStatus(
	actorId: string,
	actorRole: Role,
	productId: string,
	newStatus: ProductStatus,
) {
	assertStaffRole(actorRole);

	if (!ADMIN_PRODUCT_STATUSES.includes(newStatus)) {
		throw new GraphQLError('Invalid product status', { extensions: { code: 'BAD_USER_INPUT' } });
	}

	const target = await repo.findAdminProductById(productId);
	if (!target || target.deletedAt) {
		throw new GraphQLError('Product not found', { extensions: { code: 'NOT_FOUND' } });
	}

	const updated = await repo.updateAdminProductStatus(productId, newStatus);

	await auditLog.log({
		actorId,
		action: 'PRODUCT_STATUS_CHANGE',
		targetType: 'Product',
		targetId: productId,
		metadata: { from: target.status, to: newStatus, source: 'ADMIN_PRODUCTS' },
	});

	return serializeAdminProduct(updated);
}

export async function adminDeleteProduct(actorId: string, actorRole: Role, productId: string) {
	assertAdminRole(actorRole);

	const target = await repo.findAdminProductById(productId);
	if (!target || target.deletedAt) {
		throw new GraphQLError('Product not found', { extensions: { code: 'NOT_FOUND' } });
	}

	await repo.softDeleteAdminProductRecord(productId);

	await auditLog.log({
		actorId,
		action: 'HARD_DELETE',
		targetType: 'Product',
		targetId: productId,
		metadata: { action: 'SOFT_DELETE', source: 'ADMIN_PRODUCTS' },
	});

	return true;
}
