import { read as xlsxRead, utils as xlsxUtils } from 'xlsx';
import { GraphQLError } from 'graphql';
import { ProductStatus } from '@prisma/client';
import {
	ImportMode,
	MAX_IMPORT_ROWS,
	PRODUCT_SHEET,
	PRODUCT_TEMPLATE_COLUMNS,
} from '../constants/importExport.js';
import { prisma } from '../utils/prisma.js';
import { logger } from '../utils/logger.js';
import * as repo from '../repositories/sellerProductRepository.js';
import { findCategoryBySlug } from '../repositories/categoryRepository.js';
import type { ImportRowInput } from '../validators/sellerProductValidators.js';

export interface ImportPreviewRow {
	rowIndex: number;
	nameEn: string;
	nameUk: string;
	descriptionEn: string;
	descriptionUk: string;
	sku: string;
	slug: string;
	price: number;
	currency: string;
	quantity: number;
	category: string;
	status: string;
	brand: string | null;
	images: string;
	isActive: boolean;
	discountPrice: number | null;
	seoTitle: string | null;
	seoDescription: string | null;
	isValid: boolean;
	errors: string[];
	willCreate: boolean;
	willUpdate: boolean;
}

export interface ImportResult {
	created: number;
	updated: number;
	failed: number;
	skipped: number;
	errors: Array<{ rowIndex: number; error: string }>;
}

const REQUIRED_FIELDS = [
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
] as const;

const COLUMN_ALIASES: Record<string, string> = {
	titleEn: 'name_en',
	titleUk: 'name_uk',
	descriptionEn: 'description_en',
	descriptionUk: 'description_uk',
	basePrice: 'price',
	comparePrice: 'discountPrice',
};

const VALID_STATUSES = new Set<string>(Object.values(ProductStatus));

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\w\s-]/g, '')
		.replace(/[\s_]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function normalizeKey(key: string): string {
	const trimmed = key.trim();
	return COLUMN_ALIASES[trimmed] ?? trimmed;
}

function normalizeRow(raw: Record<string, unknown>): Record<string, unknown> {
	const normalized: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(raw)) {
		normalized[normalizeKey(key)] = value;
	}
	return normalized;
}

function parseBoolean(value: unknown): boolean | null {
	if (typeof value === 'boolean') return value;
	const text = String(value ?? '').trim().toLowerCase();
	if (['true', '1', 'yes', 'y'].includes(text)) return true;
	if (['false', '0', 'no', 'n'].includes(text)) return false;
	return null;
}

function parseCategorySlugs(value: unknown): string[] {
	return String(value ?? '')
		.split(/[;,]/)
		.map((part) => part.trim())
		.filter(Boolean);
}

function parseImageUrls(value: unknown): string[] {
	return String(value ?? '')
		.split(/[;|]/)
		.map((part) => part.trim())
		.filter(Boolean);
}

function decodeDataUrl(dataUrl: string): Buffer {
	const base64Match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
	if (!base64Match) {
		throw new GraphQLError('Invalid file format. Expected base64 data URL.', {
			extensions: { code: 'BAD_USER_INPUT' },
		});
	}
	return Buffer.from(base64Match[1], 'base64');
}

function readProductRows(dataUrl: string, _fileType: 'xlsx' | 'csv' = 'xlsx'): Record<string, unknown>[] {
	const buffer = decodeDataUrl(dataUrl);
	const workbook = xlsxRead(buffer, { type: 'buffer' });
	const sheetName = workbook.SheetNames.find((name) => name === PRODUCT_SHEET) ?? workbook.SheetNames[0];
	if (!sheetName) {
		throw new GraphQLError('File has no sheets', { extensions: { code: 'BAD_USER_INPUT' } });
	}

	const sheet = workbook.Sheets[sheetName];
	const rows = xlsxUtils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' }).map(normalizeRow);

	if (rows.length === 0) {
		throw new GraphQLError('File is empty', { extensions: { code: 'BAD_USER_INPUT' } });
	}
	if (rows.length > MAX_IMPORT_ROWS) {
		throw new GraphQLError(`File exceeds ${MAX_IMPORT_ROWS} row limit`, {
			extensions: { code: 'BAD_USER_INPUT' },
		});
	}

	return rows;
}

