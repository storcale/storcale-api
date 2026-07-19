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
 *         description: Include commands in response (only for per-user mode).
 *     responses:
 *       200:
 *         description: Per-user stats (userId provided) or global stats (no userId).
 *       500:
 *         description: Server error
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const Match = require(path.join(global.__basedir, 'db/schemas/match.js'));
const PlayerStat = require(path.join(global.__basedir, 'db/schemas/playerStat.js'));
const { versionAtLeast } = require(path.join(global.__basedir, 'utils/matchStats.js'));

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

function normalizeMatch(obj) {
    if (!versionAtLeast(obj.terminalVersion, 2, 0, 0)) return obj;

    const leaderstats = {};
    const playTimeList = {};
    const allPlayers = [...(obj.defendersPlayerList || []), ...(obj.attackersPlayerList || [])];

    for (const player of allPlayers) {
        const uid = String(player.userId);
        const statsObj = {};
        for (const stat of (player.statistics || [])) statsObj[stat.name] = stat.value;
        leaderstats[uid] = { Kills: statsObj.Kills || 0, Deaths: statsObj.Deaths || 0, Ping: statsObj.Ping || 0 };
        playTimeList[uid] = { defenders: player.Playtime || 0, attackers: 0 };
    }

    const logs = (obj.logs || []).map(log => ({ ...log, userId: log.userId != null ? String(log.userId) : null }));

    return { ...obj, placeName: obj.gameName, leaderstats, playTimeList, logs, date: obj.matchStartTime ?? obj.date };
}

async function loadFilteredMatches(from, since, to, until, map) {
    const dateFrom = from || since;
    const dateTo = to || until;
    const docs = await Match.find({}).lean();
    const result = [];

    for (const doc of docs) {
        const obj = normalizeMatch(doc.data);
        if (map && obj.placeName && !obj.placeName.includes(map)) continue;

        if (dateFrom || dateTo) {
            let d = null;
            if (obj.matchStartTime) d = new Date(obj.matchStartTime * 1000);
            else d = parseDate(obj.date || obj.timestamp || obj.startTime);

            const fromDate = parseDate(dateFrom);
            const toDate = parseDate(dateTo);

            if (dateFrom && fromDate && !isNaN(fromDate.getTime()) && d && d < fromDate) continue;
            if (dateTo && toDate && !isNaN(toDate.getTime()) && d && d > toDate) continue;
        }

        result.push(obj);
    }

    return result;
}

function buildGlobalStatsFromMatches(matchObjs, minKills) {
    minKills = Number(minKills) || 1;

    const killMap = {}, deathMap = {}, playTimeMap = {}, mapCounts = {};
    let totalPing = 0, pingCount = 0, totalKills = 0, totalDeaths = 0;

    for (const obj of matchObjs) {
        if (obj.placeName) mapCounts[obj.placeName] = (mapCounts[obj.placeName] || 0) + 1;

        if (obj.leaderstats) {
            for (const [uid, ls] of Object.entries(obj.leaderstats)) {
                const kills = ls.Kills || 0, deaths = ls.Deaths || 0;
                killMap[uid] = (killMap[uid] || 0) + kills;
                deathMap[uid] = (deathMap[uid] || 0) + deaths;
                totalKills += kills; totalDeaths += deaths;
                if (typeof ls.Ping === 'number') { totalPing += ls.Ping; pingCount++; }
            }
        }

        if (obj.playTimeList) {
            for (const [uid, pt] of Object.entries(obj.playTimeList)) {
                const time = (typeof pt.defenders === 'number' ? pt.defenders : 0) + (typeof pt.attackers === 'number' ? pt.attackers : 0);
                playTimeMap[uid] = (playTimeMap[uid] || 0) + time;
            }
        }
    }

    const topN = (map, key) => Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([userId, v]) => ({ userId, [key]: v }));
    const TopKillers = topN(killMap, 'kills');
    const TopDeaths = topN(deathMap, 'deaths');
    const TopPlayTime = Object.entries(playTimeMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([userId, secs]) => ({ userId, playTime: Math.round(secs / 60) }));
    const allUids = new Set([...Object.keys(killMap), ...Object.keys(deathMap)]);
    const TopKD = Array.from(allUids)
        .filter(uid => (killMap[uid] || 0) >= minKills)
        .map(uid => ({
            userId: uid,
            kills: killMap[uid] || 0,
            deaths: deathMap[uid] || 0,
            kd: deathMap[uid] > 0 ? Math.round((killMap[uid] / deathMap[uid]) * 100) / 100 : (killMap[uid] || 0),
        }))
        .sort((a, b) => b.kd - a.kd)
        .slice(0, 5);
    const TopMaps = Object.entries(mapCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([map, count]) => ({ map, count }));

    return {
        MatchCount: matchObjs.length,
        TotalKills: totalKills,
        TotalDeaths: totalDeaths,
        totalKills, totalDeaths,
        AveragePing: pingCount > 0 ? Math.round(totalPing / pingCount) : 0,
        TopKillers, TopDeaths, TopKD, TopPlayTime, TopMaps,
    };
}

