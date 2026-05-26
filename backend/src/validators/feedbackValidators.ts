import { z } from 'zod';
import { FeedbackCategory, FeedbackStatus } from '../constants/enums.js';

export const SubmitFeedbackSchema = z.object({
	category: z.nativeEnum(FeedbackCategory),
	subject: z.string().trim().min(3).max(120),
	message: z.string().trim().min(10).max(5000),
	photoDataUrls: z.array(z.string().min(1)).max(5).optional(),
});

export const AdminFeedbacksInputSchema = z.object({
	page: z.number().int().min(0).default(0),
	pageSize: z.number().int().min(1).max(100).default(25),
	status: z.nativeEnum(FeedbackStatus).optional(),
	category: z.nativeEnum(FeedbackCategory).optional(),
	search: z.string().trim().max(200).optional(),
});

export const UpdateFeedbackSchema = z.object({
	id: z.string().min(1),
	status: z.nativeEnum(FeedbackStatus),
	adminNotes: z.string().trim().max(2000).optional().nullable(),
});

export type SubmitFeedbackInput = z.infer<typeof SubmitFeedbackSchema>;
export type AdminFeedbacksInput = z.infer<typeof AdminFeedbacksInputSchema>;
export type UpdateFeedbackInput = z.infer<typeof UpdateFeedbackSchema>;
