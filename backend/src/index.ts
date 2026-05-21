import express, { type RequestHandler } from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { schema } from './graphql/schema.js';
import type { GraphQLContext } from './types/context.js';

async function bootstrap() {
	const app = express();

	app.use(cors({ origin: '*', credentials: true }));
	app.use(express.json());

	app.get('/health', (_req, res) => {
		res.json({ status: 'ok', timestamp: new Date().toISOString() });
	});

	const server = new ApolloServer<GraphQLContext>({ schema });
	await server.start();

	app.use(
		'/graphql',
		expressMiddleware(server, {
			context: async () => ({ user: null }),
		}) as RequestHandler
	);

	app.listen(env.PORT, () => {
		logger.info(`Server running on http://localhost:${env.PORT}`);
		logger.info(`GraphQL endpoint: http://localhost:${env.PORT}/graphql`);
	});
}

bootstrap().catch((err) => {
	logger.error(err, 'Failed to start server');
	process.exit(1);
});
