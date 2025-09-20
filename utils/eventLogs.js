const { eventTypes } = require("./eventTypes.js");

async function fetchEventsFromSheet() {
    if (!process.env.VG_MAINFRAME) {
        throw new Error("DB_URL is not defined in process.env");
    }
    const bot_Logs = process.env.VG_MAINFRAME + "/gviz/tq?tqx=out:csv&sheet=Official%20Bot%20Logging&range=A3:K";
    const res = await fetch(bot_Logs);
    if (!res.ok) {
        throw new Error("Failed to fetch data from Google Sheets");
    }
    const data = await res.text();
    const rows = data
        .split("\n")
        .filter(row => row.trim().length > 0)
        .map(row => {
            const fields = row.split('","').map(field => field.replace(/^"|"$/g, ""));
            return {
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
            };
        })
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