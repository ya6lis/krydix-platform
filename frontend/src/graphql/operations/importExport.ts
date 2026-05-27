import { gql } from '@apollo/client';

export const SPREADSHEET_FILE_FIELDS = `
	fileName
	mimeType
	base64
`;

export const EXPORT_MY_PRODUCTS_QUERY = gql`
	query ExportMyProducts($filter: ProductListFilterInput) {
		exportMyProducts(filter: $filter) {
			${SPREADSHEET_FILE_FIELDS}
		}
	}
`;

export const DOWNLOAD_PRODUCT_IMPORT_TEMPLATE_QUERY = gql`
	query DownloadProductImportTemplate {
		downloadProductImportTemplate {
			${SPREADSHEET_FILE_FIELDS}
		}
	}
`;

export const EXPORT_MY_SELLER_ORDERS_QUERY = gql`
	query ExportMySellerOrders($filter: MyOrdersFilter) {
		exportMySellerOrders(filter: $filter) {
			${SPREADSHEET_FILE_FIELDS}
		}
	}
`;

export type ImportMode = 'CREATE_ONLY' | 'UPDATE_ONLY' | 'UPSERT';

export interface SpreadsheetFileResult {
	fileName: string;
	mimeType: string;
	base64: string;
}
