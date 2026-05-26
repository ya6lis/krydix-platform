import type { Language, Prisma, ReleaseNoteStatus } from '@prisma/client';
import { prisma } from '../utils/prisma.js';

const releaseNoteInclude = {
	translations: true,
	createdBy: { include: { profile: true } },
} satisfies Prisma.ReleaseNoteInclude;

export type RawReleaseNote = Prisma.ReleaseNoteGetPayload<{ include: typeof releaseNoteInclude }>;

export async function findLatestPublishedReleaseNote() {
	return prisma.releaseNote.findFirst({
		where: { status: 'PUBLISHED' },
		include: releaseNoteInclude,
		orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
	});
}

export async function listPublishedReleaseNotes(limit: number) {
	return prisma.releaseNote.findMany({
		where: { status: 'PUBLISHED' },
		include: releaseNoteInclude,
		orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
		take: limit,
	});
}

export async function countPublishedSince(sincePublishedAt?: Date | null) {
	const where: Prisma.ReleaseNoteWhereInput = { status: 'PUBLISHED' };
	if (sincePublishedAt) {
		where.publishedAt = { gt: sincePublishedAt };
	}
	return prisma.releaseNote.count({ where });
}

export async function findReleaseNoteById(id: string) {
	return prisma.releaseNote.findUnique({
		where: { id },
		include: releaseNoteInclude,
	});
}

export async function findReleaseNoteByVersion(version: string) {
	return prisma.releaseNote.findUnique({
		where: { version },
		include: releaseNoteInclude,
	});
}

export async function listReleaseNotes(params: {
	page: number;
	pageSize: number;
	status?: ReleaseNoteStatus;
	search?: string;
}) {
	const where: Prisma.ReleaseNoteWhereInput = {};

	if (params.status) where.status = params.status;
	if (params.search) {
		where.OR = [
			{ version: { contains: params.search, mode: 'insensitive' } },
			{
				translations: {
					some: {
						OR: [
							{ title: { contains: params.search, mode: 'insensitive' } },
							{ body: { contains: params.search, mode: 'insensitive' } },
						],
					},
				},
			},
		];
	}

	const [items, total] = await Promise.all([
		prisma.releaseNote.findMany({
			where,
			include: releaseNoteInclude,
			orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
			skip: params.page * params.pageSize,
			take: params.pageSize,
		}),
		prisma.releaseNote.count({ where }),
	]);

	return { items, total };
}

export async function createReleaseNote(data: {
	version: string;
	status: ReleaseNoteStatus;
	publishedAt: Date | null;
	createdById: string;
	translations: Array<{ language: Language; title: string; body: string }>;
}) {
	const { translations, ...noteData } = data;

	return prisma.releaseNote.create({
		data: {
			...noteData,
			translations: {
				create: translations,
			},
		},
		include: releaseNoteInclude,
	});
}

export async function updateReleaseNote(
	id: string,
	data: {
		version: string;
		status: ReleaseNoteStatus;
		publishedAt: Date | null;
		translations: Array<{ language: Language; title: string; body: string }>;
	},
) {
	const { translations, ...noteData } = data;

	return prisma.$transaction(async (tx) => {
		await tx.releaseNoteTranslation.deleteMany({ where: { releaseNoteId: id } });

		return tx.releaseNote.update({
			where: { id },
			data: {
				...noteData,
				translations: {
					create: translations,
				},
			},
			include: releaseNoteInclude,
		});
	});
}

export async function deleteReleaseNote(id: string) {
	await prisma.releaseNote.delete({ where: { id } });
}
