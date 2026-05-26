import i18n from '@/i18n';
import { LAST_SEEN_RELEASE_NOTE_KEY } from '@/constants/constants';

export function getGraphqlLanguage(): 'EN' | 'UK' {
	return i18n.language.startsWith('uk') ? 'UK' : 'EN';
}

export function getLastSeenReleasePublishedAt(): string | null {
	return localStorage.getItem(LAST_SEEN_RELEASE_NOTE_KEY);
}

export function markReleaseNoteSeen(publishedAt: string | null | undefined) {
	if (!publishedAt) return;
	localStorage.setItem(LAST_SEEN_RELEASE_NOTE_KEY, publishedAt);
}
