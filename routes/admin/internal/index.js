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
        const output = await reload();
        res.json({ body: output });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /deactivate
router.post('/deactivate', async (req, res) => {
    const apiKey = req.query.key;
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

    // Run reload in background
    reload().catch(err => console.error("Reload failed:", err));
});
