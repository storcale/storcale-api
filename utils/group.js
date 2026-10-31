const axios = require("axios");
const path = require("path");
const Case = require(path.join(global.__basedir, 'db/schemas/eic/case.js'));
const RegistryCase = require(path.join(global.__basedir, 'utils/registry.js'));
const { getBlacklist } = require(path.join(global.__basedir, 'utils/clanLabs.js'));
const { getGroupBlacklistsForUser } = require(path.join(global.__basedir, 'utils/clanLabs.js'))
// send webhook via api
async function sendAcceptedWebhook(userId, groupId, username) {
    let target = process.env.pendingWebhookCode;
    if (process.env.NODE_ENV !== 'production') {
        target = process.env.OFFICE_CODE;
    }

    const embed = {
        title: "Join Request Accepted",
        description: `[${username}](https://www.roblox.com/users/profile?userId=${userId}) has been accepted into group [${groupId}](https://www.roblox.com/groups/${groupId}).`,
        color: 0x00ff00,
        fields: [
            { name: 'User ID', value: String(userId), inline: true },
            { name: 'Group ID', value: String(groupId), inline: true },
        ],
        footer: {
            text: `The Vanguard Development Team ` + process.env.NODE_ENV,
        },
        timestamp: new Date().toISOString(),
    };

    const payload = {
        username: 'Storcale-API',
        embeds: [embed],
    };

    const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://storcale-api.omegadev.xyz'
        : 'http://localhost:9902';
    const url = `${baseUrl}/api/tniv/webhooks?target=${encodeURIComponent(target)}`;

    const response = await axios.post(url, payload, {
        headers: {
            'Content-Type': 'application/json',
            'api-key': process.env.ADMIN_KEY || '',
        },
    });

    return response.data;
}
async function sendDeclinedWebhook(userId, groupId, reasonText, username) {
    let target = process.env.pendingWebhookCode;
    if (process.env.NODE_ENV != 'production') {
        target = process.env.OFFICE_CODE;
    }

    const embed = {
        title: "Join Request Declined",
        description: `[${username || userId}](https://www.roblox.com/users/profile?userId=${userId}) has been declined from group [${groupId}](https://www.roblox.com/groups/${groupId}).`,
        color: 0xff0000,
        fields: [
            { name: 'User ID', value: String(userId), inline: true },
            { name: 'Group ID', value: String(groupId), inline: true },
            { name: 'Reason', value: String(reasonText || "No reason specified (human requested)."), inline: false },
        ],
        footer: {
            text: `The Vanguard Development Team ` + process.env.NODE_ENV,
        },
        timestamp: new Date().toISOString(),
    };

    const payload = {
        username: 'Storcale-API',
        embeds: [embed],
    };

    const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://storcale-api.omegadev.xyz'
        : 'http://localhost:9902';
    const url = `${baseUrl}/api/tniv/webhooks?target=${encodeURIComponent(target)}`;

    const response = await axios.post(url, payload, {
        headers: {
            'Content-Type': 'application/json',
            'api-key': process.env.ADMIN_KEY || '',
        },
    });

    return response.data;
}
async function sendFailedJoinRequestWebhook(userId, groupId, reasonText, username) {
    let target = process.env.pendingWebhookCode;
    if (process.env.NODE_ENV != 'production') {
        target = process.env.OFFICE_CODE;
    }

    const embed = {
        title: "Join Request Declined",
        description: `[${username || userId}](https://www.roblox.com/users/profile?userId=${userId}) has been declined from group [${groupId}](https://www.roblox.com/groups/${groupId}).`,
        color: 0xff0000,
        fields: [
            { name: 'User ID', value: String(userId), inline: true },
            { name: 'Group ID', value: String(groupId), inline: true },
            { name: 'Reason', value: String(reasonText), inline: false },
        ],
        footer: {
            text: `The Vanguard Development Team ` + process.env.NODE_ENV,
        },
        timestamp: new Date().toISOString(),
    };

    const payload = {
        username: 'Storcale-API',
        embeds: [embed],
    };

    const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://storcale-api.omegadev.xyz'
        : 'http://localhost:9902';
    const url = `${baseUrl}/api/tniv/webhooks?target=${encodeURIComponent(target)}`;

    const response = await axios.post(url, payload, {
        headers: {
            'Content-Type': 'application/json',
            'api-key': process.env.ADMIN_KEY || '',
        },
    });

    return response.data;
}

