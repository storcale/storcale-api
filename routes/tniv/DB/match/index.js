const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const logFilePath = path.join(__dirname, 'matches.log');
var axios = require('axios');


/**
 * @swagger
 * /tniv/DB/match:
 *   post:
 *     summary: Post a new match.
 *     security:
 *      - apiKey: []
 *     tags:
 *       - TNIV/DB
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               body:
 *                 type: json
 *                 description: Match data
 *     responses:
 *       200:
 *         description: Match data logged and stored successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 body:
 *                   type: string
 *                   description: Logged!
 *       400:
 *         description: Invalid params
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message string
 *       401:
 *         description: No api-key provided
 *       403:
 *         description: Invalid api-key for ressource
 */
router.post('/', (req, res) => {
    const matchData = req.body;
    if (!matchData || !matchData.sessionId) {
        return res.status(400).send({error:'Invalid match data'});
    }

    fs.appendFile(logFilePath, JSON.stringify(matchData) + '\n', (err) => {
        if (err) {
            console.error('Error writing to log file:', err);
            return res.status(500).send({error:'Internal server error'});
        }
    });
    res.status(200).send({body:"Logged!"});
});

/**
 * @swagger
 * /tniv/DB/match:
 *   get:
 *     summary: Get all/specific match.
 *     security:
 *      - apiKey: []
 *     tags:
 *       - TNIV/DB
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               body:
 *                 type: string
 *                 description: Session ID to fetch
 *                 required: false
 *     responses:
 *       200:
 *         description: Match data sucessfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 body:
 *                   type: object
 *                   description: Match data in json
 *       400:
 *         description: Invalid params
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message string
 *       401:
 *         description: No api-key provided
 *       403:
 *         description: Invalid api-key for ressource
 */
router.get('/', (req, res) => {
    const sessionId = req.query.sessionId;
    if (!sessionId) {
        fs.readFile(logFilePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading log file:', err);
                return res.status(500).send({error:'Internal server error'});
            }
            const matches = data.split('\n')
                .filter(line => line.trim() !== '')
                .map(line => JSON.parse(line));
            return res.status(200).send({body:json(matches)})
        });
    }else{
    fs.readFile(logFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading log file:', err);
            return res.status(500).send({error:'Internal server error'});
        }
        const matches = data.split('\n')
            .filter(line => line.includes(sessionId))
            .map(line => line ? JSON.parse(line) : null)
            .filter(match => match !== null);
        res.status(200).send({body:json(matches)})

    })};
})
module.exports = router;