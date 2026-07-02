const express = require('express');
const app = module.exports = express();
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const loadRoutes = require('./utils/loadRoutes');
const querystring = require('node:querystring');
app.use(express.json());
global.__basedir = `${__dirname}`;

const bannedIpsPath = path.join(__dirname, '/envs/banned_ips.env.json');

function readBannedIps() {
    try {
        if (!fs.existsSync(bannedIpsPath)) return {};
        return JSON.parse(fs.readFileSync(bannedIpsPath, 'utf8') || '{}');
    } catch (e) {
        return {};
    }
}

// Cache 
let bannedIpsCache = readBannedIps();

try {
    fs.watch(bannedIpsPath, { persistent: false }, (eventType) => {
        if (eventType === 'change' || eventType === 'rename') {
            bannedIpsCache = readBannedIps();
        }
    });
} catch (e) {

}

function writeBannedIps(obj) {
    try {
        fs.writeFileSync(bannedIpsPath, JSON.stringify(obj, null, 2));
        bannedIpsCache = obj; // keep cache authoritative immediately, no re-read needed
        return true;
    } catch (e) {
        return false;
    }
}

const { notifyRateLimitExceeded } = require('./utils/notify');
const rateLimitWindowSec = Number(process.env.RATE_LIMIT_WINDOW_SEC) || 60; // seconds
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX) || 60; // max requests per window
const rateStore = new Map(); // ip -> array of epoch seconds

try {
    const dotenv = require('dotenv')
    dotenv.config({ path: path.join(__dirname, 'envs/.env') });
    dotenv.config({ path: path.join(__dirname, 'envs/webhook.env') });
    console.log('dotenv loaded');
} catch (error) {
    console.error('Error loading .env:', error);
}

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

// Admin UI routes
try {
    const adminUi = require('./routes/admin-ui');
    app.use(adminUi);
    console.log('Mounted ADMIN-UI routes');
} catch (e) {
    console.error('Failed to mount admin-ui routes', e);
}

// get api keys

const apiKeyPath = path.join(__dirname, '/envs/apikeys.env.json');
const apiKeysJson = JSON.parse(fs.readFileSync(apiKeyPath, 'utf8'));


const rateLimitCache = new Map();

function getRateLimitsForKey(key) {
    const globalWindow = Number(process.env.RATE_LIMIT_WINDOW_SEC) || 60;
    const globalMax = Number(process.env.RATE_LIMIT_MAX) || 60;

    if (!key || key === 'none') return { windowSec: globalWindow, max: globalMax };

    const cached = rateLimitCache.get(key);
    if (cached) return cached;

    let result = { windowSec: globalWindow, max: globalMax };
    try {
        for (const [name, entry] of Object.entries(apiKeysJson || {})) {
            if (!entry || typeof entry !== 'object') continue;
            if (entry.key === key || entry.apiKey === key || name === key) {
                // support common field names and nested rateLimit object
                const rawW = (entry.rateLimit && (entry.rateLimit.windowMs || entry.rateLimit.windowSec || entry.rateLimit.window)) ||
                    entry.rateLimitWindowSec || entry.rateWindow || entry.window || entry.rate_window;
                const rawM = (entry.rateLimit && (entry.rateLimit.limit || entry.rateLimit.max)) ||
                    entry.rateLimitMax || entry.rateMax || entry.max || entry.rate_max;
                const w = rawW !== undefined && rawW !== null ? Number(rawW) : null;
                const m = rawM !== undefined && rawM !== null ? Number(rawM) : null;
                // if window looks like milliseconds (>=1000), convert to seconds
                const windowSec = w ? (w >= 1000 ? Math.floor(w / 1000) : w) : null;
                result = { windowSec: windowSec || globalWindow, max: m || globalMax };
                break;
            }
        }
    } catch (e) {
        // fall back to global
    }

    rateLimitCache.set(key, result);
    return result;
}

app.use((req, res, next) => {
    if (!req.originalUrl.startsWith('/api/')) return next();
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    if (bannedIpsCache[clientIp]) {
        res.status(403).json({ error: 'You are banned.' });
        return;
    }
    next();
});

