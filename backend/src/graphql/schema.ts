import { makeExecutableSchema } from '@graphql-tools/schema';
import { mergeTypeDefs, mergeResolvers } from '@graphql-tools/merge';
import { authTypeDefs } from './modules/auth/typeDefs.js';
import { authResolvers } from './modules/auth/resolvers.js';
import { catalogTypeDefs } from './modules/catalog/typeDefs.js';
import { catalogResolvers } from './modules/catalog/resolvers.js';

const rootTypeDefs = `#graphql
	type Query
	type Mutation
`;

export const schema = makeExecutableSchema({
	typeDefs: mergeTypeDefs([rootTypeDefs, authTypeDefs, catalogTypeDefs]),
	resolvers: mergeResolvers([authResolvers, catalogResolvers]),
});
