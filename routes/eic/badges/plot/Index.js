const express = require('express');
const path = require('path');
const router = express.Router();
const { getBadges, buildSvg, renderPng } = require(path.join(global.__basedir, 'utils/badge-check.js'));

/**
 * @swagger
 * /eic/badges/plot:
 *   get:
 *     summary: Plot a Roblox user's badges over time as an image.
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
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [png, svg]
 *         description: Image format (default png)
 *     responses:
 *       200:
 *         description: Chart image
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *           image/svg+xml:
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid userId
 *       404:
 *         description: User has no badges
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
    const { userId, format } = req.query;
    if (!/^\d{1,20}$/.test(String(userId || ''))) {
        return res.status(400).json({ error: 'userId must be numeric' });
    }
    try {
        const badges = await getBadges(userId);
        if (!badges.length) return res.status(404).json({ error: 'No badges found for this user' });

        const svg = buildSvg(userId, badges);
        if (format === 'svg') return res.type('image/svg+xml').send(svg);

        res.type('png').send(renderPng(svg));
    } catch (err) {
        console.error(`[Badge Check] Failed to generate plot for ${userId}: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;