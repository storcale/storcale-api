const fs = require('fs');
const path = require('path');
const rateLimitPerKey = require('./rateLimit');
const { validateSession } = require('./adminSessions');
const { getApiKeysCache } = require('./apiKeys');


const PUBLIC_DIRS = (process.env.PUBLIC_DIRS || '')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

function getAllowedKeysForEndpoint(endpointPath) {
    const apiKeysJson = getApiKeysCache();
    const perms = {};
    const allKeys = [];

    for (const entry of Object.values(apiKeysJson || {})) {
        if (!entry || entry.valid === false) continue;
        const key = entry.key;
        const keyPerms = (entry.perm || '').split(',').map((p) => p.trim()).filter(Boolean);

        keyPerms.forEach((p) => {
            perms[p] = perms[p] || [];
            perms[p].push(key);
        });

        if (keyPerms.includes('all')) {
            allKeys.push(key);
        }
    }

    const endpointKeys = perms[endpointPath] || [];
    return Array.from(new Set([...endpointKeys, ...allKeys]));
}

function apiKeyMiddleware(endpointPath) {
    return (req, res, next) => {
        const allowedKeys = getAllowedKeysForEndpoint(endpointPath);

        // support session token for admin UI: 'x-admin-session' header
        const sessionToken = req.get('x-admin-session') || req.query?.['admin-session'];
        if (sessionToken) {
            const apiKey = validateSession(sessionToken);
            if (!apiKey) return res.status(401).json({ error: 'Invalid or expired session' });
            if (!allowedKeys.includes(apiKey)) return res.status(403).json({ error: 'Invalid API key for this endpoint' });
            req.key = apiKey;
            req.adminSession = sessionToken;
            return next();
        }

        const key = req.get('api-key') || req.query?.['api-key'];
        if (!key) return res.status(401).json({ error: 'API key required' });
        if (!allowedKeys.includes(key)) return res.status(403).json({ error: 'Invalid API key' });
        req.key = key;
        next();
    };
}

function loadRoutes(app, routesDir, baseUrl = '/api') {
    const walk = (dir, prefix = '') => {
        const entries = fs.readdirSync(dir);
        entries.forEach((file) => {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                walk(fullPath, path.join(prefix, file));
            } else if (file === 'index.js') {
                const routePath = path.join(prefix).replace(/\\/g, '/');
                const endpointPath = routePath.replace(/^\/?/, '');
                const dirName = path.basename(path.join(prefix));
                const isPublic = PUBLIC_DIRS.includes(dirName.toLowerCase());

                try {
                    const router = require(fullPath);

                    if (isPublic) {
                        app.use(`${baseUrl}/${endpointPath}`, router);
                        console.log(`Mounted PUBLIC route: ${baseUrl}/${endpointPath}`);
                    } else {
                        const middleware = [
                            apiKeyMiddleware(endpointPath),
                            rateLimitPerKey(),
                        ];

                        app.use(`${baseUrl}/${endpointPath}`, middleware, router);
                        console.log(`Mounted PROTECTED route: ${baseUrl}/${endpointPath}`);
                    }
                } catch (err) {
                    console.warn(`\n Failed to load route: ${baseUrl}/${endpointPath}`);
                    console.warn(`   File: ${fullPath}`);
                    console.warn(err.stack || err);
                }
            }
        });
    };
    walk(routesDir);
}

module.exports = loadRoutes;