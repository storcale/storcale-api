const { eventTypes } = require("./eventTypes.js");
const { google } = require("googleapis");
const path = require("path");

const SHEET_NAME = "Official Bot Logging";
const RANGE = "A3:K";

function extractSpreadsheetId(url) {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
        throw new Error(`VG_MAINFRAME does not look like a Google Sheets URL: ${url}`);
    }
    return match[1];
}

async function fetchEventsFromSheet() {
    if (!process.env.VG_MAINFRAME) {
        throw new Error("VG_MAINFRAME is not defined in process.env");
    }

    const spreadsheetId = extractSpreadsheetId(process.env.VG_MAINFRAME);
    const keyFile = path.join(global.__basedir, "/envs/gsaKey.env.json");

    const auth = new google.auth.GoogleAuth({
        keyFile,
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    let client;
    let sheets;
    try {
        client = await auth.getClient();
        sheets = google.sheets({ version: "v4", auth: client });
    } catch (err) {
        throw new Error(`Failed to authenticate with Google service account: ${err.message}`);
    }

    let response;
    try {
        response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `'${SHEET_NAME}'!${RANGE}`,
        });
    } catch (err) {
        const apiMessage = err?.errors?.[0]?.message || err.message;
        const cause = err?.cause ? ` — cause: ${err.cause.code || ""} ${err.cause.message || err.cause}` : "";
        const code = err?.code ? ` (code=${err.code})` : "";
        const status = err?.response?.status ? ` (status=${err.response.status})` : "";
        console.error("Raw Sheets API error object:", err);
        throw new Error(
            `Failed to fetch data from Google Sheets (spreadsheetId=${spreadsheetId}, sheet="${SHEET_NAME}"): ${apiMessage}${code}${status}${cause}`
        );
    }

    const values = response.data.values || [];

    const rows = values
        .filter(fields => fields && fields.length > 0)
        .map(fields => ({
            timestamp: fields[0] || "",
            date: fields[1] || "",
            username: fields[2] || "",
            form_type: fields[3] || "",
            focus: fields[4] || "",
            event_type: fields[5] || "",
            proof: fields[6] || "",
            attendance: fields[7] || "",
            did_win: (fields[5] && fields[5].toLowerCase().includes("raid/defense")) ? (fields[8] || "") : "",
            against: (fields[5] && fields[5].toLowerCase().includes("raid/defense")) ? (fields[9] || "") : "",
            map: (fields[5] && fields[5].toLowerCase().includes("raid/defense")) ? (fields[10] || "") : "",
        }))
        .filter(row => row.username);

    return rows;
}

class DB {
    events
    constructor() {}
    async init() {
        try {
            this.events = await fetchEventsFromSheet();
        } catch (error) {
            console.error("Error initializing DB:", error);
            this.events = [];
        }
    }
    getEvents() {
        return this.events;
    }
    getEvent(eventType) {
        return this.events.filter((event) => event.event_type === eventType);
    }
}

class DiplomacyDB extends DB {
    constructor() {
        super();
    }
    async init() {
        await super.init();
    }
    getEvents() {
        return this.events
            .filter((event) => eventTypes.diplomacy.has(event.event_type))
            .filter((event) => event.focus.includes("diplomacy") || event.focus.includes("raid_defense"));
    }
}

class RaidsDB extends DB {
    constructor() {
        super();
    }
    async init() {
        await super.init();
    }
    getEvents() {
        return this.events.filter(
            (event) =>
                event.event_type === "Raid/Defense" &&
                event.focus &&
                event.focus.includes("raid_defense")
        );
    }
}

class CommunityDB extends DB {
    constructor() {
        super();
    }
    async init() {
        await super.init();
    }
    getEvents() {
        return this.events
            .filter((event) => eventTypes.community.has(event.event_type))
            .filter((event) => event.focus.includes("community"));
    }
}

class GuardiansDB extends DB {
    constructor() {
        super();
    }
    async init() {
        await super.init();
    }
    getEvents() {
        return this.events
            .filter((event) => eventTypes.guardians.has(event.event_type))
            .filter((event) => event.focus.includes("guardians"));
    }
}

class OfficerCoreDB extends DB {
    constructor() {
        super();
    }
    async init() {
        await super.init();
    }
    getEvents() {
        return this.events
            .filter((event) => eventTypes.officerCore.has(event.event_type))
            .filter((event) => event.focus.includes("officer_core"));
    }
}

module.exports = {
    DB,
    DiplomacyDB,
    CommunityDB,
    GuardiansDB,
    OfficerCoreDB,
    RaidsDB
};