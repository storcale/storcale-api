const axios = require('axios');

// send webhooks for eic operations to ANTI_LOGS_CODE
async function sendWebhook(embed) {
    try {
        let target = process.env.ANTI_LOGS_CODE
        const payload = {
            username: 'EIC Notifier',
            embeds: [embed],
        };
        const baseUrl = process.env.NODE_ENV === 'production' ? 'https://storcale-api.omegadev.xyz' : 'http://localhost:9902';
        if (process.env.NODE_ENV!= 'production' || !target) {
            target = process.env.OFFICE_CODE
        }
        const apiKey = process.env.ADMIN_KEY;
        const url = `${baseUrl}/api/tniv/webhooks?target=${encodeURIComponent(target)}`;

        const response = await axios.post(url, payload, {
            headers: {
                'Content-Type': 'application/json',
                'api-key': apiKey || '',
            },
        });

        return response.data;

    } catch (error) {
        console.error('Error sending EIC webhook:', error);
    }
}

class CaseNotifier {
    constructor({ id, robloxUsername, weaponMechanic}) {
        this.id = id;
        this.robloxUsername = robloxUsername;
        this.weaponMechanic = weaponMechanic ;
    }
    async sendNewWebhook(active){
        const title = active ? 'New EIC Case added' : 'EIC case closed';
        const color = active ? 0x00ff00 : 0xff0000;
        const embed = {
            title: title,
            color: color,
            fields: [
                { name: 'Case ID', value: this.id.toString(), inline: true },
                { name: 'Roblox Username', value: this.robloxUsername, inline: true },
                { name: 'Weapon Mechanic', value: this.weaponMechanic, inline: true },
            ],
            timestamp: new Date(),
            footer: {
                text: 'Exploit Investigation Committee Automation '+ process.env.NODE_ENV,
            },
        };
        await sendWebhook(embed);
    }
}
module.exports = {CaseNotifier};
