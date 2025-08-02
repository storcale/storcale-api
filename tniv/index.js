const express = require('express');
const { loadSettings, resetDB } = require('./sheets');
const { SpreadsheetManager } = require('../utils/spreadsheets');
const router = express.Router();


/**
 * @swagger
 * /api/tniv/reset:
 *   post:
 *     summary: Reset the TNIV spreadsheet and update user strikes
 *     tags:
 *       - TNIV
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               focus:
 *                 type: string
 *                 description: The focus to reset
 *     responses:
 *       200:
 *         description: Reset successful, returns updated user info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 body:
 *                   type: string
 *                   description: Bot-ready string with info on users
 *             example:
 *               body: "**Users with incomplete quota:**\n- sfglitch (Points: 0.00, Strikes: 2)\n- Kenionium (Points: 0.00, Strikes: 2)\n- Vexbric (Points: 0.00, Strikes: 2)\n- astralkrieg (Points: 0.00, Strikes: 3)\n\n**Users with updated strikes:**\n- sfglitch was added 1 strike (1 -> 2).\n- Kenionium was added 1 strike (1 -> 2).\n- Vexbric was added 1 strike (1 -> 2).\n- astralkrieg was added 1 strike (2 -> 3).\n- Koichikun10 was removed 1 strike (2 -> 1).\n"
 *       400:
 *         description: Invalid params
 *       500:
 *         description: Server error
 */
router.post('/reset', async (req, res) => {
    try {
        const { focus } = req.body || {};
        if (!focus) return res.status(400).json({ error: 'Invalid params' });
        const id = new SpreadsheetManager().getSpreadsheet(focus);
        const settings = await loadSettings(id);
        const data = await resetDB(settings, id);
        res.json({ body: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
