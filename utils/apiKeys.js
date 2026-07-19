const path = require('path');
const ApiKey = require(path.join(global.__basedir, 'db/schemas/apiKey.js'));

let cache = {};
let refreshTimer = null;

function buildGitHubFallbackConfig() {
    const adminKey = process.env.ADMIN_KEY;
    if (!adminKey) return null;

    return {
        githubAdmin: {
            key: adminKey,
            valid: true,
            perm: 'all',
            rateLimit: { limit: 9999, windowMs: 60 * 1000 },
            meta: { source: 'env' },
        },
    };
}

async function fetchApiKeysFromDb() {
    const docs = await ApiKey.find({}).lean();
    const data = {};
    docs.forEach((doc) => {
        data[doc.name] = {
            key: doc.key,
            valid: doc.valid,
            perm: doc.perm,
            rateLimit: doc.rateLimit,
            meta: doc.meta,
        };
    });
    return data;
}

/**
 * Loads the API keys config. github uses the ADMIN_KEY env var
 */
async function loadApiKeysConfig() {
    const isGithubEnv = String(process.env.NODE_ENV || '').toLowerCase() === 'github';

    if (isGithubEnv) {
        const fallback = buildGitHubFallbackConfig();
        if (fallback) return { data: fallback, source: 'env' };
    }

    try {
        const data = await fetchApiKeysFromDb();
        return { data, source: 'mongo' };
    } catch (error) {
        console.error('Failed to load API keys from MongoDB:', error.message);
        return { data: {}, source: 'error' };
    }
}

async function refreshApiKeysCache() {
    const { data } = await loadApiKeysConfig();
    cache = data;
    return cache;
}

function getApiKeysCache() {
    return cache;
}

function startApiKeysAutoRefresh(intervalMs = 60000) {
    if (refreshTimer) return;
    refreshTimer = setInterval(() => {
        refreshApiKeysCache().catch((err) => console.error('ApiKeys cache refresh failed:', err.message));
    }, intervalMs);
    if (refreshTimer.unref) refreshTimer.unref();
}

module.exports = {
    loadApiKeysConfig,
    refreshApiKeysCache,
    getApiKeysCache,
    startApiKeysAutoRefresh,
    buildGitHubFallbackConfig,
};