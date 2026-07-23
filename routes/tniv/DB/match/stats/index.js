const express = require("express");
const router = express.Router();

const path = require("path");
const Match = require(path.join(global.__basedir, "db/schemas/match.js"));

function parseVersion(v) {
    if (!v) return [0, 0, 0];
    return String(v).replace(/^v/, "").split(".").map(Number);
}

function versionAtLeast(v, major, minor, patch = 0) {
    const [ma, mi, pa] = parseVersion(v);

    if (ma !== major) return ma > major;
    if (mi !== minor) return mi > minor;

    return pa >= patch;
}

function normalizeMatch(raw) {
    if (!versionAtLeast(raw.terminalVersion, 2, 0, 0)) {
        const cfg = raw.config || {};

        return {
            matchStartTime: raw.startTime,
            endTime: raw.endTime,

            attackersName: cfg.attackersName || null,
            attackersId: cfg.attackersGroupId || null,

            defendersName: cfg.defendersName || null,
            defendersId: cfg.defendersGroupId || null,

            gameId: raw.placeId || null,
            gameName: raw.placeName || null,

            winner: raw.ended
                ? raw.attackerPoints >= (cfg.maxPoints || Infinity)
                    ? "attackers"
                    : "defenders"
                : null,

            attackerCount: 0,
            defenderCount: 0,
            vanguardCount: 0,

            terminalHistory: raw.terminalStateHistory || [],
            terminalVersion: raw.version || null,

            attackersScore: raw.attackerPoints,
            defendersScore: raw.defenderPoints,

            region: raw.serverLocation || null,
        };
    }

    const attackers = raw.attackersPlayerList || [];
    const defenders = raw.defendersPlayerList || [];
    const allPlayers = [...attackers, ...defenders];

    return {
        matchStartTime: raw.matchStartTime,
        endTime: raw.endTime,

        attackersName: raw.attackersName || null,
        attackersId: raw.attackersId || null,

        defendersName: raw.defendersName || null,
        defendersId: raw.defendersId || null,

        gameId: raw.gameId || null,
        gameName: raw.gameName || null,

        winner: raw.winner || null,

        attackerCount: attackers.length,
        defenderCount: defenders.length,
        vanguardCount: allPlayers.filter(p => p.isVanguard).length,

        terminalHistory: raw.terminalHistory || [],
        terminalVersion: raw.terminalVersion || null,

        attackersScore: raw.attackersScore,
        defendersScore: raw.defendersScore,

        region: raw.region || null,
    };
}

function applyFilters(matches, q) {
    return matches.filter(m => {
        if (q.from && m.matchStartTime < Number(q.from)) return false;
        if (q.until && m.endTime > Number(q.until)) return false;

        if (
            q.attackersName &&
            !(m.attackersName || "")
                .toLowerCase()
                .includes(q.attackersName.toLowerCase())
        )
            return false;

        if (
            q.defendersName &&
            !(m.defendersName || "")
                .toLowerCase()
                .includes(q.defendersName.toLowerCase())
        )
            return false;

        if (
            q.attackersId &&
            String(m.attackersId) !== String(q.attackersId)
        )
            return false;

        if (
            q.defendersId &&
            String(m.defendersId) !== String(q.defendersId)
        )
            return false;

        if (q.gameId && String(m.gameId) !== String(q.gameId))
            return false;

        if (
            q.gameName &&
            !(m.gameName || "")
                .toLowerCase()
                .includes(q.gameName.toLowerCase())
        )
            return false;

        if (q.winner && m.winner !== q.winner)
            return false;

        if (
            q.minAttackers &&
            m.attackerCount < Number(q.minAttackers)
        )
            return false;

        if (
            q.minDefenders &&
            m.defenderCount < Number(q.minDefenders)
        )
            return false;

        return true;
    });
}

