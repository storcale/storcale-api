
const axios = require('axios');

function getStat(player, name) {
    const entry = (player.statistics || []).find(s => s.name === name);
    return entry ? entry.value : 0;
}

function normalisePlayers(playerList) {
    if (!Array.isArray(playerList)) return [];
    return playerList.map(p => ({
        username:    p.username    || String(p.userId),
        displayName: p.displayName || p.username || String(p.userId),
        kills:       getStat(p, 'Kills'),
        deaths:      getStat(p, 'Deaths'),
        isVanguard:  p.isVanguard === true,
    }));
}

function formatPlayerLines(players) {
    if (!players.length) return '*No players*';
    return players
        .sort((a, b) => b.kills - a.kills)
        .map(p => `${p.displayName} ‣ ${p.kills}-${p.deaths}`)
        .join('\n');
}

function formatScore(score, maxPoints) {
    const num = typeof score === 'number' ? score : parseFloat(score);
    return isNaN(num)
        ? `${score}/${maxPoints}`
        : `${+num.toFixed(2)}/${maxPoints}`;
}

function buildEmbed(match) {
    const gameName     = match.gameName     || 'Unknown Map';
    const winner       = match.winner;
    const attackerName = match.attackersName || 'Attackers';
    const defenderName = match.defendersName || 'Defenders';
    const maxPoints    = match.terminal_config?.maxPoints || '?';
    const gameUrl      = match.placeId
        ? `https://www.roblox.com/games/${match.placeId}`
        : null;

    const winnerName = winner === 'attackers' ? attackerName
                     : winner === 'defenders' ? defenderName
                     : 'Unknown';

    const attackers = normalisePlayers(match.attackersPlayerList);
    const defenders = normalisePlayers(match.defendersPlayerList);

    const vanguardMembers = [...attackers, ...defenders].filter(p => p.isVanguard);

    const timestamp = new Date(
        match.matchStartTime > 1e9
            ? match.matchStartTime * 1000
            : match.matchStartTime || Date.now()
    ).toISOString();

    const embed = {
        title:       gameName,
        url:         gameUrl,
        description: `**${winnerName}** HAVE WON THE GAME!`,
        color:       winner === 'attackers' ? 0xe50000 : 0xff5500,
        fields: [
            {
                name:   'Points',
                value:  `**${defenderName}:** ${formatScore(match.defendersScore, maxPoints)}\n**${attackerName}:** ${formatScore(match.attackersScore, maxPoints)}`,
                inline: false,
            },
            {
                name:   defenderName,
                value:  formatPlayerLines(defenders),
                inline: true,
            },
            {
                name:   attackerName,
                value:  formatPlayerLines(attackers),
                inline: true,
            },
        ],
        footer: {
            text: `Session ${match.sessionId} • ${match.region || 'Unknown region'} • v${match.terminalVersion} - The Vanguard Development Team`,
        },
        timestamp,
    };

    if (vanguardMembers.length) {
        embed.fields.push({
            name:   `${defenderName} Group Members`,
            value:  vanguardMembers.map(p => p.displayName).join('\n'),
            inline: false,
        });
    }

    return embed;
}

async function sendMatchWebhook(match, { baseUrl, target, apiKey }) {
    const embed   = buildEmbed(match);
    const payload = {
        username: 'Terminal Results',
        embeds:   [embed],
    };

    const url = `${baseUrl}/api/tniv/webhooks?target=${encodeURIComponent(target)}`;

    const response = await axios.post(url, payload, {
        headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey || '',
        },
    });

    return response.data;
}

module.exports = { sendMatchWebhook, buildEmbed };