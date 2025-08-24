const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

function reload(){
    const scriptPath = path.join(global.__basedir, '/reload.sh');
    exec(` "${scriptPath}"`, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        return({ body: stdout || 'Reload/Deploy script executed.' });
    });
}
// POST /deploy: run deploy.sh
router.post('/reload', (req, res) => {
    reload()
    res.json({ body: `Reloaded!` });
});

// POST /deactivate?key=...: set valid=false for API key
router.post('/deactivate', (req, res) => {
    const apiKey = req.query.key;
    if (!apiKey) return res.status(400).json({ error: 'Missing key query param.' });
    const apikeysPath = path.join(global.__basedir, '/envs/apikeys.env.json');
    let data;
    try {
        data = JSON.parse(fs.readFileSync(apikeysPath, 'utf8'));
    } catch (err) {
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
    } catch (err) {
        return res.status(500).json({ error: 'Failed to write apikeys.env.json.' });
    }
    res.json({ body: `API key ${apiKey} deactivated, reloading....` });
    reload()
});

module.exports = router;