function buildStats(matches) {
    const winCount = {};
    const regionCount = {};
    const versionCount = {};
    const gameCount = {};

    for (const m of matches) {
        winCount[m.winner] = (winCount[m.winner] || 0) + 1;

        if (m.region)
            regionCount[m.region] = (regionCount[m.region] || 0) + 1;

        if (m.terminalVersion)
            versionCount[m.terminalVersion] =
                (versionCount[m.terminalVersion] || 0) + 1;

        if (m.gameName)
            gameCount[m.gameName] =
                (gameCount[m.gameName] || 0) + 1;
    }

    const totalPlayers = matches.reduce(
        (s, m) => s + m.attackerCount + m.defenderCount,
        0
    );

    return {
        matchCount: matches.length,

        attackerWins: winCount.attackers || 0,
        defenderWins: winCount.defenders || 0,

        avgAttackers: matches.length
            ? +(matches.reduce((s, m) => s + m.attackerCount, 0) / matches.length).toFixed(2)
            : 0,

        avgDefenders: matches.length
            ? +(matches.reduce((s, m) => s + m.defenderCount, 0) / matches.length).toFixed(2)
            : 0,

        avgPlayersPerMatch: matches.length
            ? +(totalPlayers / matches.length).toFixed(2)
            : 0,

        byRegion: regionCount,
        byVersion: versionCount,
        byGame: gameCount,
    };
}

/**
 * @swagger
 * /tniv/DB/match/stats:
 *   get:
 *     summary: Aggregate statistics across all matches.
 *     description: >
 *       Returns aggregate statistics for stored matches with optional filtering.
 *     tags:
 *       - TNIV/DB
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: integer
 *         description: Only include matches with matchStartTime >= this Unix timestamp.
 *
 *       - in: query
 *         name: until
 *         schema:
 *           type: integer
 *         description: Only include matches with endTime <= this Unix timestamp.
 *
 *       - in: query
 *         name: attackersName
 *         schema:
 *           type: string
 *         description: Partial match on attackers group name.
 *
 *       - in: query
 *         name: defendersName
 *         schema:
 *           type: string
 *         description: Partial match on defenders group name.
 *
 *       - in: query
 *         name: attackersId
 *         schema:
 *           type: string
 *         description: Exact attackers group ID.
 *
 *       - in: query
 *         name: defendersId
 *         schema:
 *           type: string
 *         description: Exact defenders group ID.
 *
 *       - in: query
 *         name: gameId
 *         schema:
 *           type: string
 *         description: Exact game ID.
 *
 *       - in: query
 *         name: gameName
 *         schema:
 *           type: string
 *         description: Partial game name.
 *
 *       - in: query
 *         name: winner
 *         schema:
 *           type: string
 *           enum:
 *             - attackers
 *             - defenders
 *         description: Filter by winning team.
 *
 *       - in: query
 *         name: minAttackers
 *         schema:
 *           type: integer
 *         description: Minimum number of attackers.
 *
 *       - in: query
 *         name: minDefenders
 *         schema:
 *           type: integer
 *         description: Minimum number of defenders.
 *
 *       - in: query
 *         name: includeMatches
 *         schema:
 *           type: boolean
 *         description: Include the normalized match list in the response.
 *
 *     responses:
 *       200:
 *         description: Statistics generated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
 *                   properties:
 *                     matchCount:
 *                       type: integer
 *                     attackerWins:
 *                       type: integer
 *                     defenderWins:
 *                       type: integer
 *                     avgAttackers:
 *                       type: number
 *                     avgDefenders:
 *                       type: number
 *                     avgPlayersPerMatch:
 *                       type: number
 *                     byRegion:
 *                       type: object
 *                       additionalProperties:
 *                         type: integer
 *                     byVersion:
 *                       type: object
 *                       additionalProperties:
 *                         type: integer
 *                     byGame:
 *                       type: object
 *                       additionalProperties:
 *                         type: integer
 *                 matches:
 *                   type: array
 *                   description: Present only when includeMatches=true.
 *                   items:
 *                     type: object
 *
 *       500:
 *         description: Internal server error.
 */
router.get("/", async (req, res) => {
    try {
        const mongoQuery = {};

        if (req.query.from)
            mongoQuery.matchStartTime = {
                ...mongoQuery.matchStartTime,
                $gte: Number(req.query.from),
            };

        if (req.query.until)
            mongoQuery.endTime = {
                ...mongoQuery.endTime,
                $lte: Number(req.query.until),
            };

        const docs = await Match.find(mongoQuery)
            .select("data")
            .lean();

        const matches = applyFilters(
            docs.map(doc => normalizeMatch(doc.data)),
            req.query
        );

        const stats = buildStats(matches);

        const response = {
            stats,
        };

        if (req.query.includeMatches === "true") {
            response.matches = matches;
        }

        res.json(response);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: err.message,
        });
    }
});

module.exports = router;