const express = require('express');
const { loadSettings, resetDB } = require('./sheets');
const router = express.Router();

const SpreadsheetManager = require('../utils/spreadsheets').SpreadsheetManager;

// routes

router.post('/reset', async (req, res) => {
    try {
        if (!req.body || !req.body.focus) {
            return res.status(400).json({ error: 'Invalid params' });
        }
        const spreadsheetManager = new SpreadsheetManager();
        const id = spreadsheetManager.getSpreadsheet(req.body.focus);
        const settings = await loadSettings(id);
        const data = await resetDB(settings, id);
        res.json({ body: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
module.exports = router;
