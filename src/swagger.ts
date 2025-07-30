import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { version } from '../package.json';

const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'ChainRemit Backend API',
        version,
        description:
            'Comprehensive API documentation for the ChainRemit backend, a decentralized microfinance and remittance platform built on StarkNet.',
        contact: {
            name: 'Support',
            url: 'https://github.com/MetroLogic/chainremit_backend/issues',
            email: 'support@chainremit.com',
        },
        license: {
            name: 'MIT',
            url: 'https://github.com/MetroLogic/chainremit_backend/blob/main/LICENSE',
        },
    },
    servers: [
        {
            url: `http://localhost:${process.env.PORT || 3000}`,
            description: 'Development server',
        },
        {
            url: 'https://api.chainremit.com',
            description: 'Production server',
        },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
        },
    },
    security: [
        {
            bearerAuth: [],
        },
    ],
};

const options = {
    swaggerDefinition,
    apis: ['./src/router/*.ts', './src/model/*.ts'],
};

const swaggerSpec = swaggerJSDoc(options);

export function setupSwagger(app: Express) {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });
}
