const express = require('express');
const router = express.Router();
const path = require('path');
const Match = require(path.join(global.__basedir, 'db/schemas/match.js'));
const PlayerStat = require(path.join(global.__basedir, 'db/schemas/playerStat.js'));
const { extractPlayerDeltas } = require(path.join(global.__basedir, 'utils/matchStats.js'));
const { sendMatchWebhook } = require(path.join(global.__basedir, 'utils/matchWebhook.js'));

async function applyPlayerDeltas(matchData, sign = 1) {
    const deltas = extractPlayerDeltas(matchData);
    for (const d of deltas) {
        await PlayerStat.findOneAndUpdate(
            { userId: d.userId },
            {
                $setOnInsert: { userId: d.userId },
                $set: { username: d.username },
                $inc: {
                    kills: sign * d.kills,
                    deaths: sign * d.deaths,
                    playTimeSec: sign * d.playTimeSec,
                    matchesPlayed: sign * 1,
                    totalPing: sign * d.ping,
                    pingSamples: sign * (d.ping ? 1 : 0),
                },
            },
            { upsert: true }
        );
    }
}

/**
 * @swagger
 * /tniv/DB/match:
 *   post:
 *     summary: Log a match entry.
 *     security:
 *       - apiKey: []
 *     tags:
 *       - TNIV/DB
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: Unique session identifier
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: Match entry logged
 *       400:
 *         description: Invalid match data
 *       401:
 *         description: No api-key provided
 *       403:
 *         description: Invalid api-key for resource
 *       500:
 *         description: Server error
 */
router.post('/', async (req, res) => {
    const matchData = req.body;
    if (!matchData || !matchData.sessionId) {
        return res.status(400).json({ error: 'Invalid match data' });
    }

    try {
        await Match.create({
            sessionId: matchData.sessionId,
            data: matchData,
            matchStartTime: matchData.matchStartTime,
            endTime: matchData.endTime,
        });

        await applyPlayerDeltas(matchData, 1);

        if (matchData.sendWebhook) {
            sendMatchWebhook(matchData, {
                baseUrl: process.env.NODE_ENV === 'production' ? 'https://storcale-api.omegadev.xyz' : 'http://localhost:9902',
                target: process.env.MatchLogWebhookTarget,
                apiKey: process.env.ADMIN_KEY,
            }).catch(e => console.error('[matchWebhook] Failed:', e?.response?.data || e?.message));
        }

        return res.status(200).json({ body: 'Logged!', code: matchData.sessionId });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ error: `Match with sessionId ${matchData.sessionId} already exists.` });
        }
        console.error('Error logging match:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /tniv/DB/match:
 *   delete:
 *     summary: Delete match entries.
 *     security:
 *       - apiKey: []
 *     tags:
 *       - TNIV/DB
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: Unique session identifier
 *     responses:
 *       200:
 *         description: Match entry deleted
 *       400:
 *         description: Invalid match data
 *       401:
 *         description: No api-key provided
 *       403:
 *         description: Invalid api-key for resource
 *       500:
 *         description: Server error
 */
router.delete('/', async (req, res) => {
    const { sessionId } = req.body || {};
    if (!sessionId) {
        return res.status(400).json({ error: 'sessionId is required' });
    }

    try {
        const match = await Match.findOne({ sessionId });
        if (match) {
            // reverse the player-stat contribution of this match before removing it
            await applyPlayerDeltas(match.data, -1);
            await Match.deleteOne({ sessionId });
        }
        return res.status(200).json({ body: 'Deleted entries with sessionId: ' + sessionId, code: sessionId });
    } catch (err) {
        console.error('Error deleting match:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /tniv/DB/match:
 *   get:
 *     summary: Get all matches or filter by sessionId.
 *     security:
 *       - apiKey: []
 *     tags:
 *       - TNIV/DB
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         required: false
 *         schema:
 *           type: string
 *         description: If provided, returns only matches containing this sessionId
 *     responses:
 *       200:
 *         description: Match data successfully retrieved
 *       401:
 *         description: No api-key provided
 *       403:
 *         description: Invalid api-key for resource
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
    try {
        console.log("match accessed!")
        const sessionId = req.query.sessionId;
        const filter = sessionId ? { sessionId } : {};
        const matches = await Match.find(filter).sort({ createdAt: 1 }).lean();
        return res.status(200).json({ body: matches.map(m => m.data) });
    } catch (err) {
        console.error('Error reading matches:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;