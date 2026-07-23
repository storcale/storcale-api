const express = require('express');
const router = express.Router();
const path = require('path');
const { getStats } = require(path.join(global.__basedir, 'utils/apiStats.js'));

const METRICS = {
    total: (s) => ({ label: 'requests', message: String(s.total), color: 'blue' }),
    today: (s) => ({ label: 'requests today', message: String(s.today), color: 'informational' }),
    avgPerDay: (s) => ({ label: 'avg req/day', message: String(s.avgPerDay), color: 'green' }),
    days: (s) => ({ label: 'days recorded', message: String(s.days), color: 'lightgrey' }),
    max: (s) => ({ label: 'max req/day', message: String(s.max), color: 'orange' }),
};

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
 *     parameters:
 *       - in: query
 *         name: metric
 *         schema:
 *           type: string
 *           enum: [all, total, today, avgPerDay, days, max]
 *         description: Which stat to get (default all)
 *         required: false
 *     responses:
 *       200:
 *         description: Stats object or metric string 
 */
router.get('/stats', (req, res) => {
    try {
        const stats = getStats();
        if (req.query.metric === "all") {
            res.status(200).json(stats)
        }
        const metricKey = METRICS[req.query.metric] ? req.query.metric : 'total';
        const base = METRICS[metricKey](stats);

        res.status(200).json({
            metric: base.message
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



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
 *         required: false
 *       - in: query
 *         name: color
 *         schema:
 *           type: string
 *         description: Override the badge color
  *         required: false
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