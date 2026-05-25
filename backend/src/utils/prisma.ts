import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readEnvFileValue(key: string): string | undefined {
	try {
		const envPath = resolve(process.cwd(), '.env');
		const file = readFileSync(envPath, 'utf8');
		const line = file
			.split(/\r?\n/)
			.find((entry) => entry.trim().startsWith(`${key}=`) && !entry.trim().startsWith('#'));

		if (!line) return undefined;

		const rawValue = line.slice(key.length + 1).trim();
		return rawValue.replace(/^"|"$/g, '');
	} catch {
		return undefined;
	}
}

function normalizeDatabaseUrl(
	value: string | undefined,
	fallbackKey: 'DATABASE_URL' | 'DIRECT_URL'
) {
	if (value && !value.startsWith('prisma://')) {
		return value;
	}

	return readEnvFileValue(fallbackKey) ?? value;
}

const datasourceUrl = normalizeDatabaseUrl(process.env.DATABASE_URL, 'DATABASE_URL');

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		datasources: datasourceUrl
			? {
					db: {
						url: datasourceUrl,
					},
				}
			: undefined,
	});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