function buildUserStatsFromMatches(userId, matchObjs) {
    let stats = { Ping: 0, Kills: 0, Deaths: 0 };
    let pingCount = 0, totalPlayTime = 0;
    const commands = [];

    for (const obj of matchObjs) {
        if (obj.leaderstats && obj.leaderstats[userId]) {
            const ls = obj.leaderstats[userId];
            if (typeof ls.Ping === 'number') { stats.Ping += ls.Ping; pingCount++; }
            stats.Kills += ls.Kills || 0;
            stats.Deaths += ls.Deaths || 0;
        }
        if (obj.playTimeList && obj.playTimeList[userId]) {
            const pt = obj.playTimeList[userId];
            if (typeof pt.defenders === 'number') totalPlayTime += pt.defenders;
            if (typeof pt.attackers === 'number') totalPlayTime += pt.attackers;
        }
        if (Array.isArray(obj.logs)) commands.push(...obj.logs.filter(l => String(l.userId) === String(userId)));
    }

    if (pingCount > 0) stats.Ping = Math.round(stats.Ping / pingCount);
    stats.playTime = Math.round(totalPlayTime / 60);
    stats.KD = stats.Deaths > 0 ? Math.round((stats.Kills / stats.Deaths) * 100) / 100 : stats.Kills;

    return { stats, commands };
}

router.get('/', async (req, res) => {
    try {
        const { userId, from, since, to, until, map, minKillsKD } = req.query;
        const { matches: ifMatches, commands: ifCommands } = req.query;
        const hasFilters = Boolean(from || since || to || until || map);

        if (!userId && !hasFilters && ifMatches !== 'true') {
            const players = await PlayerStat.find({}).lean();
            const totalKills = players.reduce((s, p) => s + p.kills, 0);
            const totalDeaths = players.reduce((s, p) => s + p.deaths, 0);
            const minKills = Number(minKillsKD) || 1;

            const TopKillers = [...players].sort((a, b) => b.kills - a.kills).slice(0, 5).map(p => ({ userId: p.userId, kills: p.kills }));
            const TopDeaths = [...players].sort((a, b) => b.deaths - a.deaths).slice(0, 5).map(p => ({ userId: p.userId, deaths: p.deaths }));
            const TopKD = players
                .filter(p => p.kills >= minKills)
                .map(p => ({ userId: p.userId, kills: p.kills, deaths: p.deaths, kd: p.deaths > 0 ? Math.round((p.kills / p.deaths) * 100) / 100 : p.kills }))
                .sort((a, b) => b.kd - a.kd)
                .slice(0, 5);
            const TopPlayTime = [...players].sort((a, b) => b.playTimeSec - a.playTimeSec).slice(0, 5).map(p => ({ userId: p.userId, playTime: Math.round(p.playTimeSec / 60) }));
            const totalSamples = players.reduce((s, p) => s + p.pingSamples, 0);
            const totalPing = players.reduce((s, p) => s + p.totalPing, 0);
            const AveragePing = totalSamples > 0 ? Math.round(totalPing / totalSamples) : 0;
            const matchCount = await Match.countDocuments({});

            const stats = { MatchCount: matchCount, TotalKills: totalKills, TotalDeaths: totalDeaths, AveragePing, TopKillers, TopDeaths, TopKD, TopPlayTime };
            return res.json({ stats, totalKills, totalDeaths });
        }

        // Fast path
        if (userId && !hasFilters && ifMatches !== 'true' && ifCommands !== 'true') {
            const p = await PlayerStat.findOne({ userId: String(userId) }).lean();
            const stats = {
                Ping: p && p.pingSamples > 0 ? Math.round(p.totalPing / p.pingSamples) : 0,
                Kills: p?.kills || 0,
                Deaths: p?.deaths || 0,
                playTime: p ? Math.round(p.playTimeSec / 60) : 0,
                KD: p && p.deaths > 0 ? Math.round((p.kills / p.deaths) * 100) / 100 : (p?.kills || 0),
            };
            return res.json({ stats, totalKills: stats.Kills, totalDeaths: stats.Deaths });
        }

       
        const matchObjs = await loadFilteredMatches(from, since, to, until, map);

        if (!userId) {
            const stats = buildGlobalStatsFromMatches(matchObjs, minKillsKD);
            const response = { stats, totalKills: stats.TotalKills, totalDeaths: stats.TotalDeaths };
            if (ifMatches === 'true') response.matches = matchObjs;
            return res.json(response);
        }

        const { stats, commands } = buildUserStatsFromMatches(userId, matchObjs);
        const response = { stats, totalKills: stats.Kills, totalDeaths: stats.Deaths };
        if (ifMatches === 'true') response.matches = matchObjs;
        if (ifCommands === 'true') response.commands = commands;
        return res.json(response);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;