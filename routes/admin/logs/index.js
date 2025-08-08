const express = require('express');
const path = require('path');
const router = express.Router();
const fs = require('fs');
const logFilePath = path.join(global.__basedir, '/access.log');

router.get('/', (req, res) => {
    let n = Math.max(1, Math.min(1000, parseInt(req.query.n, 10) || 100));
    fs.readFile(logFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Could not read log file' });
        const lines = data.trim().split('\n');
        res.json({ logs: lines.slice(-n) });
    });
});
router.delete('/', (req, res) => {
    fs.readFile(logFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Could not read log file' });
        fs.truncate(logFilePath, 0, (err) => {
            if (err) return res.status(500).json({ error: 'Could not clear log file' });
            res.json({ message: 'Log file cleared successfully' });
        });
    });
});
module.exports = router;