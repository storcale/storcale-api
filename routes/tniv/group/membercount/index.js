const express = require('express');
const path = require('path');
const router = express.Router();
const storePath = path.join(__dirname, 'store.log'); // Store to follow data across time
const axios = require('axios');
const fs = require('fs');

function parsePositiveInt(value, fallback) {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
}

function parseBoolean(value) {
    if (value === undefined || value === null) return false;
    const normalized = String(value).trim().toLowerCase();
    return ['1', 'true', 'yes', 'on'].includes(normalized);
}

async function getGroupMemberCount(groupId, month, year) {
    const url = `https://groups.roblox.com/v1/groups/`;
    const date = new Date();
    const currentMonth = date.getMonth() + 1;
    const currentYear = date.getFullYear();
    const targetMonth = parsePositiveInt(month, currentMonth);
    const targetYear = parsePositiveInt(year, currentYear);

    if (!groupId) {
        throw new Error('Group ID is required.');
    }
    if (targetMonth < 1 || targetMonth > 12) {
        throw new Error('Invalid month. Must be between 1 and 12.');
    }
    if (targetYear < 1970 || targetYear > 9999) {
        throw new Error('Invalid year.');
    }
    if (targetYear > currentYear || (targetYear === currentYear && targetMonth > currentMonth)) {
        throw new Error('Cannot request member count for a future month.');
    }

    if (targetMonth === currentMonth && targetYear === currentYear) {
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

        const result = response.data.memberCount;
        const logEntry = {
            groupId,
            month: targetMonth,
            year: targetYear,
            memberCount: result,
            timestamp: new Date().toISOString(),
        };
        try {
            fs.appendFileSync(storePath, JSON.stringify(logEntry) + '\n');
        } catch (err) {
            console.error('Failed to write to store:', err);
        }
        return result;
    }

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
    }
    throw new Error('No data found for the specified month and group.');
}

async function getGroupMemberGrowth(groupId, fromMonth, fromYear, toMonth, toYear) {
    const date = new Date();
    const currentMonth = date.getMonth() + 1;
    const currentYear = date.getFullYear();

    const startMonth = parsePositiveInt(fromMonth, null);
    if (startMonth === null) {
        throw new Error('fromMonth is required for growth queries.');
    }

    const startYear = parsePositiveInt(fromYear, currentYear);
    const endMonth = parsePositiveInt(toMonth, currentMonth);
    const endYear = parsePositiveInt(toYear, currentYear);

    const fromMemberCount = await getGroupMemberCount(groupId, startMonth, startYear);
    const toMemberCount = await getGroupMemberCount(groupId, endMonth, endYear);
    const growth = toMemberCount - fromMemberCount;
    const growthPercent = fromMemberCount === 0 ? null : Number(((growth / Math.abs(fromMemberCount)) * 100).toFixed(2));

    return {
        fromMonth: startMonth,
        fromYear: startYear,
        fromMemberCount,
        toMonth: endMonth,
        toYear: endYear,
        toMemberCount,
        growth,
        growthPercent,
    };
}

/**
 * @swagger
 * /tniv/group/memberCount:
 *   get:
 *     summary: Get a group's member count for a specific month and year or the current one, optionally with growth between two months.
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
 *       - in: query
 *         name: growth
 *         required: false
 *         schema:
 *           type: boolean
 *         description: When true, returns growth information instead of only a single count
 *       - in: query
 *         name: fromMonth
 *         required: false
 *         schema:
 *           type: string
 *         description: The start month for growth calculation (1-12)
 *       - in: query
 *         name: fromYear
 *         required: false
 *         schema:
 *           type: string
 *         description: The start year for growth calculation, defaults to current year
 *       - in: query
 *         name: toMonth
 *         required: false
 *         schema:
 *           type: string
 *         description: The end month for growth calculation, defaults to current month
 *       - in: query
 *         name: toYear
 *         required: false
 *         schema:
 *           type: string
 *         description: The end year for growth calculation, defaults to current year
 *     responses:
 *       200:
 *         description: Successfully retrieved member count or growth data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 memberCount:
 *                   type: number
 *                   description: The member count of the group for the requested month
 *                 fromMonth:
 *                   type: number
 *                 fromYear:
 *                   type: number
 *                 fromMemberCount:
 *                   type: number
 *                 toMonth:
 *                   type: number
 *                 toYear:
 *                   type: number
 *                 toMemberCount:
 *                   type: number
 *                 growth:
 *                   type: number
 *                   description: The difference between toMemberCount and fromMemberCount
 *                 growthPercent:
 *                   type: number
 *                   description: The percent change from the starting month to the target month
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
        const { groupId, month, year, growth, fromMonth, fromYear, toMonth, toYear } = req.query || {};
        const wantsGrowth = parseBoolean(growth) || Boolean(fromMonth);

        if (wantsGrowth) {
            const growthResult = await getGroupMemberGrowth(groupId, fromMonth, fromYear, toMonth, toYear);
            return res.json(growthResult);
        }

        const memberCount = await getGroupMemberCount(groupId, month, year);
        res.json({ memberCount });
    } catch (err) {
        res.status(500).json({ error: 'Error fetching member count: ' + err.message });
    }
});

module.exports = router;
