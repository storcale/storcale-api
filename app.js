const express = require('express');
const app = module.exports = express();
const fs = require('fs');
const path = require('path');
app.use(express.json());

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
        {
            url: 'https://storcale-api.omegadev.xyz/api',
        },
    ],
};


const swaggerOptions = {
    swaggerDefinition,
    apis: ['./tniv/*.js', './lcfr/*.js', './tniv/internal/*.js'],
};


function error(status, msg) {
    const err = new Error(msg);
    err.status = status;
    return err;
}

// get api keys

const envPath = path.join(__dirname, '/envs/apikeys.env.json');
let apiKeyCategories = {};
try {
    const envData = fs.readFileSync(envPath, 'utf8');
    const envJson = JSON.parse(envData);
    for (const [category, keysObj] of Object.entries(envJson)) {
        apiKeyCategories[category.toLowerCase()] = Object.values(keysObj);
    }
} catch (e) {
    console.error('Failed to load API keys from apikeys.env.json:', e);
}


function apiKeyMiddleware(category) {
    return (req, res, next) => {
        const key = req.get('api-key') || req.query?.['api-key'];
        if (!key) return next(error(401, 'api key required'));
        const allowedKeys = apiKeyCategories[category.toLowerCase()] || [];
        if (!allowedKeys.includes(key)) return next(error(403, 'invalid api key for ' + category));
        req.key = key;
        next();
    };
}
// Logger 

const logFilePath = path.join(__dirname, 'access.log');
app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api-docs/') || req.originalUrl === '/api-docs') return next();
    if (!req.originalUrl.startsWith('/api/')) return next();
    const apiKey = req.get('api-key') || req.query?.['api-key'] || 'none';
    const code = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const logLine = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - api-key: ${apiKey} - ${code}`;
    console.log(logLine);
    try {
        fs.appendFileSync(logFilePath, logLine + '\n');
    } catch (err) {
        console.error('Failed to write log:', err);
    }
    next();
});

// Admin endpoint

app.get('/api/admin/logs', apiKeyMiddleware('ADMIN'), (req, res) => {
    let n = Math.max(1, Math.min(1000, parseInt(req.query.n, 10) || 100));
    fs.readFile(logFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Could not read log file' });
        const lines = data.trim().split('\n');
        res.json({ logs: lines.slice(-n) });
    });
});

// Import routes
const adminRoutes = require('./admin');
app.use('/api/admin/dashboard', apiKeyMiddleware('ADMIN'), adminRoutes);
app.get('/api/admin', (req, res) => {
    res.sendFile(path.join(__dirname, './admin/connect.html'));
});

const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const tnivRoutes = require('./tniv');
const tnivInternalRoutes = require('./tniv/internal');
app.use('/api/tniv', apiKeyMiddleware('TNIV'), tnivRoutes);
app.use('/api/tniv/internal', apiKeyMiddleware('TNIV'), tnivInternalRoutes);

const lcfrRoutes = require('./lcfr');
app.use('/api/lcfr', apiKeyMiddleware('LCFR'), lcfrRoutes);



// Utility


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