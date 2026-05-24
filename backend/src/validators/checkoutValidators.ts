import { z } from 'zod';
import { DeliveryMethod, PaymentMethod } from '../constants/enums.js';

export const CreateOrderSchema = z.object({
	paymentMethod: z.nativeEnum(PaymentMethod),
	deliveryMethod: z.nativeEnum(DeliveryMethod),
	deliveryAddress: z.string().max(500).optional(),
	promoCode: z.string().max(50).trim().toUpperCase().optional(),
	notes: z.string().max(1000).optional(),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