async function sendBanUpdateWebhook(userId, groupId, universeId, active, reason) {
    let target = process.env.NODE_ENV == 'production' ? process.env.ANTI_LOGS_CODE : process.env.OFFICE_CODE
    const embed = {
        title: "Ban updated",
        description: `[${userId}](https://www.roblox.com/users/profile?userId=${userId}) has had his ban updated in game [${universeId}](https://www.roblox.com/games/${universeId}) to ${active}.`,
        color: active ? 0xff0000 : 0x00ff00,
        fields: [
            { name: 'User ID', value: String(userId), inline: true },
            { name: 'Universe ID', value: String(universeId), inline: true },
            { name: 'Group ID', value: String(groupId), inline: true },
            { name: 'Reason', value: String(reason), inline: true },
        ],
        footer: {
            text: `Exploit Investigation Committee Automation ` + process.env.NODE_ENV,
        },
        timestamp: new Date().toISOString(),
    };

    const payload = {
        username: 'Storcale-API',
        embeds: [embed],
    };

    const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://storcale-api.omegadev.xyz'
        : 'http://localhost:9902';
    const url = `${baseUrl}/api/tniv/webhooks?target=${encodeURIComponent(target)}`;

    const response = await axios.post(url, payload, {
        headers: {
            'Content-Type': 'application/json',
            'api-key': process.env.ADMIN_KEY || '',
        },
    });

    return response.data;
}


function sendErrorWebhook(errorMessage = "", place = "", area = "") {
    let target = process.env.NODE_ENV == 'production' ? (area == "EIC" ? process.env.ANTI_LOGS_CODE : process.env.pendingWebhookCode) : process.env.OFFICE_CODE
    const embed = {
        title: `${area} Error`,
        description: `An error occurred in ${area} - ${place} : ${errorMessage.message}`,
        color: 0xff0000,
        footer: {
            text: `The Vanguard Development Team ` + process.env.NODE_ENV,
        },
        timestamp: new Date().toISOString(),
    };

    const payload = {
        username: 'Storcale-API',
        embeds: [embed],
    };

    const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://storcale-api.omegadev.xyz'
        : 'http://localhost:9902';
    const url = `${baseUrl}/api/tniv/webhooks?target=${encodeURIComponent(target)}`;

    axios.post(url, payload, {
        headers: {
            'Content-Type': 'application/json',
            'api-key': process.env.ADMIN_KEY || '',
        },
    }).catch(err => {
        console.error('[sendErrorWebhook] Failed:', {
            code: err.code,
            message: err.message,
            response: err?.response?.data,
        });
    });
}

/**
 * Class to create a Group object.
 * @class
 * @lends groupdId
 * 
 */
class Group {
    /**
    * @param groupId {number} the group id for the game.
    */
    constructor(groupId = process.env.TNIV_GROUP_ID) {
        this.groupId = groupId;
    }
}
/**
 * Class to create a Universe/Game object.
 * @class
 * @lends universeId
 * 
 */
