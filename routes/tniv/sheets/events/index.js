/**
 * @swagger
 * /tniv/sheets/events:
 *   get:
 *     summary: Get filtered event logs from the specified DB type.
 *     tags:
 *       - TNIV/Sheets/Events
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [diplomacy, community, guardians, officerCore, raids]
 *         description: The DB type to query (leave empty for main DB)
 *       - in: query
 *         name: eventType
 *         schema:
 *           type: string
 *         description: Filter by event type
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *         description: Filter events from this date (inclusive)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *         description: Filter events up to this date (inclusive)
 *       - in: query
 *         name: against
 *         schema:
 *           type: string
 *         description: If present, return top N opponent groups for raid/defense events. If given a number (e.g. against=5) returns top 5. If present without a number, returns top 1.
 *     responses:
 *       200:
 *         description: List of filtered events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 main:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EventLog'
 *                 diplomacy:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EventLog'
 *                 community:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EventLog'
 *                 guardians:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EventLog'
 *                 officerCore:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EventLog'
 *                 raids:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EventLog'
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
 *
 * /tniv/sheets/events/stats:
 *   get:
 *     summary: Get statistics for filtered event logs from the specified DB type.
 *     tags:
 *       - TNIV/Sheets/Events
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [diplomacy, community, guardians, officerCore, raids]
 *         description: The DB type to query (leave empty for main DB)
 *       - in: query
 *         name: eventType
 *         schema:
 *           type: string
 *         description: Filter by event type
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *         description: Filter events from this date (inclusive)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *         description: Filter events up to this date (inclusive)
 *       - in: query
 *         name: against
 *         schema:
 *           type: string
 *         description: If present, return top N opponent groups for raid/defense events. If given a number (e.g. against=5) returns top 5. If present without a number, returns top 1.
 *     responses:
 *       200:
 *         description: Statistics for filtered events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
 *                   properties:
 *                     EventCount:
 *                       type: integer
 *                     TopHosts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           username:
 *                             type: string
 *                           count:
 *                             type: integer
 *                     TopAttendees:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           attendee:
 *                             type: string
 *                           count:
 *                             type: integer
 *                     TopMap:
 *                       type: string
 *                     WinCount:
 *                       type: integer
 *                     LoseCount:
 *                       type: integer
 *                     MostAgainst:
 *                       type: string
 *                     TopAgainst:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           against:
 *                             type: string
 *                           count:
 *                             type: integer
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
 *
 * components:
 *   schemas:
 *     EventLog:
 *       type: object
 *       properties:
 *         timestamp:
 *           type: string
 *         date:
 *           type: string
 *         username:
 *           type: string
 *         form_type:
 *           type: string
 *         focus:
 *           type: string
 *         event_type:
 *           type: string
 *         proof:
 *           type: string
 *         attendance:
 *           type: string
 *         did_win:
 *           type: string
 *         against:
 *           type: string
 *         map:
 *           type: string
 */
const express = require('express');
const path = require('path');
const { DB, DiplomacyDB, CommunityDB, GuardiansDB, OfficerCoreDB, RaidsDB } = require(path.join(global.__basedir, '/utils/eventLogs.js'));
const router = express.Router();

