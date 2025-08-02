const express = require('express');
const router = express.Router();

const { SpreadsheetManager } = require('../../utils/spreadsheets');
// routes

router.get('/test', (req, res) => {
    res.json({ message: 'TNIV test route accessed!' });
});
router.get('/getSpreadsheet', async (req, res) => {
    try {
        if (!req.body || !req.body.focus) {
            return res.status(400).json({ error: 'Focus is required' });
        }
        const focus = req.body.focus
        const spreadsheetManager = new SpreadsheetManager();
        const data = await spreadsheetManager.getSpreadsheet(focus);
        res.json({ body: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
