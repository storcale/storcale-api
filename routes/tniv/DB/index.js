const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.send("/DB")
});

module.exports = router;