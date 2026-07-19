const rateLimit = require('express-rate-limit');
const { getApiKeysCache } = require('./apiKeys');

const limiterCache = new Map();

function buildLimiter(limit, windowMs) {
    const cacheKey = `${limit}:${windowMs}`;
    if (limiterCache.has(cacheKey)) return limiterCache.get(cacheKey);

    const limiter = rateLimit({
        windowMs,
        max: limit,
        keyGenerator: (req) => req.get('api-key') || 'unknown',
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Too many requests for this API key' },
    });

    limiterCache.set(cacheKey, limiter);
    return limiter;
}

function rateLimitPerKey() {
    const isTestLikeEnv = ['test', 'github'].includes(String(process.env.NODE_ENV || '').toLowerCase());
    if (isTestLikeEnv) {
        return (req, res, next) => next();
    }

    return (req, res, next) => {
        const apiKey = req.get('api-key');
        const apiKeysJson = getApiKeysCache();

        let limit = 20;
        let windowMs = 60 * 1000;
        for (const entry of Object.values(apiKeysJson || {})) {
            if (entry && entry.key === apiKey) {
                limit = entry.rateLimit?.limit || 30;
                windowMs = entry.rateLimit?.windowMs || 60 * 1000;
                break;
            }
        }

        const limiter = buildLimiter(limit, windowMs);
        limiter(req, res, next);
    };
}

module.exports = rateLimitPerKey;
