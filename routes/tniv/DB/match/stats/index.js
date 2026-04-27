const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const logFilePath = path.join(__dirname, '../../match/matches.log');


function parseVersion(v) {
    if (!v) return [0, 0, 0];
    return String(v).replace(/^v/, '').split('.').map(Number);
}

function versionAtLeast(v, major, minor, patch = 0) {
    const [ma, mi, pa] = parseVersion(v);
    if (ma !== major) return ma > major;
    if (mi !== minor) return mi > minor;
    return pa >= patch;
}

function normalizeMatch(raw) {
    if (!versionAtLeast(raw.terminalVersion, 2, 0, 0)) {
        // Old format
        const cfg = raw.config || {};
        return {
            _raw: raw,
            matchStartTime: raw.startTime,
            endTime:        raw.endTime,
            attackersName:  cfg.attackersName  || null,
            attackersId:    cfg.attackersGroupId || null,
            defendersName:  cfg.defendersName  || null,
            defendersId:    cfg.defendersGroupId || null,
            gameId:         raw.placeId        || null,
            gameName:       raw.placeName      || null,
            winner:         raw.ended ? (raw.attackerPoints >= (cfg.maxPoints || Infinity) ? 'attackers' : 'defenders') : null,
            attackerCount:  null,
            defenderCount:  null,
            terminalHistory: raw.terminalStateHistory || [],
            terminalVersion: raw.version || null,
            attackersScore:  raw.attackerPoints,
            defendersScore:  raw.defenderPoints,
            region:          raw.serverLocation || null,
        };
    }

    // New format 
    return {
        _raw: raw,
        matchStartTime: raw.matchStartTime,
        endTime:        raw.endTime,
        attackersName:  raw.attackersName  || null,
        attackersId:    raw.attackersId    || null,
        defendersName:  raw.defendersName  || null,
        defendersId:    raw.defendersId    || null,
        gameId:         raw.gameId         || null,
        gameName:       raw.gameName       || null,
        winner:         raw.winner         || null,
        attackerCount:  (raw.attackersPlayerList || []).length,
        defenderCount:  (raw.defendersPlayerList || []).length,
        terminalHistory: raw.terminalHistory || [],
        terminalVersion: raw.terminalVersion || null,
        attackersScore:  raw.attackersScore,
        defendersScore:  raw.defendersScore,
        region:          raw.region        || null,
    };
}


function loadMatches() {
    if (!fs.existsSync(logFilePath)) {
        console.warn('[match/stats] Log file not found at:', logFilePath);
        return [];
    }
    return fs.readFileSync(logFilePath, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((line, i) => {
            try {
                return normalizeMatch(JSON.parse(line));
            } catch (err) {
                console.warn(`[match/stats] Skipped line ${i + 1}:`, err.message);
                return null;
            }
        })
        .filter(Boolean);
}


function applyFilters(matches, q) {
    return matches.filter(m => {
        if (q.from  && m.matchStartTime < Number(q.from))  return false;
        if (q.until && m.endTime        > Number(q.until)) return false;

        if (q.attackersName && !(m.attackersName || '').toLowerCase().includes(q.attackersName.toLowerCase())) return false;
        if (q.defendersName && !(m.defendersName || '').toLowerCase().includes(q.defendersName.toLowerCase())) return false;
        if (q.attackersId   && String(m.attackersId) !== String(q.attackersId))   return false;
        if (q.defendersId   && String(m.defendersId) !== String(q.defendersId))   return false;

        if (q.gameId   && String(m.gameId) !== String(q.gameId))                  return false;
        if (q.gameName && !(m.gameName || '').toLowerCase().includes(q.gameName.toLowerCase())) return false;

        if (q.winner && m.winner !== q.winner) return false;

        if (q.minAttackers && m.attackerCount < Number(q.minAttackers)) return false;
        if (q.minDefenders && m.defenderCount < Number(q.minDefenders)) return false;

        return true;
    });
}



function buildStats(matches) {
    const winCount = { attackers: 0, defenders: 0, null: 0 };
    const regionCount = {};
    const versionCount = {};
    const gameCount = {};

    for (const m of matches) {
        winCount[m.winner] = (winCount[m.winner] || 0) + 1;

        if (m.region)          regionCount[m.region]          = (regionCount[m.region]          || 0) + 1;
        if (m.terminalVersion) versionCount[m.terminalVersion] = (versionCount[m.terminalVersion] || 0) + 1;
        if (m.gameName)        gameCount[m.gameName]           = (gameCount[m.gameName]           || 0) + 1;
    }

    const totalPlayers = matches.reduce((s, m) => s + m.attackerCount + m.defenderCount, 0);

    return {
        matchCount:        matches.length,
        attackerWins:      winCount.attackers || 0,
        defenderWins:      winCount.defenders || 0,
        avgAttackers:      matches.length ? +(matches.reduce((s, m) => s + m.attackerCount, 0) / matches.length).toFixed(2) : 0,
        avgDefenders:      matches.length ? +(matches.reduce((s, m) => s + m.defenderCount, 0) / matches.length).toFixed(2) : 0,
        avgPlayersPerMatch: matches.length ? +(totalPlayers / matches.length).toFixed(2) : 0,
        byRegion:          regionCount,
        byVersion:         versionCount,
        byGame:            gameCount,
    };
}



/**
 * @swagger
 * /tniv/DB/match/stats:
 *   get:
 *     summary: Aggregate stats across all matches, with optional filtering.
 *     tags:
 *       - TNIV/DB
 *     parameters:
 *       - { in: query, name: from,          schema: { type: integer }, description: "Filter: matchStartTime >= value (unix seconds)" }
 *       - { in: query, name: until,         schema: { type: integer }, description: "Filter: endTime <= value (unix seconds)" }
 *       - { in: query, name: attackersName, schema: { type: string  }, description: "Filter: partial match on attackers name" }
 *       - { in: query, name: defendersName, schema: { type: string  }, description: "Filter: partial match on defenders name" }
 *       - { in: query, name: attackersId,   schema: { type: string  }, description: "Filter: exact attackers group ID" }
 *       - { in: query, name: defendersId,   schema: { type: string  }, description: "Filter: exact defenders group ID" }
 *       - { in: query, name: gameId,        schema: { type: string  }, description: "Filter: exact game/place ID" }
 *       - { in: query, name: gameName,      schema: { type: string  }, description: "Filter: partial match on game name" }
 *       - { in: query, name: winner,        schema: { type: string, enum: [attackers, defenders] }, description: "Filter: match winner" }
 *       - { in: query, name: minAttackers,  schema: { type: integer }, description: "Filter: minimum attacker count" }
 *       - { in: query, name: minDefenders,  schema: { type: integer }, description: "Filter: minimum defender count" }
 *       - { in: query, name: includeMatches,schema: { type: string, enum: [true, false] }, description: "Include full normalised match list" }
 *     responses:
 *       200:
 *         description: Aggregated stats and optional match list
 *       500:
 *         description: Server error
 */
router.get('/', (req, res) => {
    try {
        const matches  = applyFilters(loadMatches(), req.query);
        const stats    = buildStats(matches);
        const response = { stats };

        if (req.query.includeMatches === 'true') {
            response.matches = matches.map(({ _raw, ...m }) => m);
        }

        res.json(response);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;