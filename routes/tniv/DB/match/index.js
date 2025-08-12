const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const logFilePath = path.join(__dirname, 'matches.log');
var axios = require('axios');

router.post('/', (req, res) => {
    const matchData = req.body;
    if (!matchData || !matchData.sessionId) {
        return res.status(400).send('Invalid match data');
    }

    fs.appendFile(logFilePath, JSON.stringify(matchData) + '\n', (err) => {
        if (err) {
            console.error('Error writing to log file:', err);
            return res.status(500).send('Internal server error');
        }
    });
    res.status(200).send("Logged!");
});

router.get('/', (req, res) => {
    const sessionId = req.query.sessionId;
    if (!sessionId) {
        fs.readFile(logFilePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading log file:', err);
                return res.status(500).send('Internal server error');
            }
            const matches = data.split('\n')
                .filter(line => line.trim() !== '')
                .map(line => JSON.parse(line));
            return res.status(200).json(matches);
        });
    }
    fs.readFile(logFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading log file:', err);
            return res.status(500).send('Internal server error');
        }
        const matches = data.split('\n')
            .filter(line => line.includes(sessionId))
            .map(line => line ? JSON.parse(line) : null)
            .filter(match => match !== null);
        res.status(200).json(matches);
    });
})
module.exports = router;