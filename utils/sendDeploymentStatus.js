const {notify} = require('./notify');

async function sendDeploymentStatus({ loadRoutesTimeMs, environment = process.env.NODE_ENV || 'unknown', status, error } = {}) {
    const webhookUrl = process.env.WEBHOOK;

    const notifyMessage = status === 'success'
        ? `Deployment successful on ${environment} in ${loadRoutesTimeMs}ms`
        : `Deployment failed on ${environment}${error ? `: ${error}` : ''}`;

    const ntfyResult = await notify(
        'Deployment',
        notifyMessage,
        status === 'success' ? 3 : 5
    ).catch((e) => {
        console.error('ntfy notification failed:', e.message || e);
        return { error: e.message || String(e) };
    });

    if (!webhookUrl) {
        console.warn('WEBHOOK not set, skipping Discord deployment notification.');
        return { ntfy: ntfyResult };
    }

    const fields = [];
    if (loadRoutesTimeMs !== undefined && loadRoutesTimeMs !== null) {
        fields.push({
            name: 'Load routes time',
            value: `${loadRoutesTimeMs}ms`,
            inline: true
        });
    }
    if (error) {
        fields.push({
            name: 'Error',
            value: String(error).slice(0, 1000),
            inline: false
        });
    }

    const payload = {
        embeds: [
            {
                title: 'Deployment' + (status ? ` - ${status}` : ''),
                description: `Storcale API deployed ${status === 'success' ? 'successfully' : 'unsuccessfully'} in ${environment}.`,
                color: status === 'success' ? 0x2ecc71 : 0xe74c3c,
                fields,
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

    console.log('Deployment status sent successfully.');
    return response;
}

module.exports = { sendDeploymentStatus };