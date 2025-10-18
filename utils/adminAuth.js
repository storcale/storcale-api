const crypto = require('crypto');

const SECRET = process.env.SESSION_SECRET || 'change_this_secret';

function signPayload(payload) {
    return crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
}

function createSessionCookie(username, ttlSec = 3600) {
    const obj = { user: username, exp: Date.now() + ttlSec * 1000 };
    const payload = Buffer.from(JSON.stringify(obj)).toString('base64');
    const sig = signPayload(payload);
    return `${payload}.${sig}`;
}

function verifySessionCookie(cookie) {
    if (!cookie) return null;
    const parts = cookie.split('.');
    if (parts.length !== 2) return null;
    const [payload, sig] = parts;
    const expected = signPayload(payload);
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
    try {
        const obj = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
        if (Date.now() > obj.exp) return null;
        return obj.user;
    } catch (e) {
        return null;
    }
}

function clearCookieHeader() {
    // expire cookie
    return 'admin_ui_session=; Path=/; HttpOnly; Max-Age=0';
}

module.exports = { createSessionCookie, verifySessionCookie, clearCookieHeader };
