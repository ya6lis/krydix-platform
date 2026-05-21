import { makeExecutableSchema } from '@graphql-tools/schema';

const typeDefs = `#graphql
  type Query {
    health: String!
  }
`;

const resolvers = {
	Query: {
		health: () => 'ok',
	},
};

export const schema = makeExecutableSchema({ typeDefs, resolvers });
