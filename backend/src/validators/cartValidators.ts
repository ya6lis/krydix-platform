import { z } from 'zod';

export const AddToCartSchema = z.object({
	productId: z.string().min(1, 'productId required'),
	variantId: z.string().optional(),
	quantity: z.number().int().min(1, 'quantity must be at least 1').max(100),
});

export const UpdateCartItemSchema = z.object({
	cartItemId: z.string().min(1, 'cartItemId required'),
	quantity: z.number().int().min(1, 'quantity must be at least 1').max(100),
});

export const RemoveCartItemSchema = z.object({
	cartItemId: z.string().min(1, 'cartItemId required'),
});

export const ApplyPromoCodeSchema = z.object({
	code: z.string().min(1).max(50).trim().toUpperCase(),
});