class Game extends Group {
    /**
    * @constructs Group
    * @param universeId {number} the universe id of the game.
    */
    constructor(universeId = '', groupId = process.env.TREASURY_ID) {
        super(groupId);
        this.universeId = universeId;
    }
    async get() {
        try {
            const response = await axios.get(
                `https://apis.roblox.com/cloud/v2/universes/${this.universeId}/places/${this.placeId}`,
                { headers: { "x-api-key": process.env.TREASURY_API_KEY } }
            );
            return response.data;
        } catch (err) {
            console.error('[getGame] Failed:', err?.response?.data || err.message);
            throw err;
        }
    }
    async getUniverse(placeid) {
        // 
        try {
            const response = await axios.get(
                `https://apis.roblox.com/universes/v1/places/${placeid}/universe`,
                { headers: { "x-api-key": process.env.TREASURY_API_KEY } }
            );
            return response.data;
        } catch (err) {
            console.error('[getUniverse] Failed:', err?.response?.data || err.message);
            throw err;
        }
    }
}
/**
 * Class to create a User object.
 * @class
 * @lends userId
 * 
 */
class User {
    constructor(userId) {
        this.userId = userId;
    }
    async getInfo() {
        const url = "https://apis.roblox.com/cloud/v2/users/" + this.userId;
        try {
            const response = await axios.get(url, { headers: { "x-api-key": process.env.ROBLOX_API_KEY } });
            return response.data;
        } catch (err) {
            console.error('[getUserInfo] Failed:', err?.response?.data || err.message);
            throw err;
        }
    }
    async getGroups() {
        const url = `https://groups.roblox.com/v1/users/${this.userId}/groups/roles?includeLocked=false&includeNotificationPreferences=false`
        try {
            const response = await axios.get(url);
            const groups = response.data.data.map(o => {
                return o.group.id;
            });
            return groups
        } catch (err) {
            console.error('[getGroups] Failed:', err?.response?.data || err.message);
            throw err;
        }
    }
}

class JoinRequest extends Group {
    /**
     * Creates an instance of JoinRequest.
     * @param {string} [userId='']
     * @param {integer} [groupId=process.env.TNIV_GROUP_ID]
     * @memberof JoinRequest
     */
    constructor(userId = '', groupId = process.env.TNIV_GROUP_ID) {
        super(groupId);
        this.userId = userId;
    }

    async getJoinRequests() {
        try {
            const params = this.userId
                ? { filter: `user=="users/${this.userId}"` }
                : { maxPageSize: 20 };
            const requests = await axios.get(
                `https://apis.roblox.com/cloud/v2/groups/${this.groupId}/join-requests`,
                { headers: { "x-api-key": process.env.ROBLOX_API_KEY }, params }
            );
            return requests.data.groupJoinRequests;
        } catch (err) {
            console.error('[getJoinRequests] Failed:', err?.response?.data || err.message);
            throw err;
        }
    }

    async accept(username) {
        try {
            const response = await axios.post(
                `https://apis.roblox.com/cloud/v2/groups/${this.groupId}/join-requests/${this.userId}:accept`,
                {},
                { headers: { "x-api-key": process.env.ROBLOX_API_KEY } }
            );
            sendAcceptedWebhook(this.userId, this.groupId, username)
                .catch(e =>
                    console.error('[sendAcceptedWebhook] Failed:', e?.response?.data || e?.message)

                );

            return response.data;
        } catch (e) {
            console.error('[acceptJoinRequest] Failed:', e?.response?.data || e?.message);
            sendErrorWebhook(e?.response?.data || e?.message, "Join Request Accept", "Pending Join Requests")
            throw e;
        }
    }

