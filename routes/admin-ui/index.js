const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { exec } = require('child_process');
const { createSessionCookie, verifySessionCookie, clearCookieHeader } = require(path.join(global.__basedir, '/utils/adminAuth.js'));
const { getBannedIpsCache, banIp, unbanIp } = require(path.join(global.__basedir, '/utils/bannedIps.js'));
const { refreshApiKeysCache } = require(path.join(global.__basedir, '/utils/apiKeys.js'));
const { createSession } = require(path.join(global.__basedir, '/utils/adminSessions.js'));
const { getOpenApiSpec } = require(path.join(global.__basedir, '/utils/openapiSpec.js'));
const ApiKey = require(path.join(global.__basedir, 'db/schemas/apiKey.js'));
const { getWebhookByCode, getWebhooksCache, addWebhook, removeWebhook } = require(path.join(global.__basedir, '/utils/webhooks.js'));
const Webhook = require(path.join(global.__basedir, 'db/schemas/webhook.js'));
const LOG_PATH = path.join(global.__basedir, 'access.log');

function runReloadScript() {
    const scriptPath = path.join(global.__basedir, '/scripts/reload.sh');
    return new Promise((resolve, reject) => {
        exec(`"${scriptPath}"`, (error, stdout, stderr) => {
            if (error) return reject(error);
            resolve(stdout || stderr || 'Reload executed');
        });
    });
}

// static assets for the dashboard (css/js) — no auth needed, no secrets live here
router.use('/admin-ui/static', express.static(path.join(__dirname, 'static')));

// public UI pages
router.get('/admin-ui/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});
router.get('/admin-ui/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// API: login
router.post('/api/admin-ui/login', express.json(), (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'username/password required' });
    const adminUser = process.env.ADMIN_UI_USER;
    const adminPass = process.env.ADMIN_UI_PASS;
    if (username !== adminUser || password !== adminPass) return res.status(403).json({ error: 'Invalid creds' });
    const cookie = createSessionCookie(username);
    res.setHeader('Set-Cookie', `admin_ui_session=${cookie}; Path=/; HttpOnly; SameSite=Lax`);
    return res.json({ ok: true });
});

// API: logout
router.post('/api/admin-ui/logout', (req, res) => {
    res.setHeader('Set-Cookie', clearCookieHeader());
    return res.json({ ok: true });
});

// helper auth guard
function requireAuth(req, res, next) {
    const cookie = req.get('cookie') || '';
    const match = cookie.split(';').map(s => s.trim()).find(s => s.startsWith('admin_ui_session='));
    let token = null;
    if (match) {
        const idx = match.indexOf('=');
        token = idx >= 0 ? match.substring(idx + 1) : null;
    }
    const user = verifySessionCookie(token);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    req.adminUser = user;
    next();
}

// API: who am i (used by the dashboard on load to confirm the session is still valid)
router.get('/api/admin-ui/me', requireAuth, (req, res) => {
    return res.json({ user: req.adminUser });
});

// API: logs (simple tail)
router.get('/api/admin-ui/logs', requireAuth, (req, res) => {
    const n = Number(req.query.n) || 500;
    try {
        const raw = fs.existsSync(LOG_PATH) ? fs.readFileSync(LOG_PATH, 'utf8') : '';
        const lines = raw.split(/\r?\n/).filter(Boolean);
        const tail = lines.slice(-n);
        return res.json({ logs: tail });
    } catch (e) { return res.status(500).json({ error: e.message }); }
});

// API: stats (requests per day + total)
router.get('/api/admin-ui/stats', requireAuth, (req, res) => {
    try {
        const raw = fs.existsSync(LOG_PATH) ? fs.readFileSync(LOG_PATH, 'utf8') : '';
        const lines = raw.split(/\r?\n/).filter(Boolean);
        const total = lines.length;
        const perDay = {};
        lines.forEach(l => {
            const m = l.match(/^\[(.*?)\]/);
            if (!m) return;
            const d = new Date(m[1]);
            const k = d.toISOString().slice(0, 10);
            perDay[k] = (perDay[k] || 0) + 1;
        });
        return res.json({ total, perDay });
    } catch (e) { return res.status(500).json({ error: e.message }); }
});

// API: bans management (MongoDB-backed)
router.get('/api/admin-ui/bans', requireAuth, (req, res) => {
    return res.json({ bans: getBannedIpsCache() });
});
router.post('/api/admin-ui/bans', requireAuth, express.json(), async (req, res) => {
    const { ip, reason } = req.body || {};
    if (!ip) return res.status(400).json({ error: 'ip required' });
    try {
        const bans = await banIp(ip, reason || 'admin', req.adminUser);
        return res.json({ ok: true, bans });
    } catch (e) { return res.status(500).json({ error: e.message }); }
});
router.delete('/api/admin-ui/bans', requireAuth, async (req, res) => {
    const ip = req.query.ip || req.body?.ip;
    if (!ip) return res.status(400).json({ error: 'ip required' });
    if (!getBannedIpsCache()[ip]) return res.status(404).json({ error: 'not found' });
    try {
        const bans = await unbanIp(ip);
        return res.json({ ok: true, bans });
    } catch (e) { return res.status(500).json({ error: e.message }); }
});

// admin-ui reload endpoint (protected) — executes reload script server-side
router.post('/api/admin-ui/reload', requireAuth, async (req, res) => {
    try {
        const output = await runReloadScript();
        return res.json({ ok: true, output });
    } catch (e) {
        return res.status(500).json({ error: e.message || String(e) });
    }
});

