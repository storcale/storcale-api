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

function notify(title, message, priority, actions) {
    try {
        fetch("https://ntfy.sh", {
            method: 'POST',
            body: JSON.stringify({
                "topic": process.env.NOTIFY_URL,
                "message": message,
                actions: actions
            })
        })
    } catch (error) {
        return error
    }
}