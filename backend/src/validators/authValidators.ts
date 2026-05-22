import { z } from 'zod';

export const RegisterInputSchema = z.object({
	email: z.string().email('Invalid email'),
	password: z.string().min(8, 'Password must be at least 8 characters'),
	firstName: z.string().min(1).max(50),
	lastName: z.string().min(1).max(50),
});

export const LoginInputSchema = z.object({
	email: z.string().email('Invalid email'),
	password: z.string().min(1, 'Password is required'),
});