async function validateNormalizedRow(
	row: Record<string, unknown>,
	mode: ImportMode,
	sellerId: string,
	seenSkus: Set<string>,
): Promise<{ valid: boolean; errors: string[]; willCreate: boolean; willUpdate: boolean }> {
	const errors: string[] = [];

	for (const field of REQUIRED_FIELDS) {
		if (row[field] === undefined) {
			errors.push(`Missing required field: ${field}`);
		} else if (field !== 'images' && String(row[field]).trim() === '') {
			errors.push(`Missing required field: ${field}`);
		}
	}

	const sku = String(row.sku ?? '').trim();
	if (sku && seenSkus.has(sku)) {
		errors.push(`Duplicate SKU in file: ${sku}`);
	}
	if (sku) seenSkus.add(sku);

	const price = Number(row.price);
	if (row.price !== undefined && row.price !== '' && (Number.isNaN(price) || price <= 0)) {
		errors.push('price must be a positive number');
	}

	const quantity = Number(row.quantity);
	if (row.quantity !== undefined && row.quantity !== '' && (Number.isNaN(quantity) || quantity < 0 || !Number.isInteger(quantity))) {
		errors.push('quantity must be a non-negative integer');
	}

	const discountRaw = row.discountPrice;
	if (discountRaw !== undefined && discountRaw !== '') {
		const discountPrice = Number(discountRaw);
		if (Number.isNaN(discountPrice) || discountPrice <= 0) {
			errors.push('discountPrice must be a positive number');
		}
	}

	const status = String(row.status ?? '').trim().toUpperCase();
	if (status && !VALID_STATUSES.has(status)) {
		errors.push(`Invalid status: ${status}`);
	}

	const isActive = parseBoolean(row.isActive);
	if (row.isActive !== undefined && row.isActive !== '' && isActive === null) {
		errors.push('isActive must be true or false');
	}

	const categorySlugs = parseCategorySlugs(row.category);
	for (const slug of categorySlugs) {
		const category = await findCategoryBySlug(slug);
		if (!category) {
			errors.push(`Unknown category slug: ${slug}`);
		}
	}

	const existing = sku
		? await prisma.product.findFirst({ where: { sellerId, sku, deletedAt: null } })
		: null;

	let willCreate = !existing;
	let willUpdate = !!existing;

	if (mode === ImportMode.CREATE_ONLY && existing) {
		errors.push(`SKU already exists (create-only mode): ${sku}`);
		willCreate = false;
		willUpdate = false;
	}
	if (mode === ImportMode.UPDATE_ONLY && !existing) {
		errors.push(`SKU not found (update-only mode): ${sku}`);
		willCreate = false;
		willUpdate = false;
	}

	return { valid: errors.length === 0, errors, willCreate, willUpdate };
}

function mapPreviewRow(
	row: Record<string, unknown>,
	rowIndex: number,
	validation: { valid: boolean; errors: string[]; willCreate: boolean; willUpdate: boolean },
): ImportPreviewRow {
	const nameEn = String(row.name_en ?? '').trim();
	const slug = slugify(nameEn || String(row.sku ?? ''));

	return {
		rowIndex,
		nameEn,
		nameUk: String(row.name_uk ?? '').trim(),
		descriptionEn: String(row.description_en ?? '').trim(),
		descriptionUk: String(row.description_uk ?? '').trim(),
		sku: String(row.sku ?? '').trim(),
		slug,
		price: Number(row.price) || 0,
		currency: String(row.currency ?? '').trim(),
		quantity: Number(row.quantity) || 0,
		category: String(row.category ?? '').trim(),
		status: String(row.status ?? '').trim().toUpperCase(),
		brand: String(row.brand ?? '').trim() || null,
		images: String(row.images ?? '').trim(),
		isActive: parseBoolean(row.isActive) ?? true,
		discountPrice:
			row.discountPrice !== undefined && row.discountPrice !== ''
				? Number(row.discountPrice)
				: null,
		seoTitle: String(row.seoTitle ?? '').trim() || null,
		seoDescription: String(row.seoDescription ?? '').trim() || null,
		isValid: validation.valid,
		errors: validation.errors,
		willCreate: validation.willCreate,
		willUpdate: validation.willUpdate,
	};
}

