import { makeExecutableSchema } from '@graphql-tools/schema';
import { mergeTypeDefs, mergeResolvers } from '@graphql-tools/merge';
import { authTypeDefs } from './modules/auth/typeDefs.js';
import { authResolvers } from './modules/auth/resolvers.js';

const rootTypeDefs = `#graphql
	type Query
	type Mutation
`;

export const schema = makeExecutableSchema({
	typeDefs: mergeTypeDefs([rootTypeDefs, authTypeDefs]),
	resolvers: mergeResolvers([authResolvers]),
});
