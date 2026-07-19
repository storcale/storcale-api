/**
 * One-time migration: reads the old file-based storage and writes it into MongoDB.
 * Safe to re-run — everything is upserted / de-duplicated by unique key.
 *
 * Usage (from repo root):
 *   node scripts/migrate.js
 */
const path = require('path');
const fs = require('fs');
const basedir = path.join(__dirname, '..');
global.__basedir = basedir;

try {
    require('dotenv').config({ path: path.join(basedir, 'envs', '.env') });
} catch (e) {
    console.error('Error loading .env:', e);
}

const { connectDB, mongoose } = require(path.join(basedir, 'utils/db.js'));
const ApiKey = require(path.join(basedir, 'db/schemas/apiKey.js'));
const BannedIp = require(path.join(basedir, 'db/schemas/bannedIp.js'));
const Spreadsheet = require(path.join(basedir, 'db/schemas/spreadsheet.js'));
const Match = require(path.join(basedir, 'db/schemas/match.js'));
const PlayerStat = require(path.join(basedir, 'db/schemas/playerStat.js'));
const MemberCount = require(path.join(basedir, 'db/schemas/memberCount.js'));
const { extractPlayerDeltas } = require(path.join(basedir, 'utils/matchStats.js'));

async function migrateApiKeys() {
    const file = path.join(basedir, 'envs', 'apikeys.env.json');
    if (!fs.existsSync(file)) return console.log('[apiKeys] No apikeys.env.json found, skipping.');
    const data = JSON.parse(fs.readFileSync(file, 'utf8') || '{}');
    let count = 0;
    for (const [name, entry] of Object.entries(data)) {
        if (name === 'perms' || name === 'publicDirs') continue; // old special keys, no longer used
        if (!entry || !entry.key) continue;
        await ApiKey.findOneAndUpdate(
            { name },
            {
                name,
                key: entry.key,
                valid: entry.valid !== false,
                perm: entry.perm || '',
                rateLimit: entry.rateLimit || { limit: 30, windowMs: 60000 },
                meta: entry.meta || {},
            },
            { upsert: true }
        );
        count++;
    }
    console.log(`[apiKeys] Migrated ${count} key(s).`);
}

async function migrateBannedIps() {
    const file = path.join(basedir, 'envs', 'banned_ips.json');
    if (!fs.existsSync(file)) return console.log('[bannedIps] No banned_ips.json found, skipping.');
    const data = JSON.parse(fs.readFileSync(file, 'utf8') || '{}');
    let count = 0;
    for (const [ip, info] of Object.entries(data)) {
        await BannedIp.findOneAndUpdate(
            { ip },
            {
                ip,
                reason: info.reason || 'unspecified',
                bannedAt: info.bannedAt ? new Date(info.bannedAt) : new Date(),
                bannedBy: info.bannedBy || 'admin',
            },
            { upsert: true }
        );
        count++;
    }
    console.log(`[bannedIps] Migrated ${count} IP(s).`);
}

async function migrateSpreadsheets() {
    const file = path.join(basedir, 'envs', 'spreadsheets.env.json');
    if (!fs.existsSync(file)) return console.log('[spreadsheets] No spreadsheets.env.json found, skipping.');
    const data = JSON.parse(fs.readFileSync(file, 'utf8') || '{}');
    let count = 0;
    for (const [category, value] of Object.entries(data)) {
        await Spreadsheet.findOneAndUpdate(
            { category: category.toLowerCase() },
            { category: category.toLowerCase(), value },
            { upsert: true }
        );
        count++;
    }
    console.log(`[spreadsheets] Migrated ${count} categorie(s).`);
}

async function migrateMatches() {
    const file = path.join(basedir, 'routes', 'tniv', 'DB', 'match', 'matches.log');
    if (!fs.existsSync(file)) return console.log('[matches] No matches.log found, skipping.');
    const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
    let count = 0;
    for (const line of lines) {
        let obj;
        try { obj = JSON.parse(line); } catch { continue; }
        if (!obj.sessionId) continue;

        const exists = await Match.findOne({ sessionId: obj.sessionId });
        if (exists) continue;

        await Match.create({
            sessionId: obj.sessionId,
            data: obj,
            matchStartTime: obj.matchStartTime,
            endTime: obj.endTime,
        });

        const deltas = extractPlayerDeltas(obj);
        for (const d of deltas) {
            await PlayerStat.findOneAndUpdate(
                { userId: d.userId },
                {
                    $setOnInsert: { userId: d.userId },
                    $set: { username: d.username },
                    $inc: {
                        kills: d.kills,
                        deaths: d.deaths,
                        playTimeSec: d.playTimeSec,
                        matchesPlayed: 1,
                        totalPing: d.ping,
                        pingSamples: d.ping ? 1 : 0,
                    },
                },
                { upsert: true }
            );
        }
        count++;
    }
    console.log(`[matches] Migrated ${count} match(es) and updated PlayerStat totals.`);
}

async function migrateMemberCount() {
    const file = path.join(basedir, 'routes', 'tniv', 'group', 'membercount', 'store.json');
    if (!fs.existsSync(file)) return console.log('[membercount] No store.json found, skipping.');
    const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
    let count = 0;
    for (const line of lines) {
        let obj;
        try { obj = JSON.parse(line); } catch { continue; }
        if (!obj.groupId || obj.month == null || obj.year == null) continue; // skip malformed/legacy null entries
        await MemberCount.create({
            groupId: String(obj.groupId),
            month: obj.month,
            year: obj.year,
            memberCount: obj.memberCount,
            timestamp: obj.timestamp ? new Date(obj.timestamp) : new Date(),
        });
        count++;
    }
    console.log(`[membercount] Migrated ${count} entrie(s).`);
}

(async () => {
    await connectDB();
    await migrateApiKeys();
    await migrateBannedIps();
    await migrateSpreadsheets();
    await migrateMatches();
    await migrateMemberCount();
    console.log('Migration complete.');
    await mongoose.disconnect();
    process.exit(0);
})().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});