// Stats endpoint
router.get('/stats', async (req, res) => {
    try {
        const { type, eventType, from, since, to,until, username } = req.query;

        let dbInstance;
        switch (type) {
            case 'diplomacy': dbInstance = new DiplomacyDB(); break;
            case 'community': dbInstance = new CommunityDB(); break;
            case 'guardians': dbInstance = new GuardiansDB(); break;
            case 'officerCore': dbInstance = new OfficerCoreDB(); break;
            case 'raids': dbInstance = new RaidsDB(); break;
            case '': dbInstance = new DB(); break;
            default: dbInstance = new DB();
        }
        await dbInstance.init();

        function parseDate(str) {
            const parts = str.split(/[\/ :]/);
            if (parts.length >= 3) {
                const [month, day, year] = parts;
                if (parts.length >= 6) {
                        const { type, eventType, from, to, username } = req.query;
                    return new Date(year, month - 1, day, hour || 0, min || 0, sec || 0);
                }
                return new Date(year, month - 1, day);
            }
            return new Date(str);
        }
        function filterByDate(events) {
            return events.filter(ev => {
                const d = parseDate(ev.date || ev.timestamp);
                let ok = true;
                if (from) ok = ok && d >= parseDate(from);
                if (since) ok = ok && d >= parseDate(since);
                if (to) ok = ok && d <= parseDate(to);
                if (until) ok = ok && d <= parseDate(until);
                return ok;
            });
        }

        let events = dbInstance.getEvents();
        if (eventType) {
            events = dbInstance.getEvent(eventType);
        }
        if (from || to) {
            events = filterByDate(events);
        }

        if (username) {
            const hostedEvents = events.filter(ev => ev.username && ev.username.toLowerCase() === username.toLowerCase());
            const attendedEvents = events.filter(ev => {
                if (!ev.attendance) return false;
                return ev.attendance.split(/[,;]/).map(a => a.trim().toLowerCase()).includes(username.toLowerCase());
            });
            const eventTypeCounts = {};
            hostedEvents.forEach(ev => {
                if (ev.event_type) {
                    eventTypeCounts[ev.event_type] = (eventTypeCounts[ev.event_type] || 0) + 1;
                }
            });
            let MostHostedEventType = null;
            if (Object.keys(eventTypeCounts).length > 0) {
                MostHostedEventType = Object.entries(eventTypeCounts).sort((a, b) => b[1] - a[1])[0][0];
            }
            return res.json({
                stats: {
                    hostedCount: hostedEvents.length,
                    attendedCount: attendedEvents.length,
                    MostHostedEventType
                }
            });
        }

        // Otherwise, return general stats
        const EventCount = events.length;
        const hostCounts = {};
        events.forEach(ev => {
            if (ev.username) {
                hostCounts[ev.username] = (hostCounts[ev.username] || 0) + 1;
            }
        });
        const TopHosts = Object.entries(hostCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([username, count]) => ({ username, count }));
        const attendeeCounts = {};
        events.forEach(ev => {
            if (ev.attendance) {
                ev.attendance.split(/[,;]/).map(a => a.trim()).filter(Boolean).forEach(att => {
                    attendeeCounts[att] = (attendeeCounts[att] || 0) + 1;
                });
            }
        });
        const TopAttendees = Object.entries(attendeeCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([attendee, count]) => ({ attendee, count }));

        let TopMap = null, WinCount = null, LoseCount = null;
        if (eventType && (eventType.toLowerCase().includes('raid/defense') || type === 'raids')) {
            const mapCounts = {};
            let winCount = 0;
            let loseCount = 0;
            events.forEach(ev => {
                if (ev.map) {
                    mapCounts[ev.map] = (mapCounts[ev.map] || 0) + 1;
                }
                if (ev.did_win && ev.did_win == 'TRUE') {
                    winCount++;
                }
                if (ev.did_win && ev.did_win == 'FALSE') {
                    loseCount++;
                }
            });
            TopMap = Object.entries(mapCounts)
                .sort((a, b) => b[1] - a[1])[0]?.[0] || null;
            WinCount = winCount;
            LoseCount = loseCount;
            // Against
            if (req.query.against !== undefined) {
                const topN = (function () {
                    const v = req.query.against;
                    const n = Number(v);
                    if (v === '' || v === 'true' || isNaN(n)) return 1;
                    return n > 0 ? Math.floor(n) : 1;
                })();
                const againstCounts = {};
                events.forEach(ev => {
                    if (!ev.against) return;
                    ev.against.split(/[,;]/).map(a => a.trim()).filter(Boolean).forEach(a => {
                        againstCounts[a] = (againstCounts[a] || 0) + 1;
                    });
                });
                const topAgainst = Object.entries(againstCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, topN)
                    .map(([against, count]) => ({ against, count }));
                if (topN === 1) {
                    TopMap = TopMap; 
                    return res.json({
                        stats: {
                            EventCount,
                            TopHosts,
                            TopAttendees,
                            ...(TopMap ? { TopMap } : {}),
                            ...(WinCount !== null ? { WinCount } : {}),
                            ...(LoseCount !== null ? { LoseCount } : {}),
                            topAgainst: topAgainst[0]?.against || null
                        }
                    });
                } else {
                    return res.json({
                        stats: {
                            EventCount,
                            TopHosts,
                            TopAttendees,
                            ...(TopMap ? { TopMap } : {}),
                            ...(WinCount !== null ? { WinCount } : {}),
                            ...(LoseCount !== null ? { LoseCount } : {}),
                            TopAgainst: topAgainst
                        }
                    });
                }
            }
        }

        return res.json({
            stats: {
                EventCount,
                TopHosts,
                TopAttendees,
                ...(TopMap ? { TopMap } : {}),
                ...(WinCount !== null ? { WinCount } : {}),
                ...(LoseCount !== null ? { LoseCount } : {})
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// TODO make doc
router.get('/', async (req, res) => {
    try {
        const { type, eventType } = req.query;

        let dbInstance;
        switch (type) {
            case 'diplomacy':
                dbInstance = new DiplomacyDB();
                break;
            case 'community':
                dbInstance = new CommunityDB();
                break;
            case 'guardians':
                dbInstance = new GuardiansDB();
                break;
            case 'officerCore':
                dbInstance = new OfficerCoreDB();
                break;
            case 'raids':
                dbInstance = new RaidsDB();
                break;
            case '':
                dbInstance = new DB();
                break;
            default:
                dbInstance = new DB();
        }

        await dbInstance.init();

        // date filtets
        function parseDate(str) { // ! Sadly is month/day/year cuz vg systems does that
            //  2/11/2025 or 02/11/2025 02:46:04
            const parts = str.split(/[\/ :]/);
            if (parts.length >= 3) {
                // month/day/year
                const [month, day, year] = parts;
                if (parts.length >= 6) {
                    // time
                    const [month, day, year, hour, min, sec] = parts;
                    return new Date(year, month - 1, day, hour || 0, min || 0, sec || 0);
                }
                return new Date(year, month - 1, day);
            }
            return new Date(str);
        }

        const { from, since, to, until } = req.query;
        function filterByDate(events) {
            return events.filter(ev => {
                const d = parseDate(ev.date || ev.timestamp);
                let ok = true;
                if (from) ok = ok && d >= parseDate(from);
                if (since) ok = ok && d >= parseDate(since);
                if (to) ok = ok && d <= parseDate(to);
                if (until) ok = ok && d <= parseDate(until);
                return ok;
            });
        }

        if (!type || type === '' || type === null || type === undefined) {
            let events = dbInstance.getEvents();
            if (eventType) {
                events = dbInstance.getEvent(eventType);
            }
            if (from || since || to || until) {
                events = filterByDate(events);
            }
            return res.json({ main: events });
        } else {
            let events = dbInstance.getEvents();
            if (from || since || to || until) {
                events = filterByDate(events);
            }
            return res.json({ [type]: events });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
module.exports = router;
