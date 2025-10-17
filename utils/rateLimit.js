const rateLimit = require("express-rate-limit");

function rateLimitPerKey(apiKeysJson) {
    const keyLimiters = {};

    for (const entry of Object.values(apiKeysJson)) {
        if (!entry.key) continue;

        const limit = entry.rateLimit?.limit || 30;
        const windowMs = entry.rateLimit?.windowMs || 60 * 1000;

        keyLimiters[entry.key] = rateLimit({
            windowMs,
            max: limit,
            keyGenerator: (req) => req.get("api-key") || "unknown",
            standardHeaders: true,
            legacyHeaders: false,
            message: { error: "Too many requests for this API key" }
        });
    }
    const defaultLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: 20,
        keyGenerator: (req) => req.get("api-key") || "unknown",
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: "Too many requests for this API key" }
    });

    return (req, res, next) => {
        const apiKey = req.get("api-key");
        const limiter = keyLimiters[apiKey] || defaultLimiter;
        limiter(req, res, next);
    };
}

module.exports = rateLimitPerKey;
