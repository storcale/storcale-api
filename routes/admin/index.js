const express = require('express');
const path = require('path');
const router = express.Router();
const fs = require('fs');

router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../admin/connect.html'));
});
router.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../admin/index.html'));
});

module.exports = router;