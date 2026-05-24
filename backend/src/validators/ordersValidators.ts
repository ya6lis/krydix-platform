import { z } from 'zod';
import { OrderStatus } from '@prisma/client';

export const OrderIdSchema = z.object({
	orderId: z.string().min(1, 'Order ID is required'),
});

export const MyOrdersFilterSchema = z.object({
	status: z.nativeEnum(OrderStatus).optional(),
	dateFrom: z.string().datetime().optional(),
	dateTo: z.string().datetime().optional(),
	search: z.string().max(200).optional(),
	page: z.number().int().min(1).optional().default(1),
	pageSize: z.number().int().min(1).max(100).optional().default(10),
});

export type OrderIdInput = z.infer<typeof OrderIdSchema>;
export type MyOrdersFilterInput = z.infer<typeof MyOrdersFilterSchema>;
