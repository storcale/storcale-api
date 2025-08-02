const express = require('express');
const router = express.Router();

const { SpreadsheetManager } = require('../../utils/spreadsheets');

// routes
/**
 * @swagger
 * /api/tniv/internal/addKey:
 *   post:
 *     summary: Add a spreadsheet key to a focus/category
 *     tags:
 *       - TNIV Internal
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               focus:
 *                 type: string
 *                 description: The focus/category name
 *               spreadsheetId:
 *                 type: string
 *                 description: The Google Spreadsheet ID
 *     responses:
 *       200:
 *         description: Key added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 body:
 *                   type: string
 *                   description: Result message
 *       400:
 *         description: Parameters invalid
 *       500:
 *         description: Server error
 */
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
/**
 * @swagger
 * /api/tniv/internal/removeKey:
 *   delete:
 *     summary: Remove a spreadsheet key from a focus/category
 *     tags:
 *       - TNIV Internal
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               focus:
 *                 type: string
 *                 description: The focus/category name
 *               spreadsheetId:
 *                 type: string
 *                 description: The Google Spreadsheet ID
 *     responses:
 *       200:
 *         description: Key removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 body:
 *                   type: string
 *                   description: Result message
 *       400:
 *         description: Parameters invalid
 *       500:
 *         description: Server error
 */
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
/**
 * @swagger
 * /api/tniv/internal/updateKey:
 *   patch:
 *     summary: Update a spreadsheet key for a focus/category
 *     tags:
 *       - TNIV Internal
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               focus:
 *                 type: string
 *                 description: The focus/category name
 *               spreadsheetId:
 *                 type: string
 *                 description: The Google Spreadsheet ID
 *     responses:
 *       200:
 *         description: Key updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 body:
 *                   type: string
 *                   description: Result message
 *       400:
 *         description: Parameters invalid
 *       500:
 *         description: Server error
 */
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
