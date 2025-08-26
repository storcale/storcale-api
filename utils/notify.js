const action_ex = {
    "action": "http",
    "label": "Close door",
    "url": "https://api.mygarage.lan/",
    "method": "PUT",
    "headers": {
        "Authorization": "Bearer zAzsx1sk.."
    },
    "body": "{\"action\": \"close\"}"
}
// require(path.join(global.__basedir, "utils/notify.js"))
async function notify(title, message, priority, actions, click, email) {
    try {
        const headers = {};
        if (title) headers['Title'] = title;
        if (priority) headers['Priority'] = String(priority);
        if (actions && actions.length > 0) headers['Actions'] = JSON.stringify(actions);
        if (click) headers['Click'] = click;
        if (email) headers['Email'] = email;
        const response = await fetch(`https://ntfy.sh/${process.env.NOTIFY_URL}`, {
            method: 'POST',
            headers,
            body: message || ''
        });
        return await response.text();
    } catch (error) {
        return { error: error.message }
    }
}

let lastSender = null;
async function notifyDeniedWebhook(hasPing, hasVanguard, isDuplicate, info) {
    try {
        const senderKey = info?.apiKey || 'unknown';
        if (lastSender === senderKey) {
            return false;
        }
        lastSender = senderKey;
        const url = "https://storcale-api.omegadev.xyz";
        let reasons = [];
        if (hasPing) reasons.push("ping included");
        if (!hasVanguard) reasons.push("did not provide passkey");
        if (isDuplicate) reasons.push("is a duplicate");
        if (reasons.length === 0) reasons.push("unknown reason");
        const message = `Webhook denied for: ${reasons.join(", ")}. Info on sender: ${info.apiKey || "unknown"} ${info.code || "unknown"} ${info.body || "unknown"}`;
        const title = "TNIV API | Webhook flagged as dangerous";
        const priority = 4;
        const apiKey = process.env.ADMIN_KEY || "";
        const actions = [
            {
                "action": "http",
                "label": "Revoke key",
                "url": `${url}/api/admin/internal/deactivate`,
                "method": "PUT",
                "headers": {
                    "api-key": apiKey
                },
                "body": `{"key": "${apiKey}"}`
            }
        ];
        const click = `${url}/api/admin/dashboard?api-key=${apiKey}`;
        const email = process.env.EMAIL || "";
        const response = await notify(title, message, priority, actions, click, email);
        return response;
    } catch(e) {
        console.error("notifyDeniedWebhook error:", e);
        return e;
    }
}

module.exports = { notify, notifyDeniedWebhook };