const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const logFilePath = path.join(__dirname, 'matches.log');

/**
 * @swagger
 * /tniv/DB/match:
 *   post:
 *     summary: Log a match entry.
 *     security:
 *       - apiKey: []
 *     tags:
 *       - TNIV/DB
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: Unique session identifier
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: Match entry logged
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 body:
 *                   type: string
 *                   example: Logged!
 *       400:
 *         description: Invalid match data
 *       401:
 *         description: No api-key provided
 *       403:
 *         description: Invalid api-key for resource
 *       500:
 *         description: Server error
 */
router.post('/', (req, res) => {
  const matchData = req.body;
  if (!matchData || !matchData.sessionId) {
    return res.status(400).json({ error: 'Invalid match data' });
  }
  fs.appendFile(logFilePath, JSON.stringify(matchData) + '\n', (err) => {
    if (err) {
      console.error('Error writing to log file:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    return res.status(200).json({ body: 'Logged!' });
  });
});

/**
 * @swagger
 * /tniv/DB/match:
 *   get:
 *     summary: Get all matches or filter by sessionId.
 *     security:
 *       - apiKey: []
 *     tags:
 *       - TNIV/DB
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         required: false
 *         schema:
 *           type: string
 *         description: If provided, returns only matches containing this sessionId
 *     responses:
 *       200:
 *         description: Match data successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 body:
 *                   type: array
 *                   description: Array of match records
 *                   items:
 *                     type: object
 *       400:
 *         description: Invalid params
 *       401:
 *         description: No api-key provided
 *       403:
 *         description: Invalid api-key for resource
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 */
router.get('/', (req, res) => {
  const sessionId = req.query.sessionId;

  fs.readFile(logFilePath, 'utf8', (err, data = '') => {
    if (err) {
      if (err.code === 'ENOENT') {
        // file not created yet -> empty list
        return res.status(200).json({ body: [] });
      }
      console.error('Error reading log file:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    const lines = data
      .split('\n')
      .filter((line) => line.trim() !== '');
    if(sessionId){
      const filtered = sessionId
      ? lines.filter((line) => line.includes(sessionId))
      : lines;

    const matches = filtered
      .map((line) => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter((x) => x !== null);
    }else{
      const matches = lines
      .map((line) => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter((x) => x !== null);
    }
    const filterMatches = matches || []
    return res.status(200).json({ body: matches });
  });
});

module.exports = router;
