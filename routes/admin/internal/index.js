const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { notifyRateLimitExceeded } = require(path.join(global.__basedir, '/utils/notify.js'));
const bannedIpsPath = path.join(global.__basedir, '/envs/banned_ips.json');
const { createSession } = require(path.join(global.__basedir, '/utils/adminSessions.js'));

function readBannedIps() {
    try {
        if (!fs.existsSync(bannedIpsPath)) return {};
        return JSON.parse(fs.readFileSync(bannedIpsPath, 'utf8') || '{}');
    } catch (e) {
        return {};
    }
}

function writeBannedIps(obj) {
    try {
        fs.writeFileSync(bannedIpsPath, JSON.stringify(obj, null, 2));
        return true;
    } catch (e) {
        return false;
    }
}

function reload() {
    const scriptPath = path.join(global.__basedir, '/reload.sh');
    return new Promise((resolve, reject) => {
        exec(`"${scriptPath}"`, (error, stdout, stderr) => {
            if (error) return reject(error);
            resolve(stdout || 'Reload/Deploy script executed.');
        });
    });
}

// POST /reload
router.post('/reload', async (req, res) => {
    try {
        res.json({ body: "Reloading!" });
        const output = await reload();
        
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /ban-ips - list banned IPs
router.get('/ban-ips', (req, res) => {
    try {
        const bans = readBannedIps();
        return res.json({ bans });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// POST /create-session - create a short-lived admin UI session token
router.post('/create-session', (req, res) => {
    try {
        const apiKey = req.get('api-key') || req.body?.['api-key'];
        if (!apiKey) return res.status(401).json({ error: 'API key required' });
        // At this point the route is protected by API key middleware, so apiKey is valid
        const ttl = Number(req.body?.ttl) || 600; // seconds
        const { token, expires } = createSession(apiKey, ttl);
        return res.json({ token, expires });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// POST /ban-ip - ban an IP
router.post('/ban-ip', (req, res) => {
    try {
        const { ip, reason } = req.body || {};
        if (!ip) return res.status(400).json({ error: 'Missing ip in body.' });
        const bans = readBannedIps();
        bans[ip] = {
            reason: reason || 'unspecified',
            bannedAt: new Date().toISOString(),
            bannedBy: req.user?.username || req.body?.by || 'admin'
        };
        if (!writeBannedIps(bans)) return res.status(500).json({ error: 'Failed to write bans file.' });
        return res.json({ body: `IP ${ip} banned.`, bans });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// DELETE /ban-ip - unban an IP (body or query ip)
router.delete('/ban-ip', (req, res) => {
    try {
        const ip = req.body?.ip || req.query?.ip;
        if (!ip) return res.status(400).json({ error: 'Missing ip.' });
        const bans = readBannedIps();
        if (!bans[ip]) return res.status(404).json({ error: 'IP not found in bans.' });
        delete bans[ip];
        if (!writeBannedIps(bans)) return res.status(500).json({ error: 'Failed to write bans file.' });
        return res.json({ body: `IP ${ip} unbanned.`, bans });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// POST /deactivate
router.put('/deactivate', async (req, res) => {
    const apiKey = req.body.key;
    if (!apiKey) return res.status(400).json({ error: 'Missing key query param.' });

    const apikeysPath = path.join(global.__basedir, '/envs/apikeys.env.json');
    let data;
    try {
        data = JSON.parse(fs.readFileSync(apikeysPath, 'utf8'));
    } catch {
        return res.status(500).json({ error: 'Failed to read apikeys.env.json.' });
    }

    let found = false;
    for (const entry of Object.values(data)) {
        if (entry && typeof entry === 'object' && entry.key === apiKey) {
            entry.valid = false;
            found = true;
        }
    }
    if (!found) return res.status(404).json({ error: 'API key not found.' });

    try {
        fs.writeFileSync(apikeysPath, JSON.stringify(data, null, 2));
    } catch {
        return res.status(500).json({ error: 'Failed to write apikeys.env.json.' });
    }

    res.json({ body: `API key ${apiKey} deactivated, reloading....` });

    reload().catch(err => console.error("Reload failed:", err));
});

module.exports = router;
