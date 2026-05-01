const express = require('express');
const path = require('path');
const router = express.Router();
const storePath = path.join(__dirname, 'store.json'); // Store to follow data across time
const axios = require('axios');
const fs = require('fs');
async function getGroupMemberCount(groupId, month, year) {
    const url = `https://groups.roblox.com/v1/groups/`;
    const date = new Date();
    const currentMonth = date.getMonth() + 1;
    const targetMonth = parseInt(month, 10);
    const targetYear = parseInt(year, 10);

    if (!groupId) {
            throw new Error('Group ID is required.');
    }
    if (targetMonth < 1 || targetMonth > 12) {
        throw new Error('Invalid month. Must be between 1 and 12.');
    }
    if (targetMonth !== currentMonth && targetMonth < currentMonth - 1 && targetYear <= date.getFullYear()) {
        const logData = fs.readFileSync(storePath, 'utf-8');
        const entries = logData.split('\n').filter(line => line.trim() !== '');
        let lastEntry = null;
        for (const entry of entries) {
            try {
                const data = JSON.parse(entry);
                if (data.groupId === groupId && data.month === targetMonth && data.year === targetYear) {
                    lastEntry = data;
                }
            } catch (err) {
                console.error('Error parsing log entry:', err);
            }

        }
        if (lastEntry) {
            return lastEntry.memberCount;
        } else {
            throw new Error('No data found for the specified month and group.');
        }
    } else {
        
        let response;
        try {
            response = await axios.get(url + groupId, {
                headers: {
                    'Content-Type': 'application/json',
                    'apiKey': process.env.ROBLOX_API_KEY || '',
                },
            });
        } catch (err) {
            throw new Error('Failed to fetch group data from Roblox API request: ' + err.message);
        }
        if (response.status !== 200) {
            throw new Error('Request failed with roblox opencloud API. Error code: ' + response.status);
        }

        let result = response.data.memberCount;
        // Store the result 
        let logEntry = {
            groupId,
            month: targetMonth,
            year: targetYear,
            memberCount: result,
            timestamp: new Date().toISOString()
        };
        try {
            fs.appendFileSync(storePath, JSON.stringify(logEntry) + '\n');
        } catch (err) {
            console.error('Failed to write to store:', err);
        }
        return result
    }

}

/**
 * @swagger
 * /tniv/group/memberCount:
 *   get:
 *     summary: Get a group's member count for a specific month and year or the current one.
 *     security:
 *      - apiKey: []
 *     tags:
 *       - TNIV/Group
 *     parameters:
 *       - in: query
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: The Roblox group ID
 *       - in: query
 *         name: month
 *         required: false
 *         schema:
 *           type: string
 *         description: The month (1-12), defaults to current month
 *       - in: query
 *         name: year
 *         required: false
 *         schema:
 *           type: string
 *         description: The year, defaults to current year
 *     responses:
 *       200:
 *         description: Successfully retrieved member count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 memberCount:
 *                   type: number
 *                   description: The member count of the group
 *       400:
 *         description: Invalid params
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message string
 *       401:
 *         description: No api-key provided
 *       403:
 *         description: Invalid api-key for resource
 */
router.get('/', async (req, res) => {
    try {
        const { groupId, month, year } = req.query || {};
        const memberCount = await getGroupMemberCount(groupId, month, year);
        res.json({ memberCount });
    } catch (err) {
        res.status(500).json({ error: 'Error fetching member count: ' + err.message });
    }
});

module.exports = router;
