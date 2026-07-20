const express = require('express');
const router = express.Router();
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Check if API is running
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: API is running fine
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
    res.status(200).json({"sucess": true})
});

module.exports = router;