const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { exec } = require('child_process');
const { createSessionCookie, verifySessionCookie, clearCookieHeader } = require(path.join(global.__basedir, '/utils/adminAuth.js'));
const { getBannedIpsCache, banIp, unbanIp } = require(path.join(global.__basedir, '/utils/bannedIps.js'));
const { refreshApiKeysCache } = require(path.join(global.__basedir, '/utils/apiKeys.js'));
const ApiKey = require(path.join(global.__basedir, 'db/schemas/apiKey.js'));

const LOG_PATH = path.join(global.__basedir, 'access.log');

function runReloadScript() {
    const scriptPath = path.join(global.__basedir, '/reload.sh');
    return new Promise((resolve, reject) => {
        exec(`"${scriptPath}"`, (error, stdout, stderr) => {
            if (error) return reject(error);
            resolve(stdout || stderr || 'Reload executed');
        });
    });
}

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
        const out = docs.map(d => ({ name: d.name, id: d.name, masked: maskKey(d.key), valid: d.valid !== false, meta: d.meta || {} }));
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

module.exports = router;