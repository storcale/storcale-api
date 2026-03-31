/**
 * @swagger
 * /tniv/DB/player/stats:
 *   get:
 *     summary: Get player stats by userId, or global match stats if no userId is provided.
 *     tags:
 *       - TNIV/DB/Player
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         required: false
 *         description: The user ID to query. Omit for global stats.
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *         description: Filter matches from this date (inclusive). Alias since.
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *         description: Alias for from.
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *         description: Filter matches up to this date (inclusive). Alias until.
 *       - in: query
 *         name: until
 *         schema:
 *           type: string
 *         description: Alias for to.
 *       - in: query
 *         name: minKillsKD
 *         schema:
 *           type: number
 *         description: Minimum kills to be shown in top KD (default 1)
 *       - in: query
 *         name: map
 *         schema:
 *           type: string
 *         description: Filter matches by map name (partial match).
 *         description: Include stats in response (default true).
 *       - in: query
 *         name: matches
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Include matches in response (only for per-user mode).
 *       - in: query
 *         name: commands
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Include commands in response (only for per-user mode).
 *     responses:
 *       200:
 *         description: >
 *           Per-user stats (userId provided) or global stats (no userId).
 *           Global stats include MatchCount, TotalKills, TotalDeaths, AveragePing,
 *           TopKillers, TopDeaths, TopKD, TopPlayTime, and TopMaps.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
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
const matchesLogPath = path.join(__dirname, '../../match/matches.log');

function parseDate(str) {
    if (!str) return null;
    if (!isNaN(str)) {
        let num = Number(str);
        if (num > 1000000000 && num < 2000000000) return new Date(num * 1000);
        return new Date(num);
    }
    const parts = str.split(/[\/ :]/);
    if (parts.length >= 6) {
        const [month, day, year, hour, min, sec] = parts;
        return new Date(year, month - 1, day, hour || 0, min || 0, sec || 0);
    }
    if (parts.length >= 3) {
        const [month, day, year] = parts;
        return new Date(year, month - 1, day);
    }
    return new Date(str);
}

function loadFilteredMatches(from, since, to, until, map) {
    if (!fs.existsSync(matchesLogPath)) return [];
    const lines = fs.readFileSync(matchesLogPath, 'utf8').split('\n').filter(Boolean);
    const result = [];
    const dateFrom = from || since;
    const dateTo = to || until;

    for (const line of lines) {
        let obj;
        try { obj = JSON.parse(line); } catch { continue; }

        if (map && obj.placeName && !obj.placeName.includes(map)) continue;

        if (dateFrom || dateTo) {
            const d = parseDate(obj.date || obj.timestamp || obj.startTime);
            if (dateFrom && d < parseDate(dateFrom)) continue;
            if (dateTo && d > parseDate(dateTo)) continue;
        }

        result.push(obj);
    }

    return result;
}

function buildGlobalStats(matchObjs, minKills) {
    minKills = Number(minKills) || 1;

    const killMap = {};
    const deathMap = {};
    const playTimeMap = {};
    const mapCounts = {};

    let totalPing = 0, pingCount = 0;
    let totalKills = 0, totalDeaths = 0;

    for (const obj of matchObjs) {
        if (obj.placeName) {
            mapCounts[obj.placeName] = (mapCounts[obj.placeName] || 0) + 1;
        }

        if (obj.leaderstats) {
            for (const [uid, ls] of Object.entries(obj.leaderstats)) {
                const kills = ls.Kills || 0;
                const deaths = ls.Deaths || 0;

                killMap[uid] = (killMap[uid] || 0) + kills;
                deathMap[uid] = (deathMap[uid] || 0) + deaths;

                totalKills += kills;
                totalDeaths += deaths;

                if (typeof ls.Ping === 'number') {
                    totalPing += ls.Ping;
                    pingCount++;
                }
            }
        }

        if (obj.playTimeList) {
            for (const [uid, pt] of Object.entries(obj.playTimeList)) {
                const time = (typeof pt.defenders === 'number' ? pt.defenders : 0)
                    + (typeof pt.attackers === 'number' ? pt.attackers : 0);

                playTimeMap[uid] = (playTimeMap[uid] || 0) + time;
            }
        }
    }

    const topN = (map, key) =>
        Object.entries(map)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([userId, v]) => ({ userId, [key]: v }));

    const TopKillers = topN(killMap, 'kills');
    const TopDeaths = topN(deathMap, 'deaths');

    const TopPlayTime = Object.entries(playTimeMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([userId, secs]) => ({ userId, playTime: Math.round(secs / 60) }));

    const allUids = new Set([...Object.keys(killMap), ...Object.keys(deathMap)]);

    const TopKD = Array.from(allUids)
        .filter(uid => (killMap[uid] || 0) >= minKills)
        .map(uid => ({
            userId: uid,
            kills: killMap[uid] || 0,
            deaths: deathMap[uid] || 0,
            kd: deathMap[uid] > 0
                ? Math.round((killMap[uid] / deathMap[uid]) * 100) / 100
                : (killMap[uid] || 0)
        }))
        .sort((a, b) => b.kd - a.kd)
        .slice(0, 5);

    const TopMaps = Object.entries(mapCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([map, count]) => ({ map, count }));

    return {
        MatchCount: matchObjs.length,
        TotalKills: totalKills,
        TotalDeaths: totalDeaths,
        AveragePing: pingCount > 0 ? Math.round(totalPing / pingCount) : 0,
        TopKillers,
        TopDeaths,
        TopKD,
        TopPlayTime,
        TopMaps
    };
}

function buildUserStats(userId, matchObjs) {
    let stats = { Ping: 0, Kills: 0, Deaths: 0 };
    let pingCount = 0;
    let totalPlayTime = 0;
    const commands = [];

    for (const obj of matchObjs) {
        if (obj.leaderstats && obj.leaderstats[userId]) {
            const ls = obj.leaderstats[userId];

            if (typeof ls.Ping === 'number') {
                stats.Ping += ls.Ping;
                pingCount++;
            }

            stats.Kills += ls.Kills || 0;
            stats.Deaths += ls.Deaths || 0;
        }

        if (obj.playTimeList && obj.playTimeList[userId]) {
            const pt = obj.playTimeList[userId];
            if (typeof pt.defenders === 'number') totalPlayTime += pt.defenders;
            if (typeof pt.attackers === 'number') totalPlayTime += pt.attackers;
        }

        if (Array.isArray(obj.logs)) {
            commands.push(...obj.logs.filter(l => String(l.userId) === String(userId)));
        }
    }

    if (pingCount > 0) stats.Ping = Math.round(stats.Ping / pingCount);

    stats.playTime = Math.round(totalPlayTime / 60);
    stats.KD = stats.Deaths > 0
        ? Math.round((stats.Kills / stats.Deaths) * 100) / 100
        : stats.Kills;

    return { stats, commands };
}

router.get('/', async (req, res) => {
    try {
        const { userId, from, since, to, until, map, minKillsKD } = req.query;
        const { matches: ifMatches, commands: ifCommands } = req.query;

        const matchObjs = loadFilteredMatches(from, since, to, until, map);

        if (!userId) {
            const stats = buildGlobalStats(matchObjs, minKillsKD);
            const response = { stats };

            if (ifMatches === 'true') response.matches = matchObjs;

            return res.json(response);
        }

        const { stats, commands } = buildUserStats(userId, matchObjs);

        const response = { stats };

        if (ifMatches === 'true') response.matches = matchObjs;
        if (ifCommands === 'true') response.commands = commands;

        return res.json(response);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;