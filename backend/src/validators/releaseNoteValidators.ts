import { z } from 'zod';
import { ReleaseNoteStatus } from '../constants/enums.js';

export const RELEASE_NOTE_VERSION_PATTERN = /^\d+\.\d+(\.\d+)?(-[\w.]+)?$/;

export function normalizeReleaseNoteVersion(value: string): string {
	return value.trim().replace(/^[vV]/, '');
}

const versionSchema = z.preprocess(
	(value) => (typeof value === 'string' ? normalizeReleaseNoteVersion(value) : value),
	z
		.string()
		.min(1, 'Version is required')
		.regex(RELEASE_NOTE_VERSION_PATTERN, 'Version must look like 1.0 or 1.0.0'),
);

const translationFields = {
	titleEn: z.string().trim().min(3, 'English title must be at least 3 characters').max(200),
	titleUk: z.string().trim().min(3, 'Ukrainian title must be at least 3 characters').max(200),
	bodyEn: z.string().trim().min(10, 'English changes must be at least 10 characters').max(10000),
	bodyUk: z.string().trim().min(10, 'Ukrainian changes must be at least 10 characters').max(10000),
};

export const CreateReleaseNoteSchema = z.object({
	version: versionSchema,
	publish: z.boolean().optional(),
	...translationFields,
});

export const UpdateReleaseNoteSchema = z.object({
	id: z.string().min(1),
	version: versionSchema,
	status: z.nativeEnum(ReleaseNoteStatus),
	...translationFields,
});

export const AdminReleaseNotesInputSchema = z.object({
	page: z.number().int().min(0).default(0),
	pageSize: z.number().int().min(1).max(100).default(25),
	status: z.nativeEnum(ReleaseNoteStatus).optional(),
	search: z.string().trim().max(200).optional(),
});

export type CreateReleaseNoteInput = z.infer<typeof CreateReleaseNoteSchema>;
export type UpdateReleaseNoteInput = z.infer<typeof UpdateReleaseNoteSchema>;
export type AdminReleaseNotesInput = z.infer<typeof AdminReleaseNotesInputSchema>;
