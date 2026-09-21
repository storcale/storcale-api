const axios = require("axios");

// send webhook via api
async function sendAcceptedWebhook(userId, groupId) {
    let target = process.env.pendingWebhookCode;
    if (process.env.NODE_ENV === 'production') {
        target = process.env.OFFICE_CODE;
    }

    const embed = {
        title: "Join Request Accepted",
        description: `[${userId}](https://www.roblox.com/users/profile?userId=${userId}) has been accepted into group [${groupId}](https://www.roblox.com/groups/${groupId}).`,
        color: 0x00ff00,
        fields: [
            { name: 'User ID', value: String(userId), inline: true },
            { name: 'Group ID', value: String(groupId), inline: true },
        ],
        footer: {
            text: `The Vanguard Development Team`,
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
async function sendDeclinedWebhook(userId, groupId) {
    let target = process.env.pendingWebhookCode;
    if (process.env.NODE_ENV === 'production') {
        target = process.env.OFFICE_CODE;
    }

    const embed = {
        title: "Join Request Declined",
        description: `[${userId}](https://www.roblox.com/users/profile?userId=${userId}) has been declined from group [${groupId}](https://www.roblox.com/groups/${groupId}).`,
        color: 0xff0000,
        fields: [
            { name: 'User ID', value: String(userId), inline: true },
            { name: 'Group ID', value: String(groupId), inline: true },
        ],
        footer: {
            text: `The Vanguard Development Team`,
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
            text: `Exploit Investigation Committee Automation`,
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

async function checkBan(userId, universeId, groupId) {
    // check if ban is logged in mongoDb
    try {
        const Case = require('../db/schemas/eic/case.js');
        const caseData = await Case.findOne({ robloxId: userId, activeBannedGames: [groupId, universeId] });
        if (caseData) {
            return true;
        } else {
            return false;
        }
    }catch(e){
        console.error('checkBan failed:', e);
        return false;
    }
}
// ! LOG BAN NOT WORKING
async function logBan(userId, universeId, groupId) {
    // log ban in mongoDb
    try {
        const Case = require('../db/schemas/eic/case.js');
        const caseData = await Case.findOne({ robloxId: userId });
        if (caseData) {
            if (!caseData.activeBannedGames.includes([groupId, universeId])) {
                caseData.activeBannedGames.push([groupId, universeId]);
                await caseData.save();
                return true;
            }
        }else{
            return false
        }
    }catch(e){
        console.error('logBan failed:', e);
        sendErrorWebhook(e?.response?.data || e?.message, "Ban log failed", "EIC");
        return false
    }
}
async function logunban(userId, universeId, groupId) {
    // log unban in mongoDb
    try {
        const Case = require('../db/schemas/eic/case.js');
        const caseData = await Case.findOne({ robloxId: userId });
        if (caseData) {
            const index = caseData.activeBannedGames.findIndex(game => game[0] === groupId && game[1] === universeId);
            if (index !== -1) {
                caseData.activeBannedGames.splice(index, 1);
                await caseData.save();
                return true;
            }
        }else{
            return false
        }
    }catch(e){
        console.error('logunban failed:', e);
        sendErrorWebhook(e?.response?.data || e?.message, "Unban log failed", "EIC");
        return false
    }
}

function sendErrorWebhook(errorMessage="",place="",area="") {
    let target = process.env.NODE_ENV == 'production' ? ( area == "EIC"? process.env.ANTI_LOGS_CODE : process.env.pendingWebhookCode ) : process.env.OFFICE_CODE
    const embed = {
        title: `${area} Error`,
        description: `An error occurred in ${area} ${place} : ${errorMessage.message}`,
        color: 0xff0000,
        footer: {
            text: `Exploit Investigation Committee Automation`,
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
class Group {
    constructor(groupId = process.env.TNIV_GROUP_ID) {
        this.groupId = groupId;
    }
}

class Game extends Group{
    constructor(universeId = '', groupId = process.env.TREASURY_ID) {
        super(groupId);
        this.universeId = universeId;
    }
    async get(){
        try {
            const response = await axios.get(
                `https://apis.roblox.com/cloud/v2/universes/${this.universeId}/places/${this.placeId}`,
                { headers: { "x-api-key": process.env.ROBLOX_API_KEY } }
            );
            return response.data;
        } catch (err) {
            console.error('[getGame] Failed:', err?.response?.data || err.message);
            throw err;
        }
    }
    async getUniverse(placeid){
        // 
        try {
            const response = await axios.get(
                `https://apis.roblox.com/universes/v1/places/${placeid}/universe   `,
                { headers: { "x-api-key": process.env.ROBLOX_API_KEY } }
            );
            return response.data;
        } catch (err) {
            console.error('[getUniverse] Failed:', err?.response?.data || err.message);
            throw err;
        }
    }
}
class Ban extends Game {
    userId = '';
    constructor(userId = '', universeId = '', groupId = process.env.TREASURY_ID) {
        super(universeId, groupId);
        this.userId = userId;
    }
    async getBans(userId) {
        try {
            const params = { maxPageSize: 100 };
            const userPath = userId ? `/${userId}` : '';
            const response = await axios.get(
                `https://apis.roblox.com/cloud/v2/universes/${this.universeId}/user-restrictions`+ userPath,
                { headers: { "x-api-key": process.env.ROBLOX_API_KEY },params }
            );
            return response.data;
        } catch (err) {
            console.error('[getBans] Failed:', err?.response?.data || err.message);
            throw err;
        }
    }
    async update(active, reason, privatereason) {
    try {
        if (active === true) {
            const alreadyBanned = await checkBan(this.userId, this.universeId, this.groupId);
            if (alreadyBanned) {
                return { alreadyBanned: true, message: "User already banned" };
            }
        }

        const data = {};
        data.active = !!active;
        data.displayReason = reason || '';
        data.privateReason = privatereason || '';
        if (active ){data.duration = "2114359200s"}
        const response = await axios.patch(
            `https://apis.roblox.com/cloud/v2/universes/${this.universeId}/user-restrictions/${this.userId}`,
            { gameJoinRestriction: data },
            { headers: { "x-api-key": process.env.ROBLOX_API_KEY } }
        );

        active
            ? await logBan(this.userId, this.universeId, this.groupId) // ! LOG BAN NOT WORKING
            : await logunban(this.userId, this.universeId, this.groupId);

        sendBanUpdateWebhook(this.userId, this.groupId, this.universeId, active, data.displayReason)
            .catch(e => console.error('[sendBanUpdateWebhook] Failed:', e?.response?.data || e?.message));

        return response.data;
    } catch (err) {
        console.error('[Update Ban] Failed:', err?.response?.data || err.message);
        await sendErrorWebhook(err?.response?.data || err.message, "Ban update to " + active, "EIC");
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
            : {maxPageSize: 20};
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

    async accept() {
        try{
        const response = await axios.post(
            `https://apis.roblox.com/cloud/v2/groups/${this.groupId}/join-requests/${this.userId}:accept`,
            {},
            { headers: { "x-api-key": process.env.ROBLOX_API_KEY } }
        );

        sendAcceptedWebhook(this.userId, this.groupId)
            .catch(e => 
                console.error('[sendAcceptedWebhook] Failed:', e?.response?.data || e?.message)
                
            );

        return response.data;
        }catch(e){
            console.error('[acceptJoinRequest] Failed:', e?.response?.data || e?.message);
            sendErrorWebhook(e?.response?.data || e?.message, "Join Request Accept", "Pending Join Requests")
            throw e;
        }
    }

    async decline() {
        try{
        const response = await axios.post(
            `https://apis.roblox.com/cloud/v2/groups/${this.groupId}/join-requests/${this.userId}:decline`,
            {},
            { headers: { "x-api-key": process.env.ROBLOX_API_KEY } }
        );
        sendDeclinedWebhook(this.userId, this.groupId)
            .catch(e => 
                console.error('[sendDeclinedWebhook] Failed:', e?.response?.data || e?.message)
            );
        return response.data;
        }catch(e){
            console.error('[declineJoinRequest] Failed:', e?.response?.data || e?.message);
            sendErrorWebhook(e?.response?.data || e?.message, "Join Request Decline", "Pending Join Requests")
            throw e;
        }
    }
}

// EIC check,rotector ,  ban check, account age check, etc
async function processPending() {
        return true;
}
module.exports = {
    Group,
    Ban,
    JoinRequest
};