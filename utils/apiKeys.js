const fs = require('fs');
const path = require('path');

function getApiKeysPath(baseDir = process.cwd()) {
    return path.join(baseDir, 'envs', 'apikeys.env.json');
}

function buildGitHubFallbackConfig() {
    const adminKey = process.env.ADMIN_KEY;
    if (!adminKey) return null;

    return {
        githubAdmin: {
            key: adminKey,
            valid: true,
            perm: 'all',
            meta: {
                source: 'env'
            }
        }
    };
}

function loadApiKeysConfig(baseDir = process.cwd()) {
    const apikeysPath = getApiKeysPath(baseDir);
    const isGithubEnv = String(process.env.NODE_ENV || '').toLowerCase() === 'github';

    if (isGithubEnv) {
        const fallback = buildGitHubFallbackConfig();
        if (fallback) {
            return { data: fallback, path: apikeysPath, source: 'env' };
        }
    }

    if (!fs.existsSync(apikeysPath)) {
        return { data: {}, path: apikeysPath, source: 'missing' };
    }

    try {
        const raw = fs.readFileSync(apikeysPath, 'utf8') || '{}';
        const parsed = JSON.parse(raw);
        return { data: parsed || {}, path: apikeysPath, source: 'file' };
    } catch (error) {
        return { data: {}, path: apikeysPath, source: 'error' };
    }
}

module.exports = {
    getApiKeysPath,
    buildGitHubFallbackConfig,
    loadApiKeysConfig,
};
