const fs = require('fs');
const path = require('path');


function getPermsForPath(apiKeysJson, endpointPath) {
    const perms = {};
    for (const [category, entry] of Object.entries(apiKeysJson)) {
        if (category === 'perms' || category === 'publicDirs') continue;
        const key = entry.key;
        const keyPerms = (entry.perm || '').split(',').map(p => p.trim());

        keyPerms.forEach(p => {
            perms[p] = perms[p] || [];
            perms[p].push(key);
        });

        if (keyPerms.includes('all')) {
            perms['all'] = perms['all'] || [];
            perms['all'].push(key);
        }
    }

    return perms[endpointPath] || perms['all'] || [];
}

function apiKeyMiddleware(allowedKeys) {
    return (req, res, next) => {
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
                    const middleware = apiKeyMiddleware(allowedKeys);
                    app.use(`${baseUrl}/${endpointPath}`, middleware, router);
                    console.log(`Mounted PROTECTED route: ${baseUrl}/${endpointPath}`);
                }
            }
        });
    };

    walk(routesDir);
}

module.exports = loadRoutes;
