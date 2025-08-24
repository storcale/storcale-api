const express = require('express');
const router = express.Router();
const axios = require('axios');
let lastWebhookContent = null;
const TARGET_WEBHOOK_URL = process.env.WEBHOOK_URL || "null";

router.post('/', async (req, res) => {
    
    const body = req.body;
    if (!body) return res.status(400).json({ error: 'Invalid webhook payload' });
    const content = body.content || '';
    if (body.files || body.attachments || (Array.isArray(body.embeds) && body.embeds.some(e => e.files || e.attachments))) {
        return res.status(403).json({ error: 'Webhook denied: files/attachments not allowed.' });
    }
    let hasVanguard = false;
        function containsPing(obj) {
            const pingRegex = /<@\d+>|<@&\d+>|@everyone|@here/;
            if (typeof obj === 'string') return pingRegex.test(obj);
            if (Array.isArray(obj)) return obj.some(containsPing);
            if (obj && typeof obj === 'object') {
                return Object.values(obj).some(containsPing);
            }
            return false;
        }
        const hasPing = containsPing(body);
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
        console.log("Forwarding webhook to", TARGET_WEBHOOK_URL);
        await axios.post(TARGET_WEBHOOK_URL, body);
        lastWebhookContent = JSON.stringify(body);
        return res.status(200).json({ body: 'Webhook forwarded.' });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to forward webhook.' });
    }
});

module.exports = router;