// ? Logger
const logFilePath = path.join(__dirname, 'access.log');
app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api-docs/') || req.originalUrl === '/api-docs') return next();
    if (!req.originalUrl.startsWith('/api/')) return next();
    const apiKey = req.get('api-key') || req.query?.['api-key'] || 'none';
    const timestamp = req.get('timestamp') || 'none';
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const body = req.body ? `- body: ${JSON.stringify(req.body)}` : '';
    const query = Object.keys(req.query).length > 0 ? querystring.stringify(req.query) : 'No Query';

    res.on('finish', () => {
        const statusCode = res.statusCode;
        //
        const now = Math.floor(Date.now() / 1000);
        const identifier = apiKey && apiKey !== 'none' ? `key:${apiKey}` : `ip:${clientIp}`;
        const arr = rateStore.get(identifier) || [];
        const limits = getRateLimitsForKey(apiKey);
        const windowStart = now - limits.windowSec;
        const recent = arr.filter(t => t >= windowStart);
        const rateLeft = Math.max(0, limits.max - recent.length);
        const logLine = `[${new Date().toISOString()}] ${req.method} ${req.url} - api-key: ${apiKey} - timestamp: ${timestamp} ${body} - query: ${query} - response: ${statusCode} - ip: ${clientIp} - rateLeft: ${rateLeft}`;

        console.log(logLine);

        try {
            fs.appendFileSync(logFilePath, logLine + '\n');
        } catch (err) {
            console.error('Failed to write log:', err);
        }
    });

    next();
});

app.use((req, res, next) => {
    if (!req.originalUrl.startsWith('/api/')) return next();

    const apiKey = req.get('api-key') || req.query?.['api-key'] || 'none';
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const identifier = apiKey && apiKey !== 'none' ? `key:${apiKey}` : `ip:${clientIp}`;

   

    const limits = getRateLimitsForKey(apiKey);
    const now = Math.floor(Date.now() / 1000);
    const arr = rateStore.get(identifier) || [];
    // remove old entries
    const windowStart = now - limits.windowSec;
    const recent = arr.filter(t => t >= windowStart);
    recent.push(now);
    rateStore.set(identifier, recent);

    if (recent.length > limits.max) {
        const excess = recent.length - limits.max;
        try {
            if (excess > 0 && excess % 10 === 0) {
                notifyRateLimitExceeded({ ip: clientIp, identifier, apiKey: apiKey !== 'none' ? apiKey : null, path: req.originalUrl, method: req.method, query: req.query, body: req.body, count: recent.length, rateLeft: Math.max(0, limits.max - recent.length), rateLimit: limits.max })
                    .catch(() => {});
            }
        } catch (e) {
            console.error('notifyRateLimitExceeded failed:', e);
        }
        res.status(429).json({ error: 'Rate limit exceeded.' });
        return;
    }

    next();
});

// Automatically load routes
console.time('loadRoutes');
loadRoutes(app, path.join(__dirname, 'routes'), apiKeysJson);
console.timeEnd("loadRoutes");

app.get('/api/admin/internal/rate-status', (req, res) => {
    const key = req.get('api-key') || req.query?.['api-key'];
    if (!key) return res.status(401).json({ error: 'API key required' });
    // find entry
    let found = null;
    for (const entry of Object.values(apiKeysJson || {})) {
        if (entry && entry.key === key) { found = entry; break; }
    }
    if (!found) return res.status(403).json({ error: 'Invalid API key' });
    const identifier = `key:${key}`;
    const now = Math.floor(Date.now() / 1000);
    const limits = getRateLimitsForKey(key);
    const arr = rateStore.get(identifier) || [];
    const recent = arr.filter(t => t >= now - limits.windowSec);
    return res.json({ identifier, count: recent.length, windowSec: limits.windowSec, max: limits.max, rateLeft: Math.max(0, limits.max - recent.length) });
});

app.post('/api/admin/internal/rate-reset', (req, res) => {
    const key = req.get('api-key') || req.body?.['api-key'];
    if (!key) return res.status(401).json({ error: 'API key required' });
    // find entry
    let found = null;
    for (const entry of Object.values(apiKeysJson || {})) {
        if (entry && entry.key === key) { found = entry; break; }
    }
    if (!found) return res.status(403).json({ error: 'Invalid API key' });
    const identifier = `key:${key}`;
    rateStore.delete(identifier);
    return res.json({ body: `Rate counter for ${identifier} reset.` });
});

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