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
 *       - EIC/Case
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - caseId
 *               - robloxUsername
 *               - weaponMechanic
 *             properties:
 *               caseId:
 *                 type: integer
 *                 description: Unique case identifier.
 *               robloxUsername:
 *                 type: string
 *                 description: Roblox username associated with the case.
 *               robloxId:
 *                 type: integer
 *                 description: Roblox user ID.
 *                 default: 0
 *               weaponMechanic:
 *                 type: string
 *                 description: Weapon mechanic associated with the case.
 *     responses:
 *       200:
 *         description: Case entry logged successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 body:
 *                   type: string
 *                   example: Created!
 *                 caseId:
 *                   type: integer
 *       400:
 *         description: Invalid case data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Invalid case data
 *       401:
 *         description: No API key provided.
 *       403:
 *         description: Invalid API key for resource.
 *       409:
 *         description: Case with the provided caseId already exists.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
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
            activeBannedGames: [],
            active: true
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
 *     summary: Mark case entries as inactive and remove a game from their active banned games list. Multiple query parameters are combined using AND logic.
 *     security:
 *       - apiKey: []
 *     tags:
 *       - EIC/Case
 *     parameters:
 *       - in: query
 *         name: caseId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filter cases by case ID.
 *       - in: query
 *         name: username
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter cases by Roblox username.
 *     responses:
 *       200:
 *         description: Matching case entries were updated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 body:
 *                   type: string
 *                   example: Made inactive entries matching the query.
 *       400:
 *         description: Missing required parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Missing parameters. Username is at least required
 *       401:
 *         description: No API key provided.
 *       403:
 *         description: Invalid API key for resource.
 *       404:
 *         description: No matching case entries found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.delete('/', async (req, res) => {
    const caseId = req.query.caseId;
    const username = req.query.username;
    if (((caseId === undefined || caseId === null ) && !username) ) {
        return res.status(400).json({ error: 'Missing parameters. Username is at least required' });
    }
    try {
        let filter = {};
        if (caseId) filter.caseId = caseId;
        if (username) filter.robloxUsername = username;
        const result = await Case.updateMany(filter,{$set: { active: false }});
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: "Not found" });
        }
        return res.status(200).json({
            body: "Made inactive entries matching the query."
        });
    } catch (err) {
        console.error('Error making case inactive case:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /eic/Case:
 *   get:
 *     summary: Get case entries. Multiple query parameters are combined using AND logic.
 *     security:
 *       - apiKey: []
 *     tags:
 *       - EIC/Case
 *     parameters:
 *       - in: query
 *         name: caseId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Return only the case with this case ID.
 *       - in: query
 *         name: username
 *         required: false
 *         schema:
 *           type: string
 *         description: Return only cases matching this Roblox username.
 *       - in: query
 *         name: gameId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Return only cases that are not currently banned for this game ID.
 *     responses:
 *       200:
 *         description: Case data successfully retrieved.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 body:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       caseId:
 *                         type: integer
 *                       robloxUsername:
 *                         type: string
 *                       robloxId:
 *                         type: integer
 *                       weaponMechanic:
 *                         type: string
 *                       activeBannedGames:
 *                         type: array
 *                         items:
 *                           type: integer
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: No API key provided.
 *       403:
 *         description: Invalid API key for resource.
 *       404:
 *         description: No matching cases found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */

router.get('/', async (req, res) => {
    try {
        const caseId = req.query.caseId || null
        const username = req.query.username || ""
        const gameId = req.query.gameId || null
        let filter = {}
        if (caseId) { filter.caseId = caseId }
        if (username) { filter.robloxUsername = username }
        if (gameId) { filter.activeBannedGames = { '$ne': gameId } }
        const cases = await Case.find(filter).sort({ createdAt: 1 }).lean();
        if (cases.length) {
            return res.status(200).json({ body: cases });
        } else {
            return res.status(404).json({ error: "Not found" });
        }
    } catch (err) {
        console.error('Error reading cases:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /eic/Case:
 *   put:
 *     summary: Record that one or more cases have been banned in a game.
 *     security:
 *       - apiKey: []
 *     tags:
 *       - EIC/Case
 *     parameters:
 *       - in: query
 *         name: caseId
 *         required: true
 *         schema:
 *           oneOf:
 *             - type: integer
 *             - type: array
 *               items:
 *                 type: integer
 *         description: Single case ID or multiple case IDs supplied as repeated query parameters.
 *       - in: query
 *         name: gameId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Game ID to add to the active banned games list.
 *     responses:
 *       200:
 *         description: Case(s) updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Success! Modified documents 2
 *       400:
 *         description: Missing required parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       401:
 *         description: No API key provided.
 *       403:
 *         description: Invalid API key for resource.
 *       404:
 *         description: No matching case entries found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */

router.put('/', async (req, res) => {
    try {
        const caseId = req.query.caseId
        const gameId = req.query.gameId
        if (!caseId || !gameId) { return res.status(400).json({ error: 'Missing parameters' }) }
        let result = {}
        if (Array.isArray(caseId)) {
            result = await Case.updateMany({ caseId: { "$in": caseId } }, { $push: { activeBannedGames: gameId } });
        } else {
            result = await Case.updateOne({ caseId: caseId }, { $push: { activeBannedGames: gameId } });
        }
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: "Not found" });
        }
        return res.status(200).json({ message: 'Sucess! Modified documents: ' + result.modifiedCount })
    } catch (err) {
        console.error('Error modifying case:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /eic/Case:
 *   patch:
 *     summary: Remove a game ban log from one or more case entries. Multiple query parameters are combined using AND logic.
 *     security:
 *       - apiKey: []
 *     tags:
 *       - EIC/Case
 *     parameters:
 *       - in: query
 *         name: caseId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filter cases by case ID.
 *       - in: query
 *         name: username
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter cases by Roblox username.
 *       - in: query
 *         name: gameId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Game ID to remove from the active banned games list.
 *     responses:
 *       200:
 *         description: Ban log removed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 body:
 *                   type: string
 *                   example: Removed ban log on that case for 123456
 *       400:
 *         description: Missing required parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Missing parameters. Username is at least required
 *       401:
 *         description: No API key provided.
 *       403:
 *         description: Invalid API key for resource.
 *       404:
 *         description: No matching case entries found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */

router.patch('/', async (req, res) => {
    const caseId = req.query.caseId;
    const username = req.query.username;
    const gameId = req.query.gameId
    if (((caseId === undefined || caseId === null ) && !username) || !gameId ) {
        return res.status(400).json({ error: 'Missing parameters. Username is at least required' });
    }
    try {
        let filter = {};
        if (caseId) filter.caseId = caseId;
        if (username) filter.robloxUsername = username;
        const result = await Case.updateMany(filter,{$pull: { activeBannedGames: gameId }});
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: "Not found" });
        }
        return res.status(200).json({
            body: "Removed ban log on that case for "+gameId
        });
    } catch (err) {
        console.error('Error making removing game ban log from case:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;