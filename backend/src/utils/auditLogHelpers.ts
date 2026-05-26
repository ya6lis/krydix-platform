import type { AuditAction, Prisma } from '@prisma/client';
import {
	AuditActionKey,
	type AuditActionKeyValue,
	type AuditActionVariant,
} from '../constants/auditActionKeys.js';

type AuditLogLike = {
	action: AuditAction;
	targetType: string;
	metadata: unknown;
};

function asMeta(metadata: unknown): Record<string, unknown> {
	if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
		return {};
	}
	return metadata as Record<string, unknown>;
}

export function deriveAuditActionKey(log: AuditLogLike): AuditActionKeyValue {
	const meta = asMeta(log.metadata);

	if (log.action === 'PRODUCT_STATUS_CHANGE') {
		if (meta.to === 'APPROVED') return AuditActionKey.PRODUCT_APPROVE;
		if (meta.to === 'REJECTED') return AuditActionKey.PRODUCT_REJECT;
		if (meta.to === 'BLOCKED') return AuditActionKey.PRODUCT_BLOCK;
		return AuditActionKey.PRODUCT_UPDATE;
	}

	if (log.action === 'SELLER_VERIFICATION_CHANGE') {
		if (meta.to === 'APPROVED') return AuditActionKey.SELLER_APPROVE;
		if (meta.to === 'REJECTED') return AuditActionKey.SELLER_REJECT;
		return AuditActionKey.SELLER_UPDATE;
	}

	if (log.action === 'USER_ROLE_CHANGE') {
		if (meta.action === 'SOFT_BAN') return AuditActionKey.USER_BAN;
		if (meta.action === 'INVITE') return AuditActionKey.USER_INVITE;
		return AuditActionKey.USER_ROLE_CHANGE;
	}

	if (log.action === 'HARD_DELETE') {
		if (log.targetType === 'Product') return AuditActionKey.PRODUCT_DELETE;
		if (log.targetType === 'User') return AuditActionKey.USER_DELETE;
		return AuditActionKey.USER_DELETE;
	}

	if (log.action === 'REVIEW_DELETED') {
		if (meta.action === 'APPROVED') return AuditActionKey.REVIEW_APPROVE;
		if (meta.action === 'HIDDEN') return AuditActionKey.REVIEW_BLOCK;
		if (meta.action === 'DELETED' || meta.action === 'SOFT_DELETE') {
			return AuditActionKey.REVIEW_DELETE;
		}
		if (meta.to === 'BLOCKED') return AuditActionKey.REVIEW_BLOCK;
		if (meta.to === 'APPROVED') return AuditActionKey.REVIEW_APPROVE;
		return AuditActionKey.REVIEW_UPDATE;
	}

	if (log.action === 'COMPLAINT_RESOLVED') {
		return AuditActionKey.COMPLAINT_RESOLVE;
	}

	if (log.action === 'CATEGORY_CHANGE') {
		if (meta.operation === 'create') return AuditActionKey.CATEGORY_CREATE;
		if (meta.operation === 'delete') return AuditActionKey.CATEGORY_DELETE;
		if (meta.operation === 'move') return AuditActionKey.CATEGORY_MOVE;
		if (meta.operation === 'translation') return AuditActionKey.CATEGORY_TRANSLATION;
		return AuditActionKey.CATEGORY_UPDATE;
	}

	return AuditActionKey.PRODUCT_UPDATE;
}

export function deriveAuditActionVariant(actionKey: AuditActionKeyValue): AuditActionVariant {
	if (actionKey.endsWith('.approve')) return 'approve';
	if (actionKey.endsWith('.reject')) return 'reject';
	if (actionKey.endsWith('.block')) return 'block';
	if (actionKey.endsWith('.delete')) return 'delete';
	if (actionKey.endsWith('.create')) return 'create';
	if (actionKey.startsWith('user.')) return 'role';
	return 'update';
}

