
const express = require('express');
const path = require('path');
const router = express.Router();
const JoinRequest = require(path.join(global.__basedir, 'utils/group.js')).JoinRequest;
const Group = require(path.join(global.__basedir, 'utils/group.js')).Group;
/**
 * @swagger
 * /tniv/group/internal/join-requests:
 *   post:
 *     summary: Accept a join request for a user in a specific group.
 *     security:
 *      - apiKey: []
 *     tags:
 *       - TNIV/Group/Internal
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully accepted join request
 *       500:
 *         description: Server error
 */
router.post('/', async (req, res) => {
    try {
        const { userId } = req.query || {};

        if (!userId) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }
        const joinRequest = new JoinRequest(userId, process.env.TNIV_GROUP_ID);
        await joinRequest.accept();

        res.json({ message: `Join request for user ${userId} in group ${process.env.TNIV_GROUP_ID} accepted.` });
    } catch (err) {
        res.status(500).json({ error: 'Error accepting join request: ' + err.message });
    }
});

/**
 * @swagger
 * /tniv/group/internal/join-requests:
 *   delete:
 *     summary: Decline a join request for a user in a specific group.
 *     security:
 *      - apiKey: []
 *     tags:
 *       - TNIV/Group/Internal
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully declined join request
 *       500:
 *         description: Server error
 */
router.delete('/', async (req, res) => {
    try {
        const { userId } = req.query || {};

        if (!userId) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }
        const joinRequest = new JoinRequest(userId, process.env.TNIV_GROUP_ID);
        await joinRequest.decline();

        res.json({ message: `Join request for user ${userId} in group ${process.env.TNIV_GROUP_ID} declined.` });
    } catch (err) {
        res.status(500).json({ error: 'Error declining join request: ' + err.message });
    }
});

/**
 * @swagger
 * /tniv/group/internal/join-requests:
 *   get:
 *     summary: List current join requests
 *     security:
 *      - apiKey: []
 *     tags:
 *       - TNIV/Group/Internal
 *     responses:
 *       200:
 *         description: Successfully sent join requests
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
    try {
        const joinRequest = new JoinRequest();
        const requests = await joinRequest.getJoinRequests();

        res.json({ requests: requests });
    } catch (err) {
        res.status(500).json({ error: 'Error listing join requests: ' + err.message });
    }
});

/**
 * @swagger
 * /tniv/group/internal/join-requests:
 *   patch:
 *     summary: Process current join requests. Verifications are Account Age > 100 days, not in EIC registry, not in External Registries
 *     security:
 *      - apiKey: []
 *     tags:
 *       - TNIV/Group/Internal
 *     responses:
 *       200:
 *         description: Successfully processed
 *       500:
 *         description: Server error
 */
router.patch('/', async (req, res) => {
    try {
        const joinRequest = new JoinRequest();
        const text = await joinRequest.processPending();

        res.status(200).json({ message: '**Join requests processed successfully.**\n\n' + text });
    } catch (err) {
        res.status(500).json({ error: 'Error processing join requests: ' + err.message });
    }
});

module.exports = router;