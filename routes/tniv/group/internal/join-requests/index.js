
const express = require('express');
const path = require('path');
const router = express.Router();
const JoinRequest = require(path.join(global.__basedir, 'utils/group.js')).JoinRequest;

/**
 * @swagger
 * /tniv/group/internal/join-requests/accept:
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
router.post('/accept', async (req, res) => {
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

module.exports = router;