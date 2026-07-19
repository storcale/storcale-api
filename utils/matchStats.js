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

function getStat(player, name) {
    const entry = (player.statistics || []).find((s) => s.name === name);
    return entry ? entry.value : 0;
}


function extractPlayerDeltas(match) {
    const allPlayers = [
        ...(match.defendersPlayerList || []),
        ...(match.attackersPlayerList || []),
    ];

    return allPlayers.map((p) => ({
        userId: String(p.userId ?? p.username),
        username: p.username || String(p.userId),
        kills: getStat(p, 'Kills') || 0,
        deaths: getStat(p, 'Deaths') || 0,
        ping: getStat(p, 'Ping') || 0,
        playTimeSec: typeof p.Playtime === 'number' ? p.Playtime : 0,
    }));
}

module.exports = { parseVersion, versionAtLeast, getStat, extractPlayerDeltas };