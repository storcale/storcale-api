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

class JoinRequest {
    userId = '';
    groupId = process.env.TNIV_GROUP_ID || '';
    constructor(userId = '', groupId = process.env.TNIV_GROUP_ID) {
        this.userId = userId;
        this.groupId = groupId;
    }

    async getJoinRequests() {
    try {
        const params = this.userId
            ? { filter: `user=="users/${this.userId}"` }
            : {};
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
        const response = await axios.post(
            `https://apis.roblox.com/cloud/v2/groups/${this.groupId}/join-requests/${this.userId}:accept`,
            {},
            { headers: { "x-api-key": process.env.ROBLOX_API_KEY } }
        );

        sendAcceptedWebhook(this.userId, this.groupId)
            .catch(e => console.error('[sendAcceptedWebhook] Failed:', e?.response?.data || e?.message));

        return response.data;
    }

    async decline() {
        const response = await axios.post(
            `https://apis.roblox.com/cloud/v2/groups/${this.groupId}/join-requests/${this.userId}:decline`,
            {},
            { headers: { "x-api-key": process.env.ROBLOX_API_KEY } }
        );
        return response.data;
    }

    // EIC check, ban check, account age check
    async process() {
        return true;
    }
}

module.exports = {
    JoinRequest
};