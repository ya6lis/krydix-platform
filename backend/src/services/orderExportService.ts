import { OrderStatus } from '@prisma/client';
import {
	DEFAULT_EXPORT_CURRENCY,
	EXPORT_PAGE_SIZE,
	ORDER_ITEM_TEMPLATE_COLUMNS,
	ORDER_TEMPLATE_COLUMNS,
	ORDERS_SHEET,
	ORDER_ITEMS_SHEET,
} from '../constants/importExport.js';
import {
	buildExportFileName,
	buildXlsxFile,
	type SpreadsheetFile,
} from '../utils/spreadsheetFile.js';
import { findOrdersBySeller } from '../repositories/orderRepository.js';
import { mapToSellerOrderView } from './orderService.js';

function formatAddress(address: string | null | undefined): string {
	return address?.trim() ?? '';
}

function formatItemsSummary(items: Array<{ productTitle: string; quantity: number }>): string {
	return items.map((item) => `${item.productTitle} x${item.quantity}`).join('; ');
}

function toNumber(value: unknown): number {
	if (value === null || value === undefined || value === '') return 0;
	return Number(value);
}

export async function exportSellerOrders(
	sellerId: string,
	filter?: { status?: OrderStatus; search?: string }
): Promise<SpreadsheetFile> {
	const orderRows: Record<string, unknown>[] = [];
	const orderItemRows: Record<string, unknown>[] = [];
	let page = 1;

	while (true) {
		const result = await findOrdersBySeller(sellerId, filter, { page, pageSize: EXPORT_PAGE_SIZE });
		if (result.items.length === 0) break;

		for (const order of result.items) {
			const view = mapToSellerOrderView(order, sellerId);
			const orderNumber = view.id.slice(0, 8).toUpperCase();

			orderRows.push({
				orderNumber,
				createdAt: view.createdAt.toISOString(),
				status: view.status,
				customerName: view.buyer.name,
				customerEmail: view.buyer.email,
				totalAmount: toNumber(view.sellerSubtotal),
				currency: DEFAULT_EXPORT_CURRENCY,
				paymentStatus: view.payment?.status ?? '',
				deliveryStatus: view.delivery?.status ?? '',
				shippingAddress: formatAddress(view.delivery?.address),
				items: formatItemsSummary(view.items),
			});

			for (const item of view.items) {
				orderItemRows.push({
					orderNumber,
					sku: item.variantId ?? item.productId,
					productTitle: item.productTitle,
					quantity: item.quantity,
					unitPrice: toNumber(item.unitPrice),
					totalPrice: toNumber(item.totalPrice),
				});
			}
		}

		if (page * EXPORT_PAGE_SIZE >= result.total) break;
		page += 1;
	}

	return buildXlsxFile(buildExportFileName('orders', sellerId), [
		{ name: ORDERS_SHEET, rows: orderRows },
		{ name: ORDER_ITEMS_SHEET, rows: orderItemRows },
	]);
}

export function getOrderImportTemplate(): SpreadsheetFile {
	return buildXlsxFile('orders_import_template.xlsx', [
		{
			name: ORDERS_SHEET,
			rows: [Object.fromEntries(ORDER_TEMPLATE_COLUMNS.map((col) => [col, '']))],
		},
		{
			name: ORDER_ITEMS_SHEET,
			rows: [Object.fromEntries(ORDER_ITEM_TEMPLATE_COLUMNS.map((col) => [col, '']))],
		},
	]);
}

export { ORDER_TEMPLATE_COLUMNS, ORDER_ITEM_TEMPLATE_COLUMNS };
