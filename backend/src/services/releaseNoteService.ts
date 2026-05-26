import { GraphQLError } from 'graphql';
import type { ZodSchema } from 'zod';
import type { Language } from '@prisma/client';
import { AuditAction, ReleaseNoteStatus } from '../constants/enums.js';
import * as auditLogService from './auditLogService.js';
import * as repo from '../repositories/releaseNoteRepository.js';
import {
	AdminReleaseNotesInputSchema,
	CreateReleaseNoteSchema,
	UpdateReleaseNoteSchema,
} from '../validators/releaseNoteValidators.js';

type GraphqlLanguage = 'EN' | 'UK';

function parseReleaseNoteInput<T>(schema: ZodSchema<T>, input: unknown): T {
	const result = schema.safeParse(input);
	if (!result.success) {
		const message = result.error.errors.map((issue) => issue.message).join(' ');
		throw new GraphQLError(message, {
			extensions: { code: 'BAD_USER_INPUT' },
		});
	}
	return result.data;
}

function buildUserName(user: repo.RawReleaseNote['createdBy']): string {
	const profile = user.profile;
	if (!profile) return user.email;
	return `${profile.firstName} ${profile.lastName}`.trim();
}

function pickTranslation(note: repo.RawReleaseNote, language: GraphqlLanguage) {
	const preferred = note.translations.find((item) => item.language === language);
	const fallback = note.translations.find((item) => item.language === 'EN') ?? note.translations[0];

	if (!preferred && !fallback) {
		throw new GraphQLError('Release note translation missing', {
			extensions: { code: 'INTERNAL_SERVER_ERROR' },
		});
	}

	return preferred ?? fallback!;
}

function serializeReleaseNote(
	note: repo.RawReleaseNote,
	language: GraphqlLanguage,
	options: { includeAllTranslations?: boolean } = {},
) {
	const translation = pickTranslation(note, language);

	return {
		id: note.id,
		version: note.version,
		status: note.status,
		title: translation.title,
		body: translation.body,
		publishedAt: note.publishedAt?.toISOString() ?? null,
		createdAt: note.createdAt.toISOString(),
		updatedAt: note.updatedAt.toISOString(),
		authorName: buildUserName(note.createdBy),
		translations: options.includeAllTranslations
			? note.translations.map((item) => ({
					language: item.language,
					title: item.title,
					body: item.body,
				}))
			: [],
	};
}

function buildTranslations(input: {
	titleEn: string;
	titleUk: string;
	bodyEn: string;
	bodyUk: string;
}) {
	return [
		{ language: 'EN' as Language, title: input.titleEn, body: input.bodyEn },
		{ language: 'UK' as Language, title: input.titleUk, body: input.bodyUk },
	];
}

export async function getLatestReleaseNote(language: GraphqlLanguage) {
	const note = await repo.findLatestPublishedReleaseNote();
	if (!note) return null;
	return serializeReleaseNote(note, language);
}

export async function getPublishedReleaseNotes(language: GraphqlLanguage, limit = 10) {
	const cappedLimit = Math.min(Math.max(limit, 1), 20);
	const notes = await repo.listPublishedReleaseNotes(cappedLimit);
	return notes.map((note) => serializeReleaseNote(note, language));
}

export async function getUnseenReleaseNotesCount(sincePublishedAt?: string | null) {
	const since = sincePublishedAt ? new Date(sincePublishedAt) : null;
	if (since && Number.isNaN(since.getTime())) {
		throw new GraphQLError('Invalid sincePublishedAt value', {
			extensions: { code: 'BAD_USER_INPUT' },
		});
	}
	return repo.countPublishedSince(since);
}

export async function getAdminReleaseNotes(input: unknown) {
	const parsed = parseReleaseNoteInput(AdminReleaseNotesInputSchema, input ?? {});
	const { items, total } = await repo.listReleaseNotes(parsed);

	return {
		items: items.map((item) => serializeReleaseNote(item, 'EN', { includeAllTranslations: true })),
		total,
		page: parsed.page,
		pageSize: parsed.pageSize,
	};
}

export async function getAdminReleaseNoteById(id: string) {
	const note = await repo.findReleaseNoteById(id);
	if (!note) return null;
	return serializeReleaseNote(note, 'EN', { includeAllTranslations: true });
}

export async function createReleaseNote(adminId: string, input: unknown) {
	const parsed = parseReleaseNoteInput(CreateReleaseNoteSchema, input);
	const existing = await repo.findReleaseNoteByVersion(parsed.version);
	if (existing) {
		throw new GraphQLError('Release note version already exists', {
			extensions: { code: 'BAD_USER_INPUT' },
		});
	}

	const status = parsed.publish ? ReleaseNoteStatus.PUBLISHED : ReleaseNoteStatus.DRAFT;
	const publishedAt = parsed.publish ? new Date() : null;

	const note = await repo.createReleaseNote({
		version: parsed.version,
		status,
		publishedAt,
		createdById: adminId,
		translations: buildTranslations(parsed),
	});

	await auditLogService.log({
		actorId: adminId,
		action: AuditAction.RELEASE_NOTE_CHANGE,
		targetType: 'ReleaseNote',
		targetId: note.id,
		metadata: { action: 'create', version: note.version, status: note.status },
	});

	return serializeReleaseNote(note, 'EN', { includeAllTranslations: true });
}

export async function updateReleaseNote(adminId: string, input: unknown) {
	const parsed = parseReleaseNoteInput(UpdateReleaseNoteSchema, input);
	const existing = await repo.findReleaseNoteById(parsed.id);
	if (!existing) {
		throw new GraphQLError('Release note not found', { extensions: { code: 'NOT_FOUND' } });
	}

	if (parsed.version !== existing.version) {
		const versionTaken = await repo.findReleaseNoteByVersion(parsed.version);
		if (versionTaken && versionTaken.id !== parsed.id) {
			throw new GraphQLError('Release note version already exists', {
				extensions: { code: 'BAD_USER_INPUT' },
			});
		}
	}

	let publishedAt = existing.publishedAt;
	if (parsed.status === ReleaseNoteStatus.PUBLISHED && !publishedAt) {
		publishedAt = new Date();
	}
	if (parsed.status === ReleaseNoteStatus.DRAFT) {
		publishedAt = null;
	}

	const note = await repo.updateReleaseNote(parsed.id, {
		version: parsed.version,
		status: parsed.status,
		publishedAt,
		translations: buildTranslations(parsed),
	});

	await auditLogService.log({
		actorId: adminId,
		action: AuditAction.RELEASE_NOTE_CHANGE,
		targetType: 'ReleaseNote',
		targetId: note.id,
		metadata: { action: 'update', version: note.version, status: note.status },
	});

	return serializeReleaseNote(note, 'EN', { includeAllTranslations: true });
}

export async function deleteReleaseNote(adminId: string, id: string) {
	const existing = await repo.findReleaseNoteById(id);
	if (!existing) {
		throw new GraphQLError('Release note not found', { extensions: { code: 'NOT_FOUND' } });
	}

	await repo.deleteReleaseNote(id);

	await auditLogService.log({
		actorId: adminId,
		action: AuditAction.RELEASE_NOTE_CHANGE,
		targetType: 'ReleaseNote',
		targetId: id,
		metadata: { action: 'delete', version: existing.version },
	});

	return true;
}
