const path = require('path');
const Webhook = require(path.join(global.__basedir, 'db/schemas/webhook.js'));

let cache = {}; //{ name, url }
let refreshTimer = null;

async function refreshWebhooksCache() {
    const docs = await Webhook.find({}).lean();
    const obj = {};
    docs.forEach((d) => {
        obj[d.code] = { name: d.name, url: d.url };
    });
    cache = obj;
    return cache;
}

function getWebhooksCache() {
    return cache;
}

function getWebhookByCode(code) {
    if (!code) return null;
    return cache[code] || null;
}

async function addWebhook(name, code, url) {
    await Webhook.findOneAndUpdate(
        { code },
        { name, code, url },
        { upsert: true }
    );
    return refreshWebhooksCache();
}

async function removeWebhook(code) {
    await Webhook.deleteOne({ code });
    return refreshWebhooksCache();
}

function startWebhooksAutoRefresh(intervalMs = 60000) {
    if (refreshTimer) return;
    refreshTimer = setInterval(() => {
        refreshWebhooksCache().catch((err) => console.error('Webhooks cache refresh failed:', err.message));
    }, intervalMs);
    if (refreshTimer.unref) refreshTimer.unref();
}

module.exports = {
    refreshWebhooksCache,
    getWebhooksCache,
    getWebhookByCode,
    addWebhook,
    removeWebhook,
    startWebhooksAutoRefresh,
};