const crypto = require('crypto');

// Simple in-memory session store for admin UI. Not persisted.
// For multi-process deployments consider Redis or a shared store.
const sessions = new Map(); // token -> { apiKey, expires }

function createSession(apiKey, ttlSec = 600) {
    const token = crypto.randomBytes(24).toString('hex');
    const expires = Date.now() + ttlSec * 1000;
    sessions.set(token, { apiKey, expires });
    return { token, expires };
}

function validateSession(token) {
    if (!token) return null;
    const entry = sessions.get(token);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
        sessions.delete(token);
        return null;
    }
    return entry.apiKey;
}

function deleteSession(token) {
    return sessions.delete(token);
}

module.exports = { createSession, validateSession, deleteSession };
