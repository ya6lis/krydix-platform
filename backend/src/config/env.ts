import { z } from 'zod';

const envSchema = z.object({
	NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
	PORT: z.coerce.number().default(4000),
	DATABASE_URL: z.string().url(),
	JWT_ACCESS_SECRET: z.string().min(32),
	JWT_REFRESH_SECRET: z.string().min(32),
	JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
	JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
	CLOUDINARY_CLOUD_NAME: z.string().optional(),
	CLOUDINARY_API_KEY: z.string().optional(),
	CLOUDINARY_API_SECRET: z.string().optional(),
	GMAIL_USER: z.string().email().optional(),
	GMAIL_APP_PASSWORD: z.string().optional(),
	EMAIL_FROM: z.string().default('noreply@krydix.com'),
	RATE_AUTH_MAX: z.coerce.number().default(30),
	RATE_PASSWORD_RESET_MAX: z.coerce.number().default(10),
	RATE_PUBLIC_MAX: z.coerce.number().default(200),
	RATE_API_MAX: z.coerce.number().default(1000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
	process.exit(1);
}

export const env = parsed.data;