export async function previewImport(
	dataUrl: string,
	fileType: 'xlsx' | 'csv' = 'xlsx',
	mode: ImportMode = ImportMode.UPSERT,
	sellerId?: string,
): Promise<ImportPreviewRow[]> {
	const rows = readProductRows(dataUrl, fileType);
	const seenSkus = new Set<string>();
	const resolvedSellerId = sellerId ?? 'preview';
	const results: ImportPreviewRow[] = [];

	for (let idx = 0; idx < rows.length; idx += 1) {
		const row = rows[idx];
		const validation = await validateNormalizedRow(row, mode, resolvedSellerId, seenSkus);
		results.push(mapPreviewRow(row, idx + 2, validation));
	}

	return results;
}

async function resolveCategoryIds(categoryValue: string): Promise<string[]> {
	const slugs = parseCategorySlugs(categoryValue);
	const ids: string[] = [];
	for (const slug of slugs) {
		const category = await findCategoryBySlug(slug);
		if (category) ids.push(category.id);
	}
	return ids;
}

async function syncImportedMedia(productId: string, imagesValue: string): Promise<void> {
	const urls = parseImageUrls(imagesValue);
	if (urls.length === 0) return;

	await prisma.media.deleteMany({ where: { productId } });

	for (let i = 0; i < urls.length; i += 1) {
		await repo.addProductMedia({
			productId,
			url: urls[i],
			publicId: `import-${productId}-${i}`,
			type: 'IMAGE',
			isMain: i === 0,
		});
	}
}

function toImportRowInput(row: ImportRowInput) {
	return row;
}

export async function confirmImport(
	sellerId: string,
	rows: ImportRowInput[],
	mode: ImportMode = ImportMode.UPSERT,
	actorId?: string,
): Promise<ImportResult> {
	const result: ImportResult = { created: 0, updated: 0, failed: 0, skipped: 0, errors: [] };

	for (let i = 0; i < rows.length; i += 1) {
		const row = toImportRowInput(rows[i]);
		const rowIndex = row.rowIndex ?? i + 2;

		try {
			const existing = await prisma.product.findFirst({
				where: { sellerId, sku: row.sku, deletedAt: null },
			});

			if (mode === ImportMode.CREATE_ONLY && existing) {
				result.skipped += 1;
				result.errors.push({ rowIndex, error: `SKU already exists: ${row.sku}` });
				continue;
			}
			if (mode === ImportMode.UPDATE_ONLY && !existing) {
				result.skipped += 1;
				result.errors.push({ rowIndex, error: `SKU not found: ${row.sku}` });
				continue;
			}

			const categoryIds = await resolveCategoryIds(row.category);
			const status = (row.status.toUpperCase() as ProductStatus) || ProductStatus.DRAFT;
			const variantPayload = [
				{
					sku: row.sku,
					options: {},
					price: null,
					stock: row.quantity,
				},
			];

			const translations = [
				{
					language: 'EN' as const,
					title: row.nameEn,
					description: row.descriptionEn,
					metaTitle: row.seoTitle ?? null,
					metaDescription: row.seoDescription ?? null,
				},
				{
					language: 'UK' as const,
					title: row.nameUk,
					description: row.descriptionUk,
					metaTitle: row.seoTitle ?? null,
					metaDescription: row.seoDescription ?? null,
				},
			];

			if (existing) {
				await repo.updateProduct(existing.id, {
					slug: row.slug,
					sku: row.sku,
					brand: row.brand ?? null,
					basePrice: row.price,
					comparePrice: row.discountPrice ?? null,
					isAvailable: row.isActive,
					status: status === ProductStatus.APPROVED ? ProductStatus.PENDING_MODERATION : status,
					categoryIds,
					translations,
					variants: variantPayload,
				});
				await syncImportedMedia(existing.id, row.images);
				result.updated += 1;
			} else {
				let slug = row.slug;
				let attempt = 0;
				while (await repo.slugExists(slug)) {
					attempt += 1;
					slug = `${row.slug}-${attempt}`;
				}

				const created = await repo.createProduct({
					sellerId,
					slug,
					sku: row.sku,
					brand: row.brand ?? null,
					basePrice: row.price,
					comparePrice: row.discountPrice ?? null,
					status,
					isAvailable: row.isActive,
					categoryIds,
					translations,
					variants: variantPayload,
				});
				await syncImportedMedia(created.id, row.images);
				result.created += 1;
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error';
			result.failed += 1;
			result.errors.push({ rowIndex, error: message });
			logger.error(
				{ err, rowIndex, sku: row.sku, sellerId, actorId },
				'Product import row failed',
			);
		}
	}

	return result;
}

export { PRODUCT_TEMPLATE_COLUMNS };
