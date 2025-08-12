const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const logFilePath = path.join(__dirname, 'matches.log');
var axios = require('axios');

router.post('/', (req, res) => {
    sendEmbed(req, res)
});

async function sendEmbed(req,res){
    try {
        const body = req.body;
        const winners = body.defenderPoints >= body.config.maxPoints
            ? body.config.defendersName
            : body.config.attackersName;

        const fields = [
            {
                name: `\n${winners} HAVE WON!`,
                value: `> ${body.config.defendersName.toUpperCase()} POINTS: **${body.defenderPoints}/${body.config.maxPoints}**\n> ${body.config.attackersName.toUpperCase()} POINTS: **${body.attackerPoints.toFixed(0)}/${body.config.maxPoints}**`,
                inline: false,
            },
            {
                name: "‎ ",
                value: "─\n‎ ",
                inline: false,
            },
            {
                name: body.config.defendersName.toUpperCase(),
                value: defendersList(body.playTimeList),
                inline: true,
            },
            {
                name: body.config.attackersName.toUpperCase(),
                value: attackersList(body.playTimeList),
                inline: true,
            },
            {
                name: "DEPLOYMENT",
                value: deploymentList(body.logs),
                inline: true,
            },
            {
                name: "‎ ",
                value: "─\n‎ ",
                inline: false,
            },
            {
                name: `${body.config.defendersName.toUpperCase()} GROUP MEMBERS`,
                value: groupMembersList(body.logs),
                inline: false,
            },
        ];

        // Construct the embed
        const embed = {
            title: body.placeName,
            color: 0xffffff,
            description: `**DEFENSE ENDED AT ${body.placeName}!**`,
            url: `https://www.roblox.com/games/${body.placeId}`,
            thumbnail: {
                url: "https://tr.rbxcdn.com/180DAY-29e12e0951a8c9a52101f158c2d07de2/150/150/Image/Webp/noFilter",
            },
            footer: {
                text: "The Vanguard Development Team",
                icon_url:
                    "https://tr.rbxcdn.com/180DAY-5840772c78f8d5cffff45153b693d2bb/420/420/Decal/Webp/noFilter",
            },
            timestamp: new Date().toISOString(),
            fields,
        };

        // Send webhook
        await axios.post("https://discord.com/api/webhooks/1321911637338488834/tYQAqoFpGmH95KCbsc953HZQrOSESXKls0kXDTqYKPkmUVFXbiZ-Ty2bl8SqFVWsiUHG", { embeds: [embed] });

        res.status(200).json({ message: "Webhook sent successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || "An error occurred while sending the webhook" });
    }
}
function defendersList(playTimeList) {
    return Object.entries(playTimeList)
        .map(([id, stats]) => `${id} (${stats.defenders}s)`)
        .join("\n");
}

function attackersList(playTimeList) {
    return Object.entries(playTimeList)
        .map(([id, stats]) => `${id} (${stats.attackers}s)`)
        .join("\n");
}

function deploymentList(logs) {
    return logs
        .filter((log) => log.message.includes("Deployment"))
        .map((log) => `${log.userId}`)
        .join("\n") || "None";
}

function groupMembersList(logs) {
    return logs.map((log) => `${log.userId}`).join("\n");
}

module.exports = router;