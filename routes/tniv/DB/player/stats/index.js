/**
 * @swagger
 * /tniv/DB/player/stats:
 *   get:
 *     summary: Get player stats, matches, and/or commands by userId.
 *     tags:
 *       - TNIV/DB/Player
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: The user ID to query.
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *         description: Filter matches from this date (inclusive).
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *         description: Filter matches up to this date (inclusive).
 *       - in: query
 *         name: map
 *         schema:
 *           type: string
 *         description: Filter matches by map name (partial match).
 *       - in: query
 *         name: stats
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Include stats in response (default true).
 *       - in: query
 *         name: matches
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Include matches in response.
 *       - in: query
 *         name: commands
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Include commands in response.
 *     responses:
 *       200:
 *         description: Player stats, matches, and/or commands.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
 *                   properties:
 *                     Ping:
 *                       type: integer
 *                     Kills:
 *                       type: integer
 *                     Deaths:
 *                       type: integer
 *                 matches:
 *                   type: array
 *                   items:
 *                     type: object
 *                 commands:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Invalid params
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message string
 */
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const matches = path.join(__dirname, '../../match/matches.log');

router.get('/', async (req, res) => {
    try {
        const { userId, from, to, map } = req.query;
        function parseDate(str) {
            if (!str) return null;
            if (!isNaN(str)) {
                let num = Number(str);
                if (num > 1000000000 && num < 2000000000) {
                    return new Date(num * 1000);
                }
                return new Date(num);
            }
            const parts = str.split(/[\/ :]/);
            if (parts.length >= 3) {
                const [month, day, year] = parts;
                if (parts.length >= 6) {
                    const [month, day, year, hour, min, sec] = parts;
                    return new Date(year, month - 1, day, hour || 0, min || 0, sec || 0);
                }
                return new Date(year, month - 1, day);
            }
            return new Date(str);
        }

        let stats = { Ping: 0, Kills: 0, Deaths: 0 };
        let pingCount = 0;
        let totalPlayTime = 0;
        let matchesArr = [];
        let commands = [];
        if (fs.existsSync(matches)) {
            const lines = fs.readFileSync(matches, 'utf8').split('\n').filter(Boolean);
            for (const line of lines) {
                let obj;
                try { obj = JSON.parse(line); } catch { continue; }
                if (map && obj.placeName && !obj.placeName.includes(map)) continue;
                if (from || to) {
                    const d = parseDate(obj.date || obj.timestamp || obj.startTime);
                    if (from && d < parseDate(from)) continue;
                    if (to && d > parseDate(to)) continue;
                }
                if (obj.leaderstats) {
                    for (const key of Object.keys(obj.leaderstats)) {
                        if (String(key) === String(userId)) {
                            if (typeof obj.leaderstats[key].Ping === 'number') {
                                stats.Ping += obj.leaderstats[key].Ping;
                                pingCount++;
                            }
                            stats.Kills += obj.leaderstats[key].Kills || 0;
                            stats.Deaths += obj.leaderstats[key].Deaths || 0;
                        }
                    }
                }
                if (obj.playTimeList && obj.playTimeList[userId]) {
                    const pt = obj.playTimeList[userId];
                    if (typeof pt.defenders === 'number') totalPlayTime += pt.defenders;
                    if (typeof pt.attackers === 'number') totalPlayTime += pt.attackers;
                }
                matchesArr.push(obj);
                if (Array.isArray(obj.logs)) {
                    commands.push(...obj.logs.filter(l => String(l.userId) === String(userId)));
                }
            }
        }
        if (pingCount > 0) stats.Ping = Math.round(stats.Ping / pingCount);
        stats.playTime = Math.round(totalPlayTime / 60);

        const { stats: ifStats, matches: ifMatches, commands: ifCommands } = req.query;
        const response = {};
        if (ifStats !== 'false') response.stats = stats;
        if (ifMatches === 'true' || req.query.matches === 'true') response.matches = matchesArr;
        if (ifCommands === 'true' || req.query.commands === 'true') response.commands = commands;
        return res.json(response);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
