import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import logger from './utils/logger';
import { setupSwagger } from './swagger';
import authRouter from '../src/router/auth.router';

import ratesRouter from '../src/router/rates.router';

import { scheduleRatesJob } from '../src/jobs/rates.job';

// Load environment variables
const env = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${env}` });

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(
    morgan('combined', {
        stream: {
            write: (message: string) => logger.info(message.trim()),
        },
    }),
);
app.use(compression());
app.use(express.json());

// Swagger API docs
setupSwagger(app);

app.use('/auth', authRouter);
app.use('/api/rates', ratesRouter);

// Health check endpoint
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', env: process.env.NODE_ENV });
});

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response) => {
    logger.error('Unhandled error', { error: err });
    res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
    const server = app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
        scheduleRatesJob();
    });
    // WebSocket setup
    import('../src/ws/rates.ws').then(({ setupRatesWebSocket }) => {
        setupRatesWebSocket(server);
    });
}

export default app;
