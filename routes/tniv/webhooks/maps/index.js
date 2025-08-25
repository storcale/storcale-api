const express = require('express');
const router = express.Router();
const axios = require('axios');
let lastWebhookContent = null;
const TARGET_WEBHOOK_URL = process.env.WEBHOOK_URL || "null";

router.post('/', async (req, res) => {
    const whitelisted = false
    const body = req.body;
    if (!body) return res.status(400).json({ error: 'Invalid webhook payload' });
    if (body.files || body.attachments || (Array.isArray(body.embeds) && body.embeds.some(e => e.files || e.attachments))) {
        return res.status(403).json({ error: 'Webhook denied: files/attachments not allowed.' });
    }
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
    let hasVanguard = false;

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
    const hasPing = containsPing(body);
    const content = body.content || '';
    if (content.includes('The Vanguard Development Team')) {
        hasVanguard = true;
    } else if (Array.isArray(body.embeds)) {
        hasVanguard = body.embeds.some(e => e.footer && typeof e.footer.text === 'string' && e.footer.text.includes('The Vanguard Development Team'));
    }
    const isDuplicate = lastWebhookContent === JSON.stringify(body);
    if (hasPing || !hasVanguard || isDuplicate) {
        return res.status(403).json({ error: 'Webhook denied.' });
    }
    try {
        let payload = cleanPayload(body);
        if(!whitelisted){payload.flags = 4096;}
        if (!payload.content && !payload.embeds) {
            return res.status(400).json({ error: 'Payload must have content or embeds.' });
        }
        await axios.post(TARGET_WEBHOOK_URL, payload);
        lastWebhookContent = JSON.stringify(body);
        return res.status(200).json({ body: 'Webhook forwarded.' });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to forward webhook.', details: err?.response?.data || err?.message || err });
    }
});

module.exports = router;