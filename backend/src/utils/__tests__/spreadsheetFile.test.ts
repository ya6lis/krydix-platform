import { buildExportFileName, buildXlsxFile } from '../spreadsheetFile.js';

describe('spreadsheetFile', () => {
	it('builds export file name with entity, seller id, and date', () => {
		const fileName = buildExportFileName('products', 'seller-abcdef12');
		expect(fileName).toMatch(/^products_seller-a_\d{4}-\d{2}-\d{2}\.xlsx$/);
	});

	it('builds xlsx payload with base64 content', () => {
		const file = buildXlsxFile('test.xlsx', [
			{
				name: 'Products',
				rows: [{ sku: 'SKU-1', name_en: 'Sample' }],
			},
		]);

		expect(file.fileName).toBe('test.xlsx');
		expect(file.mimeType).toContain('spreadsheetml');
		expect(file.base64.length).toBeGreaterThan(0);
	});
});
