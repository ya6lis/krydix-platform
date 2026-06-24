import { utils as xlsxUtils, write as xlsxWrite } from 'xlsx';

export interface SpreadsheetFile {
	fileName: string;
	mimeType: string;
	base64: string;
}

export function buildXlsxFile(
	fileName: string,
	sheets: Array<{ name: string; rows: Record<string, unknown>[] }>
): SpreadsheetFile {
	const workbook = xlsxUtils.book_new();

	for (const sheet of sheets) {
		const worksheet = xlsxUtils.json_to_sheet(sheet.rows);
		xlsxUtils.book_append_sheet(workbook, worksheet, sheet.name);
	}

	const buffer = xlsxWrite(workbook, { type: 'buffer', bookType: 'xlsx' });

	return {
		fileName,
		mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		base64: Buffer.from(buffer).toString('base64'),
	};
}

export function buildExportFileName(entity: string, sellerId: string, extension = 'xlsx'): string {
	const date = new Date().toISOString().slice(0, 10);
	const shortId = sellerId.slice(0, 8);
	return `${entity}_${shortId}_${date}.${extension}`;
}
