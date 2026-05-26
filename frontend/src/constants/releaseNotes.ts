export const RELEASE_NOTE_VERSION_PATTERN = /^\d+\.\d+(\.\d+)?(-[\w.]+)?$/;

export const RELEASE_NOTE_TITLE_MIN = 3;
export const RELEASE_NOTE_BODY_MIN = 10;

export const RELEASE_NOTES_HISTORY_LIMIT = 10;

export function normalizeReleaseNoteVersion(value: string): string {
	return value.trim().replace(/^[vV]/, '');
}
