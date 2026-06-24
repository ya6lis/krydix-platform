import {
	DEFAULT_EXPORT_CURRENCY,
	EXPORT_PAGE_SIZE,
	PRODUCT_SHEET,
	PRODUCT_TEMPLATE_COLUMNS,
} from '../constants/importExport.js';
import * as repo from '../repositories/sellerProductRepository.js';
import {
	buildExportFileName,
	buildXlsxFile,
	type SpreadsheetFile,
} from '../utils/spreadsheetFile.js';
import type { SellerProductRecord } from '../repositories/sellerProductRepository.js';

function translation(product: SellerProductRecord, language: 'EN' | 'UK') {
	return product.translations.find((item) => item.language === language);
}

function totalStock(product: SellerProductRecord): number {
	return product.variants
		.filter((variant) => variant.isActive)
		.reduce((sum, variant) => sum + variant.stock, 0);
}

function categorySlugs(product: SellerProductRecord): string {
	return product.categories.map((item) => item.category.slug).join('; ');
}

function imageUrls(product: SellerProductRecord): string {
	return product.media.map((item) => item.url).join('; ');
}

function mapProductRow(product: SellerProductRecord): Record<string, unknown> {
	const en = translation(product, 'EN');
	const uk = translation(product, 'UK');

	return {
		sku: product.sku,
		name_uk: uk?.title ?? '',
		name_en: en?.title ?? '',
		description_uk: uk?.description ?? '',
		description_en: en?.description ?? '',
		price: Number(product.basePrice),
		currency: DEFAULT_EXPORT_CURRENCY,
		quantity: totalStock(product),
		category: categorySlugs(product),
		status: product.status,
		brand: product.brand ?? '',
		images: imageUrls(product),
		isActive: product.isAvailable,
		discountPrice: product.comparePrice ? Number(product.comparePrice) : '',
		seoTitle: en?.metaTitle ?? uk?.metaTitle ?? '',
		seoDescription: en?.metaDescription ?? uk?.metaDescription ?? '',
	};
}

export async function exportSellerProducts(
	sellerId: string,
	filter?: { status?: string; search?: string }
): Promise<SpreadsheetFile> {
	const where = {
		...(filter?.status ? { status: filter.status as never } : {}),
		...(filter?.search
			? {
					OR: [
						{ sku: { contains: filter.search, mode: 'insensitive' as const } },
						{
							translations: {
								some: { title: { contains: filter.search, mode: 'insensitive' as const } },
							},
						},
					],
				}
			: {}),
	};

	const rows: Record<string, unknown>[] = [];
	let skip = 0;

	while (true) {
		const batch = await repo.findSellerProducts(sellerId, where, skip, EXPORT_PAGE_SIZE);
		if (batch.length === 0) break;
		rows.push(...batch.map(mapProductRow));
		if (batch.length < EXPORT_PAGE_SIZE) break;
		skip += EXPORT_PAGE_SIZE;
	}

	return buildXlsxFile(buildExportFileName('products', sellerId), [{ name: PRODUCT_SHEET, rows }]);
}

export function getProductImportTemplate(): SpreadsheetFile {
	const example = Object.fromEntries(
		PRODUCT_TEMPLATE_COLUMNS.map((column) => {
			switch (column) {
				case 'sku':
					return [column, 'SKU-001'];
				case 'name_uk':
					return [column, 'Приклад товару'];
				case 'name_en':
					return [column, 'Sample product'];
				case 'description_uk':
					return [column, 'Короткий опис товару'];
				case 'description_en':
					return [column, 'Short product description'];
				case 'price':
					return [column, 999.99];
				case 'currency':
					return [column, DEFAULT_EXPORT_CURRENCY];
				case 'quantity':
					return [column, 10];
				case 'category':
					return [column, 'electronics'];
				case 'status':
					return [column, 'DRAFT'];
				case 'brand':
					return [column, 'Brand'];
				case 'images':
					return [column, 'https://example.com/image.jpg'];
				case 'isActive':
					return [column, true];
				default:
					return [column, ''];
			}
		})
	);

	return buildXlsxFile('products_import_template.xlsx', [{ name: PRODUCT_SHEET, rows: [example] }]);
}
