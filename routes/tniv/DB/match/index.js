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

    // Log the match data to a file
    fs.appendFile(logFilePath, JSON.stringify(matchData) + '\n', (err) => {
        if (err) {
            console.error('Error writing to log file:', err);
            return res.status(500).send('Internal server error');
        }
    });
    res.status(200).send("Logged!");
});
module.exports = router;