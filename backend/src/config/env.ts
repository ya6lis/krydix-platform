import { z } from 'zod';

const envSchema = z.object({
	NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
	PORT: z.coerce.number().default(5000),
	LOG_LEVEL: z.string().default('info'),
	FRONTEND_URL: z.string().default('http://localhost:5173'),

	DATABASE_URL: z.string().url(),
	DIRECT_URL: z.string().url().optional(),

	JWT_ACCESS_SECRET: z.string().min(16),
	JWT_REFRESH_SECRET: z.string().min(16),
	JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
	JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

	CLOUDINARY_CLOUD_NAME: z.string().optional(),
	CLOUDINARY_API_KEY: z.string().optional(),
	CLOUDINARY_API_SECRET: z.string().optional(),

	EMAIL_HOST: z.string().optional(),
	EMAIL_PORT: z.coerce.number().default(587),
	EMAIL_USER: z.string().optional(),
	EMAIL_PASSWORD: z.string().optional(),
	EMAIL_FROM: z.string().default('Krydix <noreply@krydix.com>'),
	DISABLE_EMAIL: z.coerce.boolean().default(false),

	RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
	RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

	MAX_FILE_SIZE: z.coerce.number().default(5242880),
	MAX_AVATAR_SIZE: z.coerce.number().default(2097152),

	SOCKET_IO_CORS_ORIGIN: z.string().default('http://localhost:5173'),

	VAPID_PUBLIC_KEY: z.string().optional(),
	VAPID_PRIVATE_KEY: z.string().optional(),
	VAPID_EMAIL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
	process.exit(1);
}

export const env = parsed.data;
