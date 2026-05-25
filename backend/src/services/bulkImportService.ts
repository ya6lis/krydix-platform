import { read as xlsxRead, utils as xlsxUtils } from 'xlsx';
import { GraphQLError } from 'graphql';
import { ProductStatus } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import * as repo from '../repositories/sellerProductRepository.js';
import type { ImportRowInput } from '../validators/sellerProductValidators.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ImportPreviewRow {
	rowIndex: number;
	titleEn: string;
	titleUk: string;
	sku: string;
	slug: string;
	basePrice: number;
	brand: string | null;
	isValid: boolean;
	errors: string[];
}

export interface ImportResult {
	created: number;
	updated: number;
	failed: number;
	errors: Array<{ rowIndex: number; error: string }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const REQUIRED_COLUMNS = ['titleEn', 'titleUk', 'sku', 'slug', 'basePrice', 'descriptionEn', 'descriptionUk'];

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\w\s-]/g, '')
		.replace(/[\s_]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function validateRow(row: Record<string, unknown>): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	for (const col of REQUIRED_COLUMNS) {
		if (!row[col] || String(row[col]).trim() === '') {
			errors.push(`Missing required field: ${col}`);
		}
	}

	if (row.basePrice !== undefined) {
		const price = Number(row.basePrice);
		if (isNaN(price) || price <= 0) {
			errors.push('basePrice must be a positive number');
		}
	}

	if (row.slug) {
		const slug = String(row.slug).trim();
		if (!/^[a-z0-9-]+$/.test(slug)) {
			errors.push('slug must be lowercase alphanumeric with hyphens');
		}
	}

	return { valid: errors.length === 0, errors };
}

// ─── Preview ──────────────────────────────────────────────────────────────────

export async function previewImport(
	dataUrl: string,
	_fileType: 'xlsx' | 'csv' = 'xlsx'
): Promise<ImportPreviewRow[]> {
	// Decode base64 data URL
	const base64Match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
	if (!base64Match) {
		throw new GraphQLError('Invalid file format. Expected base64 data URL.', {
			extensions: { code: 'BAD_USER_INPUT' },
		});
	}

	const buffer = Buffer.from(base64Match[1], 'base64');
	const workbook = xlsxRead(buffer, { type: 'buffer' });
	const sheetName = workbook.SheetNames[0];
	if (!sheetName) {
		throw new GraphQLError('File has no sheets', { extensions: { code: 'BAD_USER_INPUT' } });
	}

	const sheet = workbook.Sheets[sheetName];
	const rows = xlsxUtils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

	if (rows.length === 0) {
		throw new GraphQLError('File is empty', { extensions: { code: 'BAD_USER_INPUT' } });
	}
	if (rows.length > 500) {
		throw new GraphQLError('File exceeds 500 row limit', { extensions: { code: 'BAD_USER_INPUT' } });
	}

	return rows.map((row, idx) => {
		const { valid, errors } = validateRow(row);
		const slug = String(row.slug || '').trim() || slugify(String(row.titleEn || ''));
		return {
			rowIndex: idx + 2, // 1-indexed, row 1 = header
			titleEn: String(row.titleEn || '').trim(),
			titleUk: String(row.titleUk || '').trim(),
			sku: String(row.sku || '').trim(),
			slug,
			basePrice: Number(row.basePrice) || 0,
			brand: String(row.brand || '').trim() || null,
			isValid: valid,
			errors,
		};
	});
}

// ─── Confirm ──────────────────────────────────────────────────────────────────

export async function confirmImport(
	sellerId: string,
	rows: ImportRowInput[]
): Promise<ImportResult> {
	const result: ImportResult = { created: 0, updated: 0, failed: 0, errors: [] };

	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		const rowIndex = i + 2;

		try {
			// Check if product with this SKU already exists for this seller
			const existing = await prisma.product.findFirst({
				where: { sellerId, sku: row.sku, deletedAt: null },
			});

			if (existing) {
				// Update existing product → forces PENDING_MODERATION
				await repo.updateProduct(existing.id, {
					slug: row.slug,
					sku: row.sku,
					brand: row.brand ?? null,
					basePrice: row.basePrice,
					comparePrice: row.comparePrice ?? null,
					status: ProductStatus.PENDING_MODERATION,
					translations: [
						{
							language: 'EN',
							title: row.titleEn,
							description: row.descriptionEn,
							metaTitle: null,
							metaDescription: null,
						},
						{
							language: 'UK',
							title: row.titleUk,
							description: row.descriptionUk,
							metaTitle: null,
							metaDescription: null,
						},
					],
				});
				result.updated++;
			} else {
				// Ensure slug is unique
				let slug = row.slug;
				let attempt = 0;
				while (await repo.slugExists(slug)) {
					attempt++;
					slug = `${row.slug}-${attempt}`;
				}

				await repo.createProduct({
					sellerId,
					slug,
					sku: row.sku,
					brand: row.brand ?? null,
					basePrice: row.basePrice,
					comparePrice: row.comparePrice ?? null,
					categoryIds: [], // no categories from bulk import — seller assigns later
					translations: [
						{
							language: 'EN',
							title: row.titleEn,
							description: row.descriptionEn,
							metaTitle: null,
							metaDescription: null,
						},
						{
							language: 'UK',
							title: row.titleUk,
							description: row.descriptionUk,
							metaTitle: null,
							metaDescription: null,
						},
					],
				});
				result.created++;
			}
		} catch (err) {
			result.failed++;
			result.errors.push({
				rowIndex,
				error: err instanceof Error ? err.message : 'Unknown error',
			});
		}
	}

	return result;
}
