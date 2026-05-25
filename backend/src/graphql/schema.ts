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
import { ordersTypeDefs } from './modules/orders/typeDefs.js';
import { ordersResolvers } from './modules/orders/resolvers.js';
import { sellerProductsTypeDefs } from './modules/sellerProducts/typeDefs.js';
import { sellerProductsResolvers } from './modules/sellerProducts/resolvers.js';
import { sellerDashboardTypeDefs } from './modules/sellerDashboard/typeDefs.js';
import { sellerDashboardResolvers } from './modules/sellerDashboard/resolvers.js';
import { moderationTypeDefs } from './modules/moderation/typeDefs.js';
import { moderationResolvers } from './modules/moderation/resolvers.js';
import { reviewsTypeDefs } from './modules/reviews/typeDefs.js';
import { reviewsResolvers } from './modules/reviews/resolvers.js';
import { reviewModerationTypeDefs } from './modules/reviewModeration/typeDefs.js';
import { reviewModerationResolvers } from './modules/reviewModeration/resolvers.js';
import { adminTypeDefs } from './modules/admin/typeDefs.js';
import { adminResolvers } from './modules/admin/resolvers.js';

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
		ordersTypeDefs,
		sellerProductsTypeDefs,
		sellerDashboardTypeDefs,
		moderationTypeDefs,
		reviewsTypeDefs,
		reviewModerationTypeDefs,
		adminTypeDefs,
	]),
	resolvers: mergeResolvers([
		authResolvers,
		catalogResolvers,
		cartResolvers,
		checkoutResolvers,
		ordersResolvers,
		sellerProductsResolvers,
		sellerDashboardResolvers,
		moderationResolvers,
		reviewsResolvers,
		reviewModerationResolvers,
		adminResolvers,
	]),
});
