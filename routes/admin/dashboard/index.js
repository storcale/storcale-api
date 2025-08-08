const express = require('express');
const path = require('path');
const router = express.Router();
const fs = require('fs');
const logFilePath = path.join(global.__basedir, '/access.log');


router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../admin/index.html'));
});



module.exports = router;