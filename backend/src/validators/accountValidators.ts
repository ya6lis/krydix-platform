import { z } from 'zod';

export const CloseAccountSchema = z.object({
	password: z.string().min(1),
});
