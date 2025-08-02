'use strict'


var express = require('express');
var app = module.exports = express();
var fs = require('fs');
var path = require('path');
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
            url: 'http://localhost:3000/api',
        },
    ],
};

const swaggerOptions = {
    swaggerDefinition,
    apis: ['./tniv/*.js', './lcfr/*.js'], 
};

function error(status, msg) {
    var err = new Error(msg);
    err.status = status;
    return err;
}

// get api keys
var envPath = path.join(__dirname, '/envs/apikeys.env.json');
var apiKeyCategories = {};
try {
    var envData = fs.readFileSync(envPath, 'utf8');
    var envJson = JSON.parse(envData);
    for (const [category, keysObj] of Object.entries(envJson)) {
        apiKeyCategories[category.toLowerCase()] = Object.values(keysObj);
    }
} catch (e) {
    console.error('Failed to load API keys from apikeys.env.json:', e);
    a
}

function apiKeyMiddleware(category) {
    return function (req, res, next) {
        var key = req.get("api-key")
        if (!key) return next(error(400, 'api key required'));
        var allowedKeys = apiKeyCategories[category.toLowerCase()] || [];
        if (allowedKeys.indexOf(key) === -1) return next(error(401, 'invalid api key for ' + category));
        req.key = key;
        next();
    };
}
// Logger 
const logFilePath = path.join(__dirname, 'access.log');
app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api-docs')) return next();
    const apiKey = req.get('api-key') || 'none';
    const code = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const logLine = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - api-key: ${apiKey} - ${code}`;
    console.log(logLine);
    fs.appendFile(logFilePath, logLine + '\n', err => {
        if (err) console.error('Failed to write log:', err);
    });
    next();
});
// Admin endpoint
app.get('/api/admin/logs', (req, res) => {
    let n = parseInt(req.query.n, 10) || 100;
    if (n < 1) n = 1;
    if (n > 1000) n = 1000;
    fs.readFile(logFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Could not read log file' });
        const lines = data.trim().split('\n');
        const lastLines = lines.slice(-n);
        res.json({ logs: lastLines });
    });
});

// Import routes

let tnivRoutes = require('./tniv'); let tnivInternalRoutes = require('./tniv/internal'); 
app.use('/api/tniv', apiKeyMiddleware('TNIV'), tnivRoutes);
app.use('/api/tniv/internal', apiKeyMiddleware('TNIV'), tnivInternalRoutes);

let lcfrRoutes = require('./lcfr');
app.use('/api/lcfr', apiKeyMiddleware('LCFR'), lcfrRoutes);

const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));



// Utility

app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.send({ error: err.message });
});

app.use(function (req, res) {
    res.status(404);
    res.send({ error: "Sorry, can't find that" })
});

/* istanbul ignore next */
if (!module.parent) {
    var port = process.env.PORT || 3000;
    app.listen(port);
    console.log(`Express started on port ${port}`);
}