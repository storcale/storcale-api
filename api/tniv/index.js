const express = require('express');
const { loadSettings, resetDB } = require('./sheets');
const router = express.Router();

let accessSheets = require('./sheets').accessSheets

// routes

router.get('/test', (req, res) => {
    res.json({ message: 'TNIV test route accessed!' });
});
router.get('/another-test', async (req, res) => {
    try {
        res.json({ body: test });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
