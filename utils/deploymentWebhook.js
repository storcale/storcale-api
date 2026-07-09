async function sendDeploymentWebhook({ loadRoutesTimeMs, environment = process.env.NODE_ENV || 'unknown' } = {}) {
    const webhookUrl = process.env.WEBHOOK;
    if (!webhookUrl) return null;

    const isProduction = String(environment).toLowerCase() === 'production';
    if (!isProduction) return null;

    const payload = {
        embeds: [
            {
                title: 'Deployment successful',
                description: `Storcale API deployed successfully in ${environment}.`,
                color: 0x2ecc71,
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

    return response.text();
}

module.exports = { sendDeploymentWebhook };
