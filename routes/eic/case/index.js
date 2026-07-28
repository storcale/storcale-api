const express = require('express');
const router = express.Router();
const path = require('path');
const Case = require(path.join(global.__basedir, 'db/schemas/eic/case.js'));

/**
 * @swagger
 * /eic/Case:
 *   post:
 *     summary: Log a case entry.
 *     security:
 *       - apiKey: []
 *     tags:
 *       - eic/Case
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - caseId
 *             properties:
 *               caseId:
 *                 type: string
 *                 description: Unique case identifier
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: case entry logged
 *       400:
 *         description: Invalid case data
 *       401:
 *         description: No api-key provided
 *       403:
 *         description: Invalid api-key for resource
 *       500:
 *         description: Server error
 */
router.post('/', async (req, res) => {
    const caseData = req.body;
    if (!caseData || caseData.caseId === undefined || caseData.caseId === null || !caseData.robloxUsername || !caseData.weaponMechanic) {
        return res.status(400).json({ error: 'Invalid case data' });
    }

    try {
        await Case.create({
            caseId: caseData.caseId,
            robloxUsername: caseData.robloxUsername,
            robloxId: caseData.robloxId || 0,
            weaponMechanic: caseData.weaponMechanic,
            activeBannedGames: {}
        });
        return res.status(200).json({ body: 'Created!', caseId: caseData.caseId });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ error: `Case with id ${caseData.caseId} already exists.` });
        }
        console.error('Error logging case:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /eic/Case:
 *   delete:
 *     summary: Delete case entries. Multiple query parameters will find a match with all the parameters
 *     security:
 *       - apiKey: []
 *     tags:
 *       - eic/Case
*     parameters:
 *       - in: query
 *         name: caseId
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter cases by caseId
 *       - in: query
 *         name: username
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter cases by roblox username
 *     responses:
 *       200:
 *         description: case entry deleted
 *       400:
 *         description: Invalid case data
 *       401:
 *         description: No api-key provided
 *       403:
 *         description: Invalid api-key for resource
 *       500:
 *         description: Server error
 */
router.delete('/', async (req, res) => {
    const caseId = req.query.caseId;
    const username = req.query.username;
    if ((caseId === undefined || caseId === null) && !username) {
        return res.status(400).json({ error: 'username is at least required' });
    }

    try {
        caseid = caseId ? caseId : {}
        const eicCases = await Case.find({ caseId: caseId, robloxUsername: username });
        if (eicCases) {
            await Case.deleteMany({ caseId: caseId, robloxUsername: username })
        }
        return res.status(200).json({ body: 'Deleted entries matching the query.' });
    } catch (err) {
        console.error('Error deleting case:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /eic/Case:
 *   get:
 *     summary: Get all cases or filter by caseId. Multiple query parameters will find a match with all the parameters
 *     security:
 *       - apiKey: []
 *     tags:
 *       - eic/Case
 *     parameters:
 *       - in: query
 *         name: caseId
 *         required: false
 *         schema:
 *           type: string
 *         description: If provided, returns only cases with that caseId 
 *       - in: query
 *         name: caseId
 *         required: false
 *         schema:
 *           type: string
 *         description: If provided, returns only cases with that roblox username
 *     responses:
 *       200:
 *         description: case data successfully retrieved
 *       401:
 *         description: No api-key provided
 *       403:
 *         description: Invalid api-key for resource
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
    try {
        const caseId = req.query.caseId || null
        const username = req.query.username || ""
        const cases = await Case.find({ caseId: caseId, robloxUsername: username }).sort({ createdAt: 1 }).lean();
        if (cases.length) {
            return res.status(200).json({ body: cases });
        } else {
            return res.status(404).json({});
        }
    } catch (err) {
        console.error('Error reading cases:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;