    async decline(reasonText, username) {
        try {
            const response = await axios.post(
                `https://apis.roblox.com/cloud/v2/groups/${this.groupId}/join-requests/${this.userId}:decline`,
                {},
                { headers: { "x-api-key": process.env.ROBLOX_API_KEY } }
            );
            sendDeclinedWebhook(this.userId, this.groupId, reasonText, username)
                .catch(e =>
                    console.error('[sendDeclinedWebhook] Failed:', e?.response?.data || e?.message)
                );
            return response.data;
        } catch (e) {
            console.error('[declineJoinRequest] Failed:', e?.response?.data || e?.message);
            sendErrorWebhook(e?.response?.data || e?.message, "Join Request Decline", "Pending Join Requests")
            throw e;
        }
    }
    async processPending(n) {
        const pending = await this.getJoinRequests();
        let text = "";
        const data = [];
        if (!pending || pending.length === 0) {
            return { text: "No pending join requests found.", data };
        }
        const limit = Number.isInteger(n) && n > 0 ? n : pending.length;
        for (const request of pending.slice(0, limit)) {
            const userId = request.user.split("/").slice(1).join("/");
            this.userId = userId;
            try {
                const result = await processUser(userId);
                data.push(result);
                if (result.result === true) {
                    await this.accept(result.username);
                    text += result.username + ": Accepted\n";
                } else {
                    await this.decline(result.reason, result.username);
                    text += result.username + ": Declined\n";
                }
            } catch (err) {
                console.error(`[processPending] Error processing user ${userId}:`, err?.response?.data || err.message);
                sendErrorWebhook(err, "Process Pending", "Pending Join Requests");
                text += `${userId}: Error (${err.message})\n`;
            }
        }
        return { text, data };
    }

}

async function processUser(id) {
    try {
        const data = [];
        let failed = 0;
        const user = new User(id);
        const userInfo = await user.getInfo();
        const username = userInfo.name;
        const accountAge = new Date(userInfo.createTime).getTime();

        const ageInDays = (Date.now() - accountAge) / (1000 * 60 * 60 * 24);
        // Age 
        const tooNew = ageInDays < 100;
        if (tooNew) failed += 1;
        data.push({ "AccountAge": { result: tooNew, reason: tooNew ? `Account is too new (${ageInDays} days)` : '', age: ageInDays, username } });

        // EIC
        const caseData = await Case.findOne({ robloxId: id, active: true });
        if (caseData) failed += 1;
        data.push({ "EIC": { result: !!caseData, reason: caseData ? `User has an active case in ${caseData.weaponMechanic}` : '', username } });

        // Registries
        const registry = new RegistryCase(null, `${id}`, true);
        const found = await registry.getCases();
        const cases = Array.isArray(found) ? found : (found ? [found] : []);
        const hit = cases.length > 0;
        if (hit) failed += 1;
        data.push({
            "Registries": {
                result: hit,
                reason: hit ? `User ${cases[0].usernames} has active cases in registries: ${cases.map(c => c.source).join(", ")}. \n Category: ${cases[0].category} | Type: ${cases[0].type} | Strike: ${cases[0].strike} \n Notes: ${cases[0].notes} EndDate: ${cases[0].end_date}` : '',
                username
            }
        });

        // ClanLabs user blacklist
        const blacklist = await getBlacklist("User", id);
        if (blacklist) failed += 1;
        data.push({ "User Blacklist": { result: !!blacklist, reason: blacklist ? `User is blacklisted on ClanLabs: ${blacklist.name} (${blacklist.description})` : '', username } });

        const groupBlacklists = await getGroupBlacklistsForUser(id);
        const inBlacklistedGroup = Array.isArray(groupBlacklists) && groupBlacklists.length > 0;
        if (inBlacklistedGroup) failed += 1;
        data.push({
            "Group Blacklist": {
                result: inBlacklistedGroup,
                reason: inBlacklistedGroup ? `User is blacklisted in ClanLabs for being in ${groupBlacklists.length} group(s): ${groupBlacklists.map(g => g.name + ': ' + g.description).join('\n')}` : '',
                username,
                groupBlacklists
            }
        });

        // TODO rotector spidereye tnic api etc
        return { result: failed === 0, reason: failed === 0 ? "Passed all checks." : `Failed ${failed} checks.`, checks: data, username };
    } catch (err) {
        console.error('[processPending] Failed:', err?.response?.data || err.message);
        throw err;
    }
}

module.exports = {
    Group,
    JoinRequest,
    processUser,
    User
};