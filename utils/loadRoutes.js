const fs = require('fs');
const path = require('path');
const rateLimitPerKey = require('./rateLimit');
// signature middleware removed: we only use API keys for auth now
const { validateSession } = require('./adminSessions');

function getPermsForPath(apiKeysJson, endpointPath) {
    const perms = {};
    const allKeys = [];
    for (const [category, entry] of Object.entries(apiKeysJson)) {
        if (category === 'perms' || category === 'publicDirs') continue;
        if (!entry.valid) continue;
        const key = entry.key;
        const keyPerms = (entry.perm || '').split(',').map(p => p.trim());

        keyPerms.forEach(p => {
            perms[p] = perms[p] || [];
            perms[p].push(key);
        });

        if (keyPerms.includes('all')) {
            allKeys.push(key);
        }
        // console.log(`API Key for category ${category}: ${key} with perms: ${keyPerms}`);
    }

    const endpointKeys = perms[endpointPath] || [];
    return Array.from(new Set([...endpointKeys, ...allKeys]));
}

function apiKeyMiddleware(allowedKeys) {
    // Find the apiKeysJson in closure
    return (req, res, next) => {
        // support session token for admin UI: 'x-admin-session' header
        const sessionToken = req.get('x-admin-session') || req.query?.['admin-session'];
        if (sessionToken) {
            const apiKey = validateSession(sessionToken);
            if (!apiKey) return res.status(401).json({ error: 'Invalid or expired session' });
            if (!allowedKeys.includes(apiKey)) return res.status(403).json({ error: 'Invalid API key for this endpoint' });
            // attach session info and skip signature requirement later
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
function loadRoutes(app, routesDir, apiKeysJson, baseUrl = '/api') {
    const publicDirs = (apiKeysJson.publicDirs || []).map(dir => dir.toLowerCase());

    const walk = (dir, prefix = '') => {
        fs.readdirSync(dir).forEach(file => {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                walk(fullPath, path.join(prefix, file));
            } else if (file === 'index.js') {
                const routePath = path.join(prefix).replace(/\\/g, '/');
                const endpointPath = routePath.replace(/^\/?/, '');
                const router = require(fullPath);

                const dirName = path.basename(path.join(prefix));
                const isPublic = publicDirs.includes(dirName.toLowerCase());

                if (isPublic) {
                    app.use(`${baseUrl}/${endpointPath}`, router);
                    console.log(`Mounted PUBLIC route: ${baseUrl}/${endpointPath}`);
                } else {
                    const allowedKeys = getPermsForPath(apiKeysJson, endpointPath);
                    // We'll use a wrapper that enforces rate-limiting and API key middleware.
                    const middleware = [
                        apiKeyMiddleware(allowedKeys),
                        rateLimitPerKey(apiKeysJson),
                    ];
                    // console.log(`Allowed keys for ${endpointPath}:`, allowedKeys);
                    app.use(`${baseUrl}/${endpointPath}`, middleware, router);
                    console.log(`Mounted PROTECTED route: ${baseUrl}/${endpointPath}`);
                }
            }
        });
    };

    walk(routesDir);
}

module.exports = loadRoutes;
