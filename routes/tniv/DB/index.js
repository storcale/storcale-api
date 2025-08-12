const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
router.post('/', (req, res) => {
    res.send("/DB")
});
module.exports = router;