export function actionKeyToWhere(key: AuditActionKeyValue): Prisma.AuditLogWhereInput {
	switch (key) {
		case AuditActionKey.PRODUCT_APPROVE:
			return {
				action: 'PRODUCT_STATUS_CHANGE',
				targetType: 'Product',
				metadata: { path: ['to'], equals: 'APPROVED' },
			};
		case AuditActionKey.PRODUCT_REJECT:
			return {
				action: 'PRODUCT_STATUS_CHANGE',
				targetType: 'Product',
				metadata: { path: ['to'], equals: 'REJECTED' },
			};
		case AuditActionKey.PRODUCT_BLOCK:
			return {
				action: 'PRODUCT_STATUS_CHANGE',
				targetType: 'Product',
				metadata: { path: ['to'], equals: 'BLOCKED' },
			};
		case AuditActionKey.PRODUCT_UPDATE:
			return {
				action: 'PRODUCT_STATUS_CHANGE',
				targetType: 'Product',
				NOT: {
					OR: [
						{ metadata: { path: ['to'], equals: 'APPROVED' } },
						{ metadata: { path: ['to'], equals: 'REJECTED' } },
						{ metadata: { path: ['to'], equals: 'BLOCKED' } },
					],
				},
			};
		case AuditActionKey.PRODUCT_DELETE:
			return { action: 'HARD_DELETE', targetType: 'Product' };
		case AuditActionKey.SELLER_APPROVE:
			return {
				action: 'SELLER_VERIFICATION_CHANGE',
				metadata: { path: ['to'], equals: 'APPROVED' },
			};
		case AuditActionKey.SELLER_REJECT:
			return {
				action: 'SELLER_VERIFICATION_CHANGE',
				metadata: { path: ['to'], equals: 'REJECTED' },
			};
		case AuditActionKey.SELLER_UPDATE:
			return {
				action: 'SELLER_VERIFICATION_CHANGE',
				NOT: {
					OR: [
						{ metadata: { path: ['to'], equals: 'APPROVED' } },
						{ metadata: { path: ['to'], equals: 'REJECTED' } },
					],
				},
			};
		case AuditActionKey.USER_ROLE_CHANGE:
			return {
				action: 'USER_ROLE_CHANGE',
				NOT: {
					OR: [
						{ metadata: { path: ['action'], equals: 'SOFT_BAN' } },
						{ metadata: { path: ['action'], equals: 'INVITE' } },
					],
				},
			};
		case AuditActionKey.USER_BAN:
			return {
				action: 'USER_ROLE_CHANGE',
				metadata: { path: ['action'], equals: 'SOFT_BAN' },
			};
		case AuditActionKey.USER_INVITE:
			return {
				action: 'USER_ROLE_CHANGE',
				metadata: { path: ['action'], equals: 'INVITE' },
			};
		case AuditActionKey.USER_DELETE:
			return { action: 'HARD_DELETE', targetType: 'User' };
		case AuditActionKey.REVIEW_APPROVE:
			return {
				action: 'REVIEW_DELETED',
				OR: [
					{ metadata: { path: ['action'], equals: 'APPROVED' } },
					{ metadata: { path: ['to'], equals: 'APPROVED' } },
				],
			};
		case AuditActionKey.REVIEW_BLOCK:
			return {
				action: 'REVIEW_DELETED',
				OR: [
					{ metadata: { path: ['action'], equals: 'HIDDEN' } },
					{ metadata: { path: ['to'], equals: 'BLOCKED' } },
				],
			};
		case AuditActionKey.REVIEW_DELETE:
			return {
				action: 'REVIEW_DELETED',
				OR: [
					{ metadata: { path: ['action'], equals: 'DELETED' } },
					{ metadata: { path: ['action'], equals: 'SOFT_DELETE' } },
				],
			};
		case AuditActionKey.REVIEW_UPDATE:
			return {
				action: 'REVIEW_DELETED',
				NOT: {
					OR: [
						{ metadata: { path: ['action'], equals: 'APPROVED' } },
						{ metadata: { path: ['action'], equals: 'HIDDEN' } },
						{ metadata: { path: ['action'], equals: 'DELETED' } },
						{ metadata: { path: ['action'], equals: 'SOFT_DELETE' } },
						{ metadata: { path: ['to'], equals: 'APPROVED' } },
						{ metadata: { path: ['to'], equals: 'BLOCKED' } },
					],
				},
			};
		case AuditActionKey.COMPLAINT_RESOLVE:
			return { action: 'COMPLAINT_RESOLVED' };
		case AuditActionKey.CATEGORY_CREATE:
			return {
				action: 'CATEGORY_CHANGE',
				metadata: { path: ['operation'], equals: 'create' },
			};
		case AuditActionKey.CATEGORY_UPDATE:
			return {
				action: 'CATEGORY_CHANGE',
				metadata: { path: ['operation'], equals: 'update' },
			};
		case AuditActionKey.CATEGORY_DELETE:
			return {
				action: 'CATEGORY_CHANGE',
				metadata: { path: ['operation'], equals: 'delete' },
			};
		case AuditActionKey.CATEGORY_MOVE:
			return {
				action: 'CATEGORY_CHANGE',
				metadata: { path: ['operation'], equals: 'move' },
			};
		case AuditActionKey.CATEGORY_TRANSLATION:
			return {
				action: 'CATEGORY_CHANGE',
				metadata: { path: ['operation'], equals: 'translation' },
			};
		default:
			return { id: '__none__' };
	}
}
