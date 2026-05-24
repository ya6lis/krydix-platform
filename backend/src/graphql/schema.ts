import { makeExecutableSchema } from '@graphql-tools/schema';
import { mergeTypeDefs, mergeResolvers } from '@graphql-tools/merge';
import { authTypeDefs } from './modules/auth/typeDefs.js';
import { authResolvers } from './modules/auth/resolvers.js';
import { catalogTypeDefs } from './modules/catalog/typeDefs.js';
import { catalogResolvers } from './modules/catalog/resolvers.js';
import { cartTypeDefs } from './modules/cart/typeDefs.js';
import { cartResolvers } from './modules/cart/resolvers.js';
import { checkoutTypeDefs } from './modules/checkout/typeDefs.js';
import { checkoutResolvers } from './modules/checkout/resolvers.js';

const rootTypeDefs = `#graphql
	type Query
	type Mutation
`;

export const schema = makeExecutableSchema({
	typeDefs: mergeTypeDefs([
		rootTypeDefs,
		authTypeDefs,
		catalogTypeDefs,
		cartTypeDefs,
		checkoutTypeDefs,
	]),
	resolvers: mergeResolvers([authResolvers, catalogResolvers, cartResolvers, checkoutResolvers]),
});
