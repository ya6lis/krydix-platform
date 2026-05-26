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
export const ShipSellerOrderSchema = z.object({
	orderId: z.string().min(1, 'Order ID is required'),
	trackingCode: z.string().max(100).optional(),
});

export const CancelSellerOrderSchema = z.object({
	orderId: z.string().min(1, 'Order ID is required'),
	reason: z.string().max(500).optional(),
});

export const UpdateSellerTrackingSchema = z.object({
	orderId: z.string().min(1, 'Order ID is required'),
	trackingCode: z.string().min(1).max(100),
});

export const ReviewSellerReturnSchema = z.object({
	orderId: z.string().min(1, 'Order ID is required'),
	approve: z.boolean(),
	resolution: z.string().max(1000).optional(),
});

export const SellerOrderIdSchema = z.object({
	orderId: z.string().min(1, 'Order ID is required'),
});

export type ShipSellerOrderInput = z.infer<typeof ShipSellerOrderSchema>;
export type CancelSellerOrderInput = z.infer<typeof CancelSellerOrderSchema>;
export type UpdateSellerTrackingInput = z.infer<typeof UpdateSellerTrackingSchema>;
export type ReviewSellerReturnInput = z.infer<typeof ReviewSellerReturnSchema>;
export type SellerOrderIdInput = z.infer<typeof SellerOrderIdSchema>;
