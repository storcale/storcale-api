const express = require('express');
const path = require('path');
const router = express.Router();
const { notify,notifyDeniedWebhook,notifyRateLimitExceeded } = require(path.join(global.__basedir, "utils/notify.js"))


router.post('/denied', async (req, res) => {
    try {
        const body = req.body;
        const response = notifyDeniedWebhook(true,true,true)
        // const response = await notify(body.title, body.message, body.priority, body.actions, body.click, body.email)
        res.json({ body: response })
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/', async (req, res) => {
    try {
        const body = req.body;
        const response = notify(body.title, body.message, body.priority, body.actions, body.click, body.email)
        // const response = await notify(body.title, body.message, body.priority, body.actions, body.click, body.email)
        res.json({ body: response })
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/rateLimit', async (req, res) => {
    try {
        const body = req.body;
        const response = notifyRateLimitExceeded(body)
        res.json({ body: response })
    } catch (err) {
        res.status(500).json({ error: err.message });
    }   
});
module.exports = router;