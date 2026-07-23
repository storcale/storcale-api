const express = require('express');
const app = module.exports = express();
const fs = require('fs');
const path = require('path');
const querystring = require('node:querystring');
const env = String(process.env.NODE_ENV || 'development').toLowerCase();
app.use(express.json());
global.__basedir = `${__dirname}`;

try {
    const dotenv = require('dotenv');
    dotenv.config({ path: path.join(__dirname, 'envs/.env') });
    dotenv.config({ path: path.join(__dirname, 'envs/webhook.env') });
    console.log('dotenv loaded');
} catch (error) {
    console.error('Error loading .env:', error);
}

const { connectDB } = require('./db/db');
const {
    refreshApiKeysCache,
    getApiKeysCache,
    startApiKeysAutoRefresh,
} = require('./utils/apiKeys');
const {
    refreshBannedIpsCache,
    getBannedIpsCache,
    startBannedIpsAutoRefresh,
} = require('./utils/bannedIps');
const loadRoutes = require('./utils/loadRoutes');
const { sendDeploymentStatus } = require('./utils/sendDeploymentStatus');
const { notifyRateLimitExceeded } = require('./utils/notify');
const { getOpenApiSpec } = require('./utils/openapiSpec');

const rateStore = new Map(); // ip/key -> array of epoch seconds

// Swagger setup
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = getOpenApiSpec();
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Admin UI routes
try {
    const adminUi = require('./routes/admin-ui');
    app.use(adminUi);
    console.log('Mounted ADMIN-UI routes');
} catch (e) {
    console.error('Failed to mount admin-ui routes', e);
}

function getRateLimitsForKey(key) {
    const globalWindow = Number(process.env.RATE_LIMIT_WINDOW_SEC) || 60;
    const globalMax = Number(process.env.RATE_LIMIT_MAX) || 60;
    if (!key || key === 'none') return { windowSec: globalWindow, max: globalMax };

    const apiKeysJson = getApiKeysCache();
    for (const entry of Object.values(apiKeysJson || {})) {
        if (!entry || typeof entry !== 'object') continue;
        if (entry.key === key) {
            const rawW = entry.rateLimit?.windowMs;
            const rawM = entry.rateLimit?.limit;
            const w = rawW !== undefined && rawW !== null ? Number(rawW) : null;
            const m = rawM !== undefined && rawM !== null ? Number(rawM) : null;
            const windowSec = w ? (w >= 1000 ? Math.floor(w / 1000) : w) : null;
            return { windowSec: windowSec || globalWindow, max: m || globalMax };
        }
    }
    return { windowSec: globalWindow, max: globalMax };
}

app.use((req, res, next) => {
    if (!req.originalUrl.startsWith('/api/')) return next();
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    if (getBannedIpsCache()[clientIp]) {
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
    const host = req.get('host') || 'localhost';
    const scheme = req.protocol || 'http';
    const baseUrl = `${scheme}://${host}${req.path}`;

    res.on('finish', () => {
        const statusCode = res.statusCode;
        const now = Math.floor(Date.now() / 1000);
        const identifier = apiKey && apiKey !== 'none' ? `key:${apiKey}` : `ip:${clientIp}`;
        const arr = rateStore.get(identifier) || [];
        const limits = getRateLimitsForKey(apiKey);
        const windowStart = now - limits.windowSec;
        const recent = arr.filter(t => t >= windowStart);
        const rateLeft = Math.max(0, limits.max - recent.length);
        const logLine = `[${new Date().toISOString()}] ${req.method} ${baseUrl} - api-key: ${apiKey.slice(0, 5)} - timestamp: ${timestamp} ${body} - query: ${query} - response: ${statusCode} - ip: ${clientIp} - rateLeft: ${rateLeft}`;

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

    if (['test', 'github'].includes(env)) {
        return next();
    }

    const apiKey = req.get('api-key') || req.query?.['api-key'] || 'none';
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const identifier = apiKey && apiKey !== 'none' ? `key:${apiKey}` : `ip:${clientIp}`;

    const limits = getRateLimitsForKey(apiKey);
    const now = Math.floor(Date.now() / 1000);
    const arr = rateStore.get(identifier) || [];
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

app.get('/api/admin/internal/rate-status', (req, res) => {
    const key = req.get('api-key') || req.query?.['api-key'];
    if (!key) return res.status(401).json({ error: 'API key required' });
    const apiKeysJson = getApiKeysCache();
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
    const apiKeysJson = getApiKeysCache();
    let found = null;
    for (const entry of Object.values(apiKeysJson || {})) {
        if (entry && entry.key === key) { found = entry; break; }
    }
    if (!found) return res.status(403).json({ error: 'Invalid API key' });
    const identifier = `key:${key}`;
    rateStore.delete(identifier);
    return res.json({ body: `Rate counter for ${identifier} reset.` });
});

let initialized = false;
let initPromise = null;

async function init() {
    if (initialized) return app;
    if (initPromise) return initPromise;

    initPromise = (async () => {
        console.time('Initialized API');
        const isTestLikeEnv = ['test', 'github'].includes(env);

        if (process.env.DB_URL) {
            console.log("Connecting to DB...")
            await connectDB();
        }

        await refreshApiKeysCache();
        await refreshBannedIpsCache();
        if(!isTestLikeEnv){
            startApiKeysAutoRefresh();
            startBannedIpsAutoRefresh();
        }
        

        const loadRoutesStart = Date.now();
        console.log("Loading routes...")
        console.time('loadRoutes');
        loadRoutes(app, path.join(__dirname, 'routes'));
        console.timeEnd('Routes loaded');
        const loadRoutesDurationMs = Date.now() - loadRoutesStart;

        app.use((err, req, res, next) => {
            res.status(err.status || 500).send({ error: err.message });
        });
        app.use((req, res) => {
            res.status(404).send({ error: "Sorry, can't find that" });
        });

        if (env === 'production') {
            sendDeploymentStatus({
                loadRoutesTimeMs: loadRoutesDurationMs,
                environment: env,
                status: 'success'
            }).catch((error) => {
                console.error('Deployment webhook failed:', error.message || error);
            });
        }

        initialized = true;
        console.timeEnd('Initialized API');
        return app;
    })();

    return initPromise;
}

module.exports = app;
module.exports.init = init;