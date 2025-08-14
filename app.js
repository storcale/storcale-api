const express = require('express');
const app = module.exports = express();
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const loadRoutes = require('./utils/loadRoutes');
app.use(express.json());
global.__basedir = `${__dirname}`;

// Swagger setup

const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'Storcale API',
        version: '1.0.0',
        description: 'API documentation for Storcale',
    },
    servers: [
        { url: 'https://storcale-api.omegadev.xyz/api' },
    ],
    components: {
        securitySchemes: {
            ApiKeyAuth: {
                type: 'apiKey',
                in: 'header',
                name: 'api-key'
            }
        }
    },
    security: [
        { ApiKeyAuth: [] }
    ]
};
const apiFiles = glob.sync('routes/**/*.js');
const swaggerOptions = {
    swaggerDefinition,
    apis: apiFiles,
};
const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// get api keys

const apiKeyPath = path.join(__dirname, '/envs/apikeys.env.json');
const apiKeysJson = JSON.parse(fs.readFileSync(apiKeyPath, 'utf8'));
// Logger 

const logFilePath = path.join(__dirname, 'access.log');
app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api-docs/') || req.originalUrl === '/api-docs') return next();
    if (!req.originalUrl.startsWith('/api/')) return next();
    const apiKey = req.get('api-key') || req.query?.['api-key'] || 'none';
    const code = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const body = req.body ? `- body: ${JSON.stringify(req.body)}` : '';
    res.on('finish', () => {
        const statusCode = res.statusCode;
        const logLine = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - api-key: ${apiKey} ${body} - response: ${statusCode} - ${code}`;
        console.log(logLine);
        try {
            fs.appendFileSync(logFilePath, logLine + '\n');
        } catch (err) {
            console.error('Failed to write log:', err);
        }

    });
    next();
});

// Automatically load routes
loadRoutes(app, path.join(__dirname, 'routes'), apiKeysJson);

app.use((err, req, res, next) => {
    res.status(err.status || 500).send({ error: err.message });
});

app.use((req, res) => {
    res.status(404).send({ error: "Sorry, can't find that" });
});


if (!module.parent) {
    const port = process.env.PORT || 9902;
    app.listen(port, () => {
        console.log(`Express started on port ${port}`);
    });
}