// API: keys management (MongoDB-backed)
router.get('/api/admin-ui/keys', requireAuth, async (req, res) => {
    try {
        const docs = await ApiKey.find({}).lean();
        function maskKey(s) {
            if (!s || typeof s !== 'string') return null;
            if (s.length <= 8) return s.replace(/./g, '*');
            return `${s.slice(0, 4)}...${s.slice(-4)}`;
        }
        const out = docs.map(d => ({ name: d.name, id: d.name, masked: maskKey(d.key), valid: d.valid !== false, perm: d.perm || '', meta: d.meta || {} }));
        return res.json({ keys: out });
    } catch (e) { return res.status(500).json({ error: e.message }); }
});

router.put('/api/admin-ui/keys/deactivate', requireAuth, express.json(), async (req, res) => {
    const key = req.body?.key || req.query?.key;
    if (!key) return res.status(400).json({ error: 'key required' });
    try {
        const result = await ApiKey.updateMany({ key }, { $set: { valid: false } });
        if (!result.matchedCount) return res.status(404).json({ error: 'API key not found' });
        await refreshApiKeysCache();
        return res.json({ ok: true });
    } catch (e) { return res.status(500).json({ error: e.message }); }
});
function parseAccessLogLine(line) {
    const tsMatch = line.match(/^\[(.*?)\]/);
    if (!tsMatch) return null;

    const methodUrlMatch = line.match(/\]\s+(\S+)\s+(\S+)\s+-/);
    if (!methodUrlMatch) return null;

    const bodyMarker = '- body: ';
    const queryMarker = ' - query: ';
    const responseMarker = ' - response: ';

    const bodyIdx = line.indexOf(bodyMarker);
    const queryIdx = line.indexOf(queryMarker);
    const responseIdx = line.indexOf(responseMarker);

    let bodyStr = null;
    if (bodyIdx !== -1 && queryIdx !== -1 && queryIdx > bodyIdx) {
        bodyStr = line.slice(bodyIdx + bodyMarker.length, queryIdx);
    }

    let queryStr = null;
    if (queryIdx !== -1 && responseIdx !== -1) {
        queryStr = line.slice(queryIdx + queryMarker.length, responseIdx);
    }

    const responseMatch = line.match(/response:\s*(\d+)/);

    return {
        timestamp: tsMatch[1],
        method: methodUrlMatch[1],
        url: methodUrlMatch[2],
        bodyStr,
        queryStr,
        status: responseMatch ? Number(responseMatch[1]) : null,
    };
}
// API: list configured webhooks (name/code only — never expose the url to the browser)
router.get('/api/admin-ui/webhooks', requireAuth, async (req, res) => {
    try {
        const docs = await Webhook.find({}).select('name code').lean();
        return res.json({ webhooks: docs });
    } catch (e) { return res.status(500).json({ error: e.message }); }
});

// API: webhook send history — parsed straight out of access.log, no extra storage
router.get('/api/admin-ui/webhooks/logs', requireAuth, (req, res) => {
    try {
        const { code, keyword } = req.query;
        const n = Math.max(1, Math.min(500, Number(req.query.n) || 100));

        const raw = fs.existsSync(LOG_PATH) ? fs.readFileSync(LOG_PATH, 'utf8') : '';
        const lines = raw.split(/\r?\n/).filter(Boolean);
        const webhooksCache = getWebhooksCache();
        const results = [];

        for (let i = lines.length - 1; i >= 0 && results.length < n; i--) {
            const parsed = parseAccessLogLine(lines[i]);
            if (!parsed) continue;
            if (parsed.method !== 'POST') continue;
            if (!parsed.url.includes('/tniv/webhooks')) continue;
            if (parsed.status !== 200) continue;
            if (!parsed.bodyStr) continue;

            let payload;
            try { payload = JSON.parse(parsed.bodyStr); } catch { continue; }

            let webhookCode = null;
            if (parsed.queryStr) {
                const m = parsed.queryStr.match(/target=([^&]+)/);
                if (m) webhookCode = decodeURIComponent(m[1]);
            }
            if (code && webhookCode !== code) continue;

            const entryName = webhooksCache[webhookCode]?.name || webhookCode || 'unknown';

            if (keyword) {
                const kw = String(keyword).toLowerCase();
                const haystack = `${JSON.stringify(payload)} ${entryName} ${webhookCode || ''}`.toLowerCase();
                if (!haystack.includes(kw)) continue;
            }

            results.push({ timestamp: parsed.timestamp, code: webhookCode, name: entryName, payload });
        }

        return res.json({ logs: results });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// API: OpenAPI spec, used to auto-build the Routes explorer tab.
// Built once from the same @swagger JSDoc comments that already power /api-docs.
router.get('/api/admin-ui/openapi', requireAuth, (req, res) => {
    try {
        const spec = getOpenApiSpec(req.query.refresh === 'true');
        return res.json(spec);
    } catch (e) { return res.status(500).json({ error: e.message }); }
});

// API: mint a short-lived x-admin-session token bound to ADMIN_KEY.
// The Routes explorer uses this as the "x-admin-session" header so it can
// call protected /api/* endpoints directly from the browser (see
// utils/loadRoutes.js apiKeyMiddleware) without ever exposing ADMIN_KEY itself.
router.post('/api/admin-ui/routes-session', requireAuth, express.json(), (req, res) => {
    const adminKey = process.env.ADMIN_KEY;
    if (!adminKey) return res.status(500).json({ error: 'ADMIN_KEY is not configured on the server' });
    const ttl = Math.min(Number(req.body?.ttl) || 900, 3600);
    const { token, expires } = createSession(adminKey, ttl);
    return res.json({ token, expires });
});

module.exports = router;
