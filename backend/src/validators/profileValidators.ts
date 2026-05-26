import { z } from 'zod';

export const UpdateProfileSchema = z.object({
	firstName: z.string().trim().min(1).max(60),
	lastName: z.string().trim().min(1).max(60),
	displayName: z.string().trim().max(80).optional().nullable(),
	bio: z.string().trim().max(500).optional().nullable(),
	phone: z.string().trim().max(30).optional().nullable(),
	country: z.string().trim().max(80).optional().nullable(),
	city: z.string().trim().max(80).optional().nullable(),
});

export const UploadProfileAvatarSchema = z.object({
	dataUrl: z.string().min(1),
});
