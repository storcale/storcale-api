const path = require("path");
const Webhook = require(path.join(global.__basedir, 'db/schemas/webhook.js'));
const express = require('express');
const router = express.Router();
/**
 * @swagger
 * /admin/webhooks:
 *   post:
 *     summary: Create a new webhook.
 *     security:
 *      - apiKey: []
 *     tags:
 *       - Admin/Webhooks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - code
 *               - url
 *             properties:
 *               name:
 *                 type: string
 *                 description: Short description of the webhook target.
 *               code:
 *                 type: string
 *                 description: Unique identifier for the webhook.
 *               url:
 *                 type: string
 *                 description: URL to which the webhook should send requests.
 *     responses:
 *       200:
 *         description: Successfully created webhook
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post('/', async (req, res) => {
    try {
        const { name, code, url } = req.body || {};

        if (!name || !code || !url) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const existingWebhook = await Webhook.findOne({ code });
        if (existingWebhook) {
            return res.status(400).json({ error: 'Webhook with this code already exists' });
        }

        const newWebhook = new Webhook({ name, code, url });
        await newWebhook.save();

        res.status(201).json({ message: 'Webhook created successfully', webhook: newWebhook });
    } catch (err) {
        res.status(500).json({ error: 'Error creating webhook: ' + err.message });
    }
});

/**
 * @swagger
 * /admin/webhooks:
 *   delete:
 *     summary: Delete a webhook by its code.
 *     security:
 *      - apiKey: []
 *     tags:
 *       - Admin/Webhooks
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully deleted webhook
 *       404:
 *         description: Webhook not found
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.delete('/', async (req, res) => {
    try {
        const { code } = req.query || {};

        if (!code) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const deletedWebhook = await Webhook.findOneAndDelete({ code });

        if (!deletedWebhook) {
            return res.status(404).json({ error: 'Webhook not found' });
        }
        res.json({ message: 'Webhook deleted successfully', webhook: deletedWebhook });
    } catch (err) {
        res.status(500).json({ error: 'Error deleting webhook: ' + err.message });
    }
});

module.exports = router;