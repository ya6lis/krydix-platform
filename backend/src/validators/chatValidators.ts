import { z } from 'zod';
import { PAGINATION_DEFAULT_LIMIT, PAGINATION_DEFAULT_PAGE } from '../constants/constants.js';

export const StartConversationSchema = z
	.object({
		sellerId: z.string().cuid().optional(),
		productId: z.string().cuid().optional(),
	})
	.refine((data) => data.sellerId || data.productId, {
		message: 'sellerId or productId is required',
	});

export const SendMessageSchema = z.object({
	conversationId: z.string().cuid(),
	content: z.string().trim().min(1).max(4000),
});

export const MessagesQuerySchema = z.object({
	conversationId: z.string().cuid(),
	page: z.coerce.number().int().min(1).default(PAGINATION_DEFAULT_PAGE),
	pageSize: z.coerce.number().int().min(1).max(100).default(PAGINATION_DEFAULT_LIMIT),
});

export type StartConversationInput = z.infer<typeof StartConversationSchema>;
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type MessagesQueryInput = z.infer<typeof MessagesQuerySchema>;
