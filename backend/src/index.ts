import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { schema } from './graphql/schema.js';
import { extractAuthUser } from './middleware/auth.js';
import type { GraphQLContext } from './types/context.js';

const allowedOrigins = env.FRONTEND_URL.split(',').map((o) => o.trim());

async function bootstrap() {
	const app = express();

	app.use(
		cors({
			origin: (origin, callback) => {
				if (!origin || allowedOrigins.includes(origin)) {
					callback(null, true);
				} else {
					logger.warn({ origin }, 'CORS blocked origin');
					callback(new Error('Not allowed by CORS'));
				}
			},
			credentials: true,
		})
	);
	app.use(express.json());

	app.get('/health', (_req, res) => {
		res.json({ status: 'ok', timestamp: new Date().toISOString() });
	});

	const server = new ApolloServer<GraphQLContext>({ schema });
	await server.start();

	app.use(
		'/graphql',
		expressMiddleware(server, {
			context: async ({ req }) => ({ user: extractAuthUser(req) }),
		}) as unknown as express.RequestHandler
	);

	app.listen(env.PORT, () => {
		logger.info(`Server running on http://localhost:${env.PORT}`);
		logger.info(`GraphQL endpoint: http://localhost:${env.PORT}/graphql`);
		logger.info({ allowedOrigins }, 'CORS allowed origins');
	});
}

bootstrap().catch((err) => {
	logger.error(err, 'Failed to start server');
	process.exit(1);
});
