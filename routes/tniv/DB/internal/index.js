const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.status(200).send("Welcome to the DB Internal API");
});

module.exports = router;