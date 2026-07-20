const express = require('express');
const router = express.Router();
const path = require('path');
const { getStats } = require(path.join(global.__basedir, 'utils/apiStats.js'));

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Check if API is running
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: API is running fine
 */
router.get('/', async (req, res) => {
    res.status(200).json({ "sucess": true })
});

/**
 * @swagger
 * /health/stats:
 *   get:
 *     summary: Get  API request stats
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Stats object
 */
router.get('/stats', (req, res) => {
    try {
        const stats = getStats();
        res.status(200).json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const METRICS = {
    total:     (s) => ({ label: 'requests',      message: String(s.total),       color: 'blue' }),
    today:     (s) => ({ label: 'requests today', message: String(s.today),      color: 'informational' }),
    avgPerDay: (s) => ({ label: 'avg req/day',    message: String(s.avgPerDay),  color: 'green' }),
    days:      (s) => ({ label: 'days recorded',  message: String(s.days),       color: 'lightgrey' }),
    max:       (s) => ({ label: 'max req/day',    message: String(s.max),        color: 'orange' }),
};

/**
 * @swagger
 * /health/stats/badge:
 *   get:
 *     summary: Shields.io endpoint badge
 *     tags:
 *       - Health
 *     parameters:
 *       - in: query
 *         name: metric
 *         schema:
 *           type: string
 *           enum: [total, today, avgPerDay, days, max]
 *         description: Which stat to render as the badge message (default total)
 *       - in: query
 *         name: label
 *         schema:
 *           type: string
 *         description: Override the badge label
 *       - in: query
 *         name: color
 *         schema:
 *           type: string
 *         description: Override the badge color
 *     responses:
 *       200:
 *         description: Shields.io endpoint schema JSON
 */
router.get('/stats/badge', (req, res) => {
    try {
        const stats = getStats();
        const metricKey = METRICS[req.query.metric] ? req.query.metric : 'total';
        const base = METRICS[metricKey](stats);

        res.status(200).json({
            schemaVersion: 1,
            label: req.query.label || base.label,
            message: base.message,
            color: req.query.color || base.color,
        });
    } catch (err) {
        res.status(200).json({
            schemaVersion: 1,
            label: 'requests',
            message: 'error',
            color: 'red',
        });
    }
});

module.exports = router;