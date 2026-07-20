const fs = require('fs');
const path = require('path');
const LOG_PATH = path.join(global.__basedir, 'access.log');

const CACHE_TTL_MS = 1000 * 1000; 
let cache = null;
let cacheExpires = 0;

function computeStats() {
    const raw = fs.existsSync(LOG_PATH) ? fs.readFileSync(LOG_PATH, 'utf8') : '';
    const lines = raw.split(/\r?\n/).filter(Boolean);
    const total = lines.length;

    const perDay = {};
    lines.forEach((l) => {
        const m = l.match(/^\[(.*?)\]/);
        if (!m) return;
        const d = new Date(m[1]);
        if (isNaN(d.getTime())) return;
        const k = d.toISOString().slice(0, 10);
        perDay[k] = (perDay[k] || 0) + 1;
    });

    const days = Object.keys(perDay).length;
    const values = Object.values(perDay);
    const todayKey = new Date().toISOString().slice(0, 10);

    return {
        total,
        days,
        today: perDay[todayKey] || 0,
        avgPerDay: days ? +(total / days).toFixed(2) : 0,
        max: values.length ? Math.max(...values) : 0,
        min: values.length ? Math.min(...values) : 0,
        perDay,
        generatedAt: new Date().toISOString(),
        cachedForMs: CACHE_TTL_MS,
    };
}

function getStats(force = false) {
    const now = Date.now();
    if (!force && cache && now < cacheExpires) return cache;
    cache = computeStats();
    cacheExpires = now + CACHE_TTL_MS;
    return cache;
}

module.exports = { getStats, CACHE_TTL_MS };