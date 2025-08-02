const express = require('express');
const router = express.Router();

/**
 * @swagger
 * /api/lcfr/test:
 *   get:
 *     summary: Test LCFR route
 *     tags:
 *       - LCFR
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/test', (req, res) => {
    res.json({ message: 'LCFR test route accessed!' });
});

module.exports = router;
