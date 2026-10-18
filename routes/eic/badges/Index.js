const express = require('express');
const path = require('path');
const router = express.Router();
const { getBadges } = require(path.join(global.__basedir, 'utils/badge-check.js'));

/**
 * @swagger
 * /eic/badges:
 *   get:
 *     summary: Returns a user's badges
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *       - TNIV/Badges
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Badges Object
 *       400:
 *         description: Invalid userId
 *       404:
 *         description: User has no badges
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
    const { userId } = req.query;
    if (!/^\d{1,20}$/.test(String(userId || ''))) {
        return res.status(400).json({ error: 'userId must be numeric' });
    }
    try {
        const badges = await getBadges(userId);
        if (!badges.length) return res.status(404).json({ error: 'No badges found for this user' });
        res.json(badges)
    } catch (err) {
        console.error(`[Badge Check] Failed to get badges for ${userId}: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;