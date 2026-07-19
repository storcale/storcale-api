const express = require('express');
const path = require('path');
const router = express.Router();
const axios = require('axios');
const MemberCount = require(path.join(global.__basedir, 'db/schemas/memberCount.js'));

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
            response = await axios.get(`https://groups.roblox.com/v1/groups/${groupId}`, {
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
        try {
            await MemberCount.create({
                groupId: String(groupId),
                month: targetMonth,
                year: targetYear,
                memberCount: result,
                timestamp: new Date(),
            });
        } catch (err) {
            console.error('Failed to write member count to MongoDB:', err.message);
        }
        return result;
    }

    const lastEntry = await MemberCount.findOne({ groupId: String(groupId), month: targetMonth, year: targetYear })
        .sort({ timestamp: -1 })
        .lean();
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
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *       - in: query
 *         name: year
 *         schema:
 *           type: string
 *       - in: query
 *         name: growth
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: fromMonth
 *         schema:
 *           type: string
 *       - in: query
 *         name: fromYear
 *         schema:
 *           type: string
 *       - in: query
 *         name: toMonth
 *         schema:
 *           type: string
 *       - in: query
 *         name: toYear
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved member count or growth data
 *       500:
 *         description: Server error
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