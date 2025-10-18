const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { exec } = require('child_process');
const { createSessionCookie, verifySessionCookie, clearCookieHeader } = require(path.join(global.__basedir, '/utils/adminAuth.js'));

const LOG_PATH = path.join(global.__basedir, 'access.log');
const BANS_PATH = path.join(global.__basedir, 'envs', 'banned_ips.json');
const APIKEYS_PATH = path.join(global.__basedir, 'envs', 'apikeys.env.json');

function runReloadScript() {
    const scriptPath = path.join(global.__basedir, '/reload.sh');
    return new Promise((resolve, reject) => {
        exec(`"${scriptPath}"`, (error, stdout, stderr) => {
            if (error) return reject(error);
            resolve(stdout || stderr || 'Reload executed');
        });
    });
}

function readBans() {
    try { if (!fs.existsSync(BANS_PATH)) return {}; return JSON.parse(fs.readFileSync(BANS_PATH,'utf8')||'{}'); } catch(e){return{}};
}
function writeBans(b){ try{ fs.writeFileSync(BANS_PATH, JSON.stringify(b,null,2)); return true;}catch(e){return false} }

// public UI pages
router.get('/admin-ui/login', (req,res)=>{
    res.sendFile(path.join(__dirname,'login.html'));
});
router.get('/admin-ui/dashboard', (req,res)=>{
    res.sendFile(path.join(__dirname,'dashboard.html'));
});

// API: login
router.post('/api/admin-ui/login', express.json(), (req,res)=>{
    const { username, password } = req.body || {};
    // simple credential check using env vars for now
    if (!username || !password) return res.status(400).json({ error: 'username/password required' });
    const adminUser = process.env.ADMIN_UI_USER;
    const adminPass = process.env.ADMIN_UI_PASS;
    if (username !== adminUser || password !== adminPass) return res.status(403).json({ error: 'Invalid creds' });
    const cookie = createSessionCookie(username);
    // set SameSite to Lax and HttpOnly; Secure omitted for localhost
    res.setHeader('Set-Cookie', `admin_ui_session=${cookie}; Path=/; HttpOnly; SameSite=Lax`);
    return res.json({ ok: true });
});

// API: logout
router.post('/api/admin-ui/logout', (req,res)=>{
    res.setHeader('Set-Cookie', clearCookieHeader());
    return res.json({ ok: true });
});

// helper auth guard
function requireAuth(req,res,next){
    const cookie = req.get('cookie') || '';
    const match = cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith('admin_ui_session='));
    let token = null;
    if (match) {
        const idx = match.indexOf('=');
        token = idx >= 0 ? match.substring(idx+1) : null;
    }
    const user = verifySessionCookie(token);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    req.adminUser = user;
    next();
}

// API: logs (simple tail)
router.get('/api/admin-ui/logs', requireAuth, (req,res)=>{
    const n = Number(req.query.n) || 500;
    try{
        const raw = fs.existsSync(LOG_PATH) ? fs.readFileSync(LOG_PATH,'utf8') : '';
        const lines = raw.split(/\r?\n/).filter(Boolean);
        const tail = lines.slice(-n);
        return res.json({ logs: tail });
    }catch(e){ return res.status(500).json({ error: e.message }) }
});

// API: stats (requests per day + total)
router.get('/api/admin-ui/stats', requireAuth, (req,res)=>{
    try{
        const raw = fs.existsSync(LOG_PATH) ? fs.readFileSync(LOG_PATH,'utf8') : '';
        const lines = raw.split(/\r?\n/).filter(Boolean);
        const total = lines.length;
        const perDay = {};
        lines.forEach(l=>{
            const m = l.match(/^\[(.*?)\]/);
            if (!m) return;
            const d = new Date(m[1]);
            const k = d.toISOString().slice(0,10);
            perDay[k] = (perDay[k]||0)+1;
        });
        return res.json({ total, perDay });
    }catch(e){ return res.status(500).json({ error: e.message }) }
});

// API: bans management
router.get('/api/admin-ui/bans', requireAuth, (req,res)=>{ return res.json({ bans: readBans() }); });
router.post('/api/admin-ui/bans', requireAuth, express.json(), (req,res)=>{
    const { ip, reason } = req.body || {};
    if (!ip) return res.status(400).json({ error: 'ip required' });
    const b = readBans();
    b[ip] = { reason: reason || 'admin', bannedAt: new Date().toISOString(), bannedBy: req.adminUser };
    if (!writeBans(b)) return res.status(500).json({ error: 'failed write' });
    return res.json({ ok: true, bans: b });
});
router.delete('/api/admin-ui/bans', requireAuth, (req,res)=>{
    const ip = req.query.ip || req.body?.ip;
    if (!ip) return res.status(400).json({ error: 'ip required' });
    const b = readBans();
    if (!b[ip]) return res.status(404).json({ error: 'not found' });
    delete b[ip];
    if (!writeBans(b)) return res.status(500).json({ error: 'failed write' });
    return res.json({ ok: true, bans: b });
});

// admin-ui reload endpoint (protected) — executes reload script server-side
router.post('/api/admin-ui/reload', requireAuth, async (req,res)=>{
    try{
        // respond quickly and run reload
        const output = await runReloadScript();
        return res.json({ ok: true, output });
    }catch(e){
        return res.status(500).json({ error: e.message || String(e) });
    }
});

module.exports = router;

router.get('/api/admin-ui/keys', requireAuth, (req,res)=>{
    try{
        const raw = fs.existsSync(APIKEYS_PATH) ? fs.readFileSync(APIKEYS_PATH,'utf8') : '{}';
        const data = JSON.parse(raw||'{}');
        // sanitize - DO NOT return raw secrets. Provide masked preview and name/id to identify key.
        function maskKey(s){
            if (!s || typeof s !== 'string') return null;
            if (s.length <= 8) return s.replace(/./g,'*');
            return `${s.slice(0,4)}...${s.slice(-4)}`;
        }
        const out = Object.entries(data).map(([name,entry])=>({ name, id: name, masked: maskKey(entry.key||entry.apiKey||null), valid: entry.valid!==false, meta: entry.meta||{} }));
        return res.json({ keys: out });
    }catch(e){ return res.status(500).json({ error: e.message }) }
});

router.put('/api/admin-ui/keys/deactivate', requireAuth, express.json(), (req,res)=>{
    const key = req.body?.key || req.query?.key;
    if (!key) return res.status(400).json({ error: 'key required' });
    try{
        const raw = fs.existsSync(APIKEYS_PATH) ? fs.readFileSync(APIKEYS_PATH,'utf8') : '{}';
        const data = JSON.parse(raw||'{}');
        let found = false;
        for (const [k,entry] of Object.entries(data)){
            if ((entry && (entry.key === key || entry.apiKey === key)) || k === key) {
                entry.valid = false;
                found = true;
            }
        }
        if (!found) return res.status(404).json({ error: 'API key not found' });
        fs.writeFileSync(APIKEYS_PATH, JSON.stringify(data, null, 2));
        return res.json({ ok:true });
    }catch(e){ return res.status(500).json({ error: e.message }) }
});
