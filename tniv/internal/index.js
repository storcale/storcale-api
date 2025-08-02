const express = require('express');
const router = express.Router();

const { SpreadsheetManager } = require('../../utils/spreadsheets');

// routes
router.post('/addKey', async (req, res) => {
    try {
        if (!req.body || !req.body.focus || !req.body.spreadsheetId) {
            return res.status(400).json({ error: 'Parameters invalid' });
        }
        const spreadsheetManager = new SpreadsheetManager();
        const data = await spreadsheetManager.addKey(req.body.focus, req.body.spreadsheetId);
        res.json({ body: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.delete('/removeKey', async (req, res) => {
    try {
        if (!req.body || !req.body.focus || !req.body.spreadsheetId) {
            return res.status(400).json({ error: 'Parameters invalid' });
        }
        const spreadsheetManager = new SpreadsheetManager();
        const data = await spreadsheetManager.removeKey(req.body.focus, req.body.spreadsheetId);
        res.json({ body: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.patch('/updateKey', async (req, res) => {
    try {
        if (!req.body || !req.body.focus || !req.body.spreadsheetId) {
            return res.status(400).json({ error: 'Parameters invalid' });
        }
        const spreadsheetManager = new SpreadsheetManager();
        const data = await spreadsheetManager.updateSpreadsheet(req.body.focus, req.body.spreadsheetId);
        res.json({ body: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
