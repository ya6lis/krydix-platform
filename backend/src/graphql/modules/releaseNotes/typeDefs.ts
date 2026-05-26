export const releaseNotesTypeDefs = `#graphql
	enum ReleaseNoteStatus {
		DRAFT
		PUBLISHED
	}

	type ReleaseNoteTranslation {
		language: Language!
		title: String!
		body: String!
	}

	type ReleaseNoteItem {
		id: ID!
		version: String!
		status: ReleaseNoteStatus!
		title: String!
		body: String!
		publishedAt: String
		createdAt: String!
		updatedAt: String!
		authorName: String
		translations: [ReleaseNoteTranslation!]!
	}

	type ReleaseNoteList {
		items: [ReleaseNoteItem!]!
		total: Int!
		page: Int!
		pageSize: Int!
	}

	input AdminReleaseNotesInput {
		page: Int
		pageSize: Int
		status: ReleaseNoteStatus
		search: String
	}

	input CreateReleaseNoteInput {
		version: String!
		titleEn: String!
		titleUk: String!
		bodyEn: String!
		bodyUk: String!
		publish: Boolean
	}

	input UpdateReleaseNoteInput {
		id: ID!
		version: String!
		titleEn: String!
		titleUk: String!
		bodyEn: String!
		bodyUk: String!
		status: ReleaseNoteStatus!
	}

	extend type Query {
		latestReleaseNote(language: Language!): ReleaseNoteItem
		publishedReleaseNotes(language: Language!, limit: Int): [ReleaseNoteItem!]!
		unseenReleaseNotesCount(sincePublishedAt: String): Int!
		adminReleaseNotes(input: AdminReleaseNotesInput): ReleaseNoteList!
		adminReleaseNote(id: ID!): ReleaseNoteItem
	}

	extend type Mutation {
		createReleaseNote(input: CreateReleaseNoteInput!): ReleaseNoteItem!
		updateReleaseNote(input: UpdateReleaseNoteInput!): ReleaseNoteItem!
		deleteReleaseNote(id: ID!): Boolean!
	}
`;
