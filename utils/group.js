const axios = require("axios");
const path = require("path");
const Case = require(path.join(global.__basedir, 'db/schemas/eic/case.js'));
 const RegistryCase = require(path.join(global.__basedir, 'utils/registry.js'));
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
                `https://apis.roblox.com/universes/v1/places/${placeid}/universe   `,
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
}

class JoinRequest extends Group {
    userId = '';
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

    async decline(reasonText,username) {
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
    async processPending() {
        const pending = await this.getJoinRequests();
        for (const request of pending) {
            const userId = request.user.split("/").slice(1).join("/");;
            this.userId = userId;
            try {
                const result = await processUser(userId);
                console.log(userId + result)
                if (result.result === true) {
                    await this.accept(result.username);
                } else {
                    await this.decline(result.reasonText,result.username);

                }
            } catch (err) {
                console.error(`[processPending] Error processing user ${userId}:`, err?.response?.data || err.message);
                sendErrorWebhook(err?.response?.data || err?.message, "Process Pending", "Pending Join Requests")
                throw err
            }
        }
    }
}

async function processUser(id) {
    try {
        let user = new User(id);
        let userInfo = await user.getInfo();
        let username = userInfo.name;
        let accountAge = new Date(userInfo.created).getTime();
        let currentTime = new Date().getTime();
        let ageInDays = (currentTime - accountAge) / (1000 * 60 * 60 * 24);

        // Age check
        if (ageInDays < 100) {
            return { result: false, reason: `Account is too new (${ageInDays} days)`, username };
        }

        // EIC
        const caseData = await Case.findOne({ robloxId: id, status: 'active' });
        if (caseData) {
            return { result: false, reason: `User has an active case (${caseData.reason})`, username };
        }

        // registries
        const registry = new RegistryCase(null, id, true);
        const cases = await registry.getCases();
        if (cases && cases.length > 0) {
            return { result: false, reason: `User ${cases[0].usernames} has active cases in registries: ${cases.map(c => c.source).join(", ")}. \n Category: ${cases[0].category} | Type: ${cases[0].type} | Strike: ${cases[0].strike} \n Notes: ${cases[0].notes} EndDate: ${cases[0].end_date}`, username };
        }

        // TODO CL BLs

        // TODO rotector etc

        return { result: true, reason: "Passed all checks.", username };
    } catch (err) {
        console.error('[processPending] Failed:', err?.response?.data || err.message);
        throw err;
        return { result: false, reason: 'Error processing pending request ' + err.message, username: null };
    }
}
module.exports = {
    Group,
    JoinRequest
};