const express = require('express');
const path = require('path');
const router = express.Router();
const { notify,notifyDeniedWebhook,notifyRateLimitExceeded } = require(path.join(global.__basedir, "utils/notify.js"))


router.post('/denied', async (req, res) => {
    try {
        const body = req.body;
        const response = await notifyDeniedWebhook(true,true,true)
        // const response = await notify(body.title, body.message, body.priority, body.actions, body.click, body.email)
        res.json({ body: response })
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/', async (req, res) => {
    try {
        const body = req.body;
        // sanitize incoming fields
        const title = body && body.title ? String(body.title) : '';
        const message = body && body.message ? String(body.message) : '';
        const priority = body && body.priority !== undefined && body.priority !== null ? String(body.priority) : '';
        const actions = Array.isArray(body.actions) ? body.actions : null;
        const click = body && body.click ? String(body.click) : '';
        const email = body && body.email ? String(body.email) : '';

        notify(title, message, priority, actions, click, email)
        res.json({ body: 'notification queued' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/rateLimit', async (req, res) => {
    try {
        const body = req.body;
        const response = await notifyRateLimitExceeded(body)
        res.json({ body: response })
    } catch (err) {
        res.status(500).json({ error: err.message });
    }   
});
module.exports = router;