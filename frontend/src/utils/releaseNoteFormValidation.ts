import {
	RELEASE_NOTE_VERSION_PATTERN,
	normalizeReleaseNoteVersion,
} from '@/constants/releaseNotes';

export type ReleaseNoteFormErrors = Partial<
	Record<'version' | 'titleEn' | 'titleUk' | 'bodyEn' | 'bodyUk', string>
>;

interface ReleaseNoteFormLike {
	version: string;
	titleEn: string;
	titleUk: string;
	bodyEn: string;
	bodyUk: string;
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

export function validateReleaseNoteForm(
	form: ReleaseNoteFormLike,
	t: Translate
): ReleaseNoteFormErrors {
	const errors: ReleaseNoteFormErrors = {};
	const version = normalizeReleaseNoteVersion(form.version);

	if (!version) {
		errors.version = t('adminReleaseNotes.validation.versionRequired');
	} else if (!RELEASE_NOTE_VERSION_PATTERN.test(version)) {
		errors.version = t('adminReleaseNotes.validation.versionFormat');
	}

	if (form.titleEn.trim().length < 3) {
		errors.titleEn = t('adminReleaseNotes.validation.titleMin', { min: 3 });
	}

	if (form.titleUk.trim().length < 3) {
		errors.titleUk = t('adminReleaseNotes.validation.titleMin', { min: 3 });
	}

	if (form.bodyEn.trim().length < 10) {
		errors.bodyEn = t('adminReleaseNotes.validation.bodyMin', { min: 10 });
	}

	if (form.bodyUk.trim().length < 10) {
		errors.bodyUk = t('adminReleaseNotes.validation.bodyMin', { min: 10 });
	}

	return errors;
}

export { normalizeReleaseNoteVersion };
