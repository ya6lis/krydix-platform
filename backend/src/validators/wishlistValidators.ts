import { z } from 'zod';

export const WishlistProductSchema = z.object({
	productId: z.string().min(1),
});
