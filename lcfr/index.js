const express = require('express');
const router = express.Router();


router.get('/test', (req, res) => res.json({ message: 'LCFR test route accessed!' }));

module.exports = router;
