const {notify} = require('./notify');

async function sendDeploymentStatus({ loadRoutesTimeMs, environment = process.env.NODE_ENV || 'unknown' ,status} = {}) {
    const webhookUrl = process.env.WEBHOOK;

    const payload = {
        embeds: [
            {
                title: 'Deployment'+ (status ? ` - ${status}` : ''),
                description: `Storcale API deployed ${status === 'success' ? 'successfully' : 'unsuccessfully'} in ${environment}.`,
                color: status === 'success' ? 0x2ecc71 : 0xe74c3c,
                fields: [
                    {
                        name: 'Load routes time',
                        value: `${loadRoutesTimeMs}ms`,
                        inline: true
                    }
                ],
                timestamp: new Date().toISOString()
            }
        ]
    };

    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Deployment webhook failed (${response.status}): ${text}`);
    }

    // notification
    // (title, message, priority, actions, click, email
    await notify('Deployment', `Deployment ${status === 'success' ? 'successful' : 'failed'} on ${environment} in ${loadRoutesTimeMs}ms`, status === 'success' ? 3 : 5).catch(console.error);
    console.log('Deployment status sent successfully.');
    return response;
}

module.exports = { sendDeploymentStatus };
