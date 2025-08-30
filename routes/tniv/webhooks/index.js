const express = require('express');
const router = express.Router();
const axios = require('axios');
const path = require('path');
const querystring = require('node:querystring');
const { error } = require('node:console');
let lastWebhookContent = null;
const { notifyDeniedWebhook } = require(path.join(global.__basedir, "utils/notify.js"))

function cleanPayload(payload) {
    const cleaned = {};
    if (typeof payload.content === 'string' && payload.content.length > 0) {
        cleaned.content = payload.content;
    }
    if (Array.isArray(payload.embeds)) {
        const validEmbeds = payload.embeds.filter(e => e && typeof e === 'object');
        if (validEmbeds.length > 0) {
            cleaned.embeds = validEmbeds;
        }
    }
    if (payload.flags !== undefined) {
        cleaned.flags = payload.flags;
    }
    return cleaned;
}

function containsPing(obj) {
    const pingRegex = /<@([&]?)(\d+)>|@everyone|@here/;
    if (typeof obj === 'string') {
        let match;
        let str = obj;
        while ((match = pingRegex.exec(str)) !== null) {
            if (match[0] === '@everyone' || match[0] === '@here') return true;
            const id = match[2];
            if (!process.env.WHITELISTED_IDS.includes(id)) return true;
            str = str.slice(match.index + match[0].length);
            whitelised = true
        }
        return false;
    }
    if (Array.isArray(obj)) return obj.some(containsPing);
    if (obj && typeof obj === 'object') {
        return Object.values(obj).some(containsPing);
    }
    return false;
}


router.post('/', async (req, res) => {

    const info = {
        apiKey: req.get('api-key') || req.query?.['api-key'] || 'none',
        code: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        body: req.body ? JSON.stringify(req.body) : '',
        query: querystring.stringify(req.query) || ''
    }
    let hasKeyword = false;
    let whitelisted = false;
    const query = req.query;
    const body = req.body;

    if (!body || !query || !query.target) return res.status(400).json({ error: 'Invalid webhook payload/target Webhook' });
    if (body.files || body.attachments || (Array.isArray(body.embeds) && body.embeds.some(e => e.files || e.attachments))) {
        lastWebhookContent = JSON.stringify(body);
        return res.status(403).json({ error: 'Webhook denied: files/attachments not allowed.' });
    }

    const hasPing = containsPing(body);
    const content = body.content || '';
    let keywords = process.env.KEYWORDS;
    if (typeof keywords === 'string') {
        try {
            keywords = JSON.parse(keywords.replace(/'/g, '"'));
        } catch {
            keywords = [];
        }
    }
    if (Array.isArray(keywords) && keywords.some(k => k && content.includes(k))) {
        hasKeyword = true;
    } else if (Array.isArray(body.embeds)) {
        hasKeyword = body.embeds.some(e => e.footer && typeof e.footer.text === 'string' && Array.isArray(keywords) && keywords.some(k => k && e.footer.text.includes(k)));
    }

    const isDuplicate = lastWebhookContent === JSON.stringify(body);
    if (hasPing || !hasKeyword || isDuplicate) {
        if (isDuplicate) {
            notifyDeniedWebhook(hasPing, hasKeyword, isDuplicate, info)
        }
        lastWebhookContent = JSON.stringify(body);
        console.log(keywords)
        console.log(query)
        return res.status(403).json({ error: `Webhook denied. ${hasPing} ${hasKeyword}  ${isDuplicate}` });
    }

    try {
        const target = process.env[query.target]
        if(!target){
            throw new Error("This webhook doesnt exist.")
        }
        let payload = cleanPayload(body);
        if (!whitelisted) { payload.flags = 4096; }
        if (!payload.content && !payload.embeds) {
            return res.status(400).json({ error: 'Payload must have content or embeds.' });
        }
        await axios.post(target, payload);
        lastWebhookContent = JSON.stringify(body);
        return res.status(200).json({ body: 'Webhook forwarded.' });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to forward webhook.', details: err?.response?.data || err?.message || err, TARGET_WEBHOOK_URL: process.env[query.target] });
    }
}
);

module.exports = router;