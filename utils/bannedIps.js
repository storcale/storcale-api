const path = require('path');
const BannedIp = require(path.join(global.__basedir, 'db/schemas/bannedIp.js'));

let cache = {};
let refreshTimer = null;

async function refreshBannedIpsCache() {
    const docs = await BannedIp.find({}).lean();
    const obj = {};
    docs.forEach((d) => {
        obj[d.ip] = { reason: d.reason, bannedAt: d.bannedAt, bannedBy: d.bannedBy };
    });
    cache = obj;
    return cache;
}

function getBannedIpsCache() {
    return cache;
}

async function banIp(ip, reason, bannedBy) {
    await BannedIp.findOneAndUpdate(
        { ip },
        { ip, reason: reason || 'unspecified', bannedBy: bannedBy || 'admin', bannedAt: new Date() },
        { upsert: true }
    );
    return refreshBannedIpsCache();
}

async function unbanIp(ip) {
    await BannedIp.deleteOne({ ip });
    return refreshBannedIpsCache();
}

function startBannedIpsAutoRefresh(intervalMs = 60000) {
    if (refreshTimer) return;
    refreshTimer = setInterval(() => {
        refreshBannedIpsCache().catch((err) => console.error('BannedIps cache refresh failed:', err.message));
    }, intervalMs);
    if (refreshTimer.unref) refreshTimer.unref();
}

module.exports = {
    refreshBannedIpsCache,
    getBannedIpsCache,
    banIp,
    unbanIp,
    startBannedIpsAutoRefresh,
};