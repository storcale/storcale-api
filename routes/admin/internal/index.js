const express = require('express');
const router = express.Router();
const path = require('path');
const { exec } = require('child_process');
const { notifyRateLimitExceeded } = require(path.join(global.__basedir, '/utils/notify.js'));
const { createSession } = require(path.join(global.__basedir, '/utils/adminSessions.js'));
const ApiKey = require(path.join(global.__basedir, 'db/schemas/apiKey.js'));
const { banIp, unbanIp, getBannedIpsCache } = require(path.join(global.__basedir, '/utils/bannedIps.js'));
const { refreshApiKeysCache } = require(path.join(global.__basedir, '/utils/apiKeys.js'));

function reload() {
    const scriptPath = path.join(global.__basedir, '/scripts/reload.sh');
    return new Promise((resolve, reject) => {
        exec(`"${scriptPath}"`, (error, stdout) => {
            if (error) return reject(error);
            resolve(stdout || 'Reload/Deploy script executed.');
        });
    });
}

// POST /reload
router.post('/reload', async (req, res) => {
    try {
        res.json({ body: 'Reloading!' });
        await reload();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /ban-ips - list banned IPs
router.get('/ban-ips', (req, res) => {
    try {
        return res.json({ bans: getBannedIpsCache() });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// POST /create-session - create a short-lived admin UI session token
router.post('/create-session', (req, res) => {
    try {
        const apiKey = req.get('api-key') || req.body?.['api-key'];
        if (!apiKey) return res.status(401).json({ error: 'API key required' });
        const ttl = Number(req.body?.ttl) || 600; // seconds
        const { token, expires } = createSession(apiKey, ttl);
        return res.json({ token, expires });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// POST /ban-ip - ban an IP
router.post('/ban-ip', async (req, res) => {
    try {
        const { ip, reason } = req.body || {};
        if (!ip) return res.status(400).json({ error: 'Missing ip in body.' });
        await banIp(ip, reason || 'unspecified', req.user?.username || req.body?.by || 'admin');
        return res.json({ body: `IP ${ip} banned.`, bans: getBannedIpsCache() });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// DELETE /ban-ip - unban an IP (body or query ip)
router.delete('/ban-ip', async (req, res) => {
    try {
        const ip = req.body?.ip || req.query?.ip;
        if (!ip) return res.status(400).json({ error: 'Missing ip.' });
        if (!getBannedIpsCache()[ip]) return res.status(404).json({ error: 'IP not found in bans.' });
        await unbanIp(ip);
        return res.json({ body: `IP ${ip} unbanned.`, bans: getBannedIpsCache() });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// PUT /deactivate
router.put('/deactivate', async (req, res) => {
    const apiKey = req.body.key;
    if (!apiKey) return res.status(400).json({ error: 'Missing key query param.' });

    try {
        const result = await ApiKey.updateMany({ key: apiKey }, { $set: { valid: false } });
        if (!result.matchedCount) return res.status(404).json({ error: 'API key not found.' });

        await refreshApiKeysCache();
        res.json({ body: `API key ${apiKey} deactivated, reloading....` });
        reload().catch(err => console.error('Reload failed:', err));
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;