import { gql } from '@apollo/client';
import type { ReleaseNoteStatus } from '@/constants/enums';

export interface ReleaseNoteTranslation {
	language: 'EN' | 'UK';
	title: string;
	body: string;
}

export interface ReleaseNoteItem {
	id: string;
	version: string;
	status: ReleaseNoteStatus;
	title: string;
	body: string;
	publishedAt: string | null;
	createdAt: string;
	updatedAt: string;
	authorName: string | null;
	translations: ReleaseNoteTranslation[];
}

export interface ReleaseNoteList {
	items: ReleaseNoteItem[];
	total: number;
	page: number;
	pageSize: number;
}

export const PUBLISHED_RELEASE_NOTES_QUERY = gql`
	query PublishedReleaseNotes($language: Language!, $limit: Int) {
		publishedReleaseNotes(language: $language, limit: $limit) {
			id
			version
			title
			body
			publishedAt
			createdAt
		}
	}
`;

export const LATEST_RELEASE_NOTE_QUERY = gql`
	query LatestReleaseNote($language: Language!) {
		latestReleaseNote(language: $language) {
			id
			version
			title
			body
			publishedAt
			createdAt
		}
	}
`;

export const UNSEEN_RELEASE_NOTES_COUNT_QUERY = gql`
	query UnseenReleaseNotesCount($sincePublishedAt: String) {
		unseenReleaseNotesCount(sincePublishedAt: $sincePublishedAt)
	}
`;

export const ADMIN_RELEASE_NOTES_QUERY = gql`
	query AdminReleaseNotes($input: AdminReleaseNotesInput) {
		adminReleaseNotes(input: $input) {
			items {
				id
				version
				status
				title
				publishedAt
				updatedAt
				authorName
				translations {
					language
					title
					body
				}
			}
			total
			page
			pageSize
		}
	}
`;

export const CREATE_RELEASE_NOTE_MUTATION = gql`
	mutation CreateReleaseNote($input: CreateReleaseNoteInput!) {
		createReleaseNote(input: $input) {
			id
			version
			status
		}
	}
`;

export const UPDATE_RELEASE_NOTE_MUTATION = gql`
	mutation UpdateReleaseNote($input: UpdateReleaseNoteInput!) {
		updateReleaseNote(input: $input) {
			id
			version
			status
		}
	}
`;

export const DELETE_RELEASE_NOTE_MUTATION = gql`
	mutation DeleteReleaseNote($id: ID!) {
		deleteReleaseNote(id: $id)
	}
`;

export interface AdminReleaseNotesData {
	adminReleaseNotes: ReleaseNoteList;
}

export interface AdminReleaseNotesVars {
	input?: {
		page?: number;
		pageSize?: number;
		status?: ReleaseNoteStatus;
		search?: string;
	};
}

export interface PublishedReleaseNotesData {
	publishedReleaseNotes: ReleaseNoteItem[];
}

export interface PublishedReleaseNotesVars {
	language: 'EN' | 'UK';
	limit?: number;
}

export interface LatestReleaseNoteData {
	latestReleaseNote: ReleaseNoteItem | null;
}

export interface LatestReleaseNoteVars {
	language: 'EN' | 'UK';
}

export interface UnseenReleaseNotesCountData {
	unseenReleaseNotesCount: number;
}

export interface UnseenReleaseNotesCountVars {
	sincePublishedAt?: string | null;
}
