import { z } from 'zod';
import { PAGINATION_DEFAULT_LIMIT, PAGINATION_DEFAULT_PAGE } from '../constants/constants.js';
import { SupportChatStatus } from '../constants/enums.js';

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

export const CreateSupportConversationSchema = z.object({
	subject: z.string().trim().min(3).max(200),
	message: z.string().trim().min(1).max(4000),
});

export const SupportQueueFilterSchema = z.object({
	status: z.nativeEnum(SupportChatStatus).optional(),
	search: z.string().trim().max(200).optional(),
	page: z.coerce.number().int().min(1).default(PAGINATION_DEFAULT_PAGE),
	pageSize: z.coerce.number().int().min(1).max(100).default(PAGINATION_DEFAULT_LIMIT),
});

export const UpdateSupportStatusSchema = z.object({
	conversationId: z.string().cuid(),
	status: z.nativeEnum(SupportChatStatus),
});

export type StartConversationInput = z.infer<typeof StartConversationSchema>;
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type MessagesQueryInput = z.infer<typeof MessagesQuerySchema>;
export type CreateSupportConversationInput = z.infer<typeof CreateSupportConversationSchema>;
export type SupportQueueFilterInput = z.infer<typeof SupportQueueFilterSchema>;
export type UpdateSupportStatusInput = z.infer<typeof UpdateSupportStatusSchema>;
