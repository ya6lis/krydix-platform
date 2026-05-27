import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { schema } from './graphql/schema.js';
import { extractAuthUser } from './middleware/auth.js';
import { touchLastSeen } from './services/presenceService.js';
import { initChatSocket } from './socket/chatSocket.js';
import { startOrderMonetizationJobs } from './services/orderJobService.js';
import { UPLOAD_MAX_FILE_SIZE_MB } from './constants/constants.js';
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
	app.use(express.json({ limit: `${UPLOAD_MAX_FILE_SIZE_MB}mb` }));
	app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
		if (err && typeof err === 'object' && 'type' in err && err.type === 'entity.too.large') {
			return res.status(413).json({
				error: 'PAYLOAD_TOO_LARGE',
				message: `File is too large. Max size is ${UPLOAD_MAX_FILE_SIZE_MB}MB.`,
			});
		}
		return next(err);
	});

	app.get('/health', (_req, res) => {
		res.json({ status: 'ok', timestamp: new Date().toISOString() });
	});

	const server = new ApolloServer<GraphQLContext>({ schema });
	await server.start();

	app.use(
		'/graphql',
		expressMiddleware(server, {
			context: async ({ req }) => {
				const user = extractAuthUser(req);
				if (user) touchLastSeen(user.id);
				return { user };
			},
		}) as unknown as express.RequestHandler
	);

	const httpServer = createServer(app);
	initChatSocket(httpServer);

	httpServer.listen(env.PORT, () => {
		logger.info(`Server running on http://localhost:${env.PORT}`);
		logger.info(`GraphQL endpoint: http://localhost:${env.PORT}/graphql`);
		logger.info(`Socket.IO chat enabled`);
		logger.info({ allowedOrigins }, 'CORS allowed origins');
		startOrderMonetizationJobs();
	});
}

bootstrap().catch((err) => {
	logger.error(err, 'Failed to start server');
	process.exit(1);
});
