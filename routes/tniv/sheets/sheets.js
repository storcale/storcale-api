
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const keyFile = path.join(global.__basedir, '/envs/gsaKey.env.json');
const auth = new google.auth.GoogleAuth({
    keyFile: keyFile,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function loadSettings(spreadsheetId) {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetExists = meta.data.sheets.some(sheet => sheet.properties.title === 'apiSettings');

    if (!sheetExists) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [
                    {
                        addSheet: {
                            properties: {
                                title: 'apiSettings',
                            },
                        },
                    },
                ],
            },
        });
        await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId,
            requestBody: {
                valueInputOption: 'RAW',
                data: [
                    {
                        range: 'apiSettings!A1:Z1',
                        values: [['API Settings']],
                    },
                    {
                        range: 'apiSettings!A2:A9',
                        values: [
                            ['Date field:'],
                            ['Roster sheet name:'],
                            ['Quota period :'],
                            ['Points column:'],
                            ['Strike column:'],
                            ['Quota status column:'],
                            ['Settings sheet name:'],
                            ['Quota to remove strike:']
                        ],
                    },
                    {
                        range: 'apiSettings!C1',
                        values: [['Inputs:']],
                    },
                    {
                        range: 'apiSettings!C4:C7',
                        values: [
                            ['Ex: 2w,1w,2d,1m'],
                            ['G'],
                            ['D'],
                            ['H'],
                        ],
                    },
                ],
            },
        });

        const metaAfter = await sheets.spreadsheets.get({ spreadsheetId });
        const apiSettingsSheet = metaAfter.data.sheets.find(s => s.properties.title === 'apiSettings');
        const sheetId = apiSettingsSheet.properties.sheetId;

        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [
                    {
                        repeatCell: {
                            range: {
                                sheetId: sheetId,
                                startRowIndex: 0,
                                endRowIndex: 1,
                                startColumnIndex: 0,
                                endColumnIndex: 3
                            },
                            cell: {
                                userEnteredFormat: {
                                    backgroundColor: { red: 1, green: 0.6, blue: 0 },
                                    horizontalAlignment: 'LEFT',
                                    textFormat: {
                                        fontSize: 14,
                                        bold: true,
                                        foregroundColor: { red: 1, green: 1, blue: 1 }
                                    }
                                }
                            },
                            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
                        }
                    },
                    {
                        repeatCell: {
                            range: {
                                sheetId: sheetId,
                                startRowIndex: 1,
                                endRowIndex: 9,
                                startColumnIndex: 2,
                                endColumnIndex: 3
                            },
                            cell: {
                                userEnteredFormat: {
                                    backgroundColor: { red: 0.8, green: 0.8, blue: 1 }
                                }
                            },
                            fields: 'userEnteredFormat.backgroundColor'
                        }
                    },
                    {
                        updateSheetProperties: {
                            properties: {
                                sheetId: sheetId,
                                hidden: true
                            },
                            fields: 'hidden'
                        }
                    }
                ]
            }
        });
        throw new Error('Settings sheet created. Please fill in the required fields.');
    }
    const settingsRange = 'apiSettings!C2:C9';
    const result = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: settingsRange,
    });

    const values = result.data.values?.map(row => row[0]) || [];
    const settings = {
        dateField: values[0],
        rosterSheetName: values[1],
        quotaPeriod: values[2],
        pointsColumn: values[3],
        strikeColumn: values[4],
        quotaStatusColumn: values[5],
        settingsSheetName: values[6],
        quotaToRemoveStrike: values[7],
    };

    for (const key in settings) {
        if (!settings[key]) {
            throw new Error('Missing setting: ' + key);
        }
    }

    return settings;
}

function colLetterToIndex(col) {
    if (typeof col === 'string') {
        return col.toUpperCase().charCodeAt(0) - 65;
    }
    return col;
}

async function getRosterData(settings, spreadsheetId) {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const range = `${settings.rosterSheetName}!A3:Z`;
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const data = res.data.values || [];
    return data.reduce((result, row, idx) => {
        const username = row[0];
        if (!username || username.toString().toLowerCase() === 'username') return result;
        const points = row[colLetterToIndex(settings.pointsColumn)] || '';
        const strikes = row[colLetterToIndex(settings.strikeColumn)] || '';
        const quotaStatus = row[colLetterToIndex(settings.quotaStatusColumn)] || '';
        const sheetRow = idx + 3;
        result.push({ username, points, quotaStatus, strikes, sheetRow });
        return result;
    }, []);
}
async function resetDB(settings, spreadsheetId) {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const range = `${settings.settingsSheetName}!${settings.dateField}`;
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
    });

    const baseDateStr = res.data.values?.[0]?.[0];
    if (!baseDateStr) throw new Error("Date field is empty.");

    const [month, day, year] = baseDateStr.split("/").map(s => parseInt(s, 10));
    const baseDate = new Date(year, month - 1, day);
    const period = settings.quotaPeriod.trim();
    const num = parseInt(period);
    const unit = period.slice(-1);

    const expiryDate = new Date(baseDate);
    if (unit === 'w') {
        expiryDate.setDate(expiryDate.getDate() + num * 7);
    } else if (unit === 'd') {
        expiryDate.setDate(expiryDate.getDate() + num);
    } else if (unit === 'm') {
        expiryDate.setMonth(expiryDate.getMonth() + num);
    } else {
        throw new Error("Invalid period field in settings: " + settings.quotaPeriod);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiryDate.setHours(0, 0, 0, 0);

    if (expiryDate > today)
        throw new Error("Database can not be reset until " + expiryDate.toDateString());
    let pastUsers = await getUsers(settings, spreadsheetId);
    let users, usersChanged;
    [users, usersChanged] = await manageStrikes(pastUsers, settings, spreadsheetId);

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${settings.settingsSheetName}!${settings.dateField}`,
        valueInputOption: 'RAW',
        requestBody: {
            values: [[today.toLocaleDateString('en-US')]],
        },
    });

    let output = "**Users with incomplete quota:**\n";
    if (Array.isArray(users?.incomplete)) {
        users.incomplete.forEach(user => {
            output += `- ${user.username} (Points: ${user.points}, Strikes: ${user.strikes})\n`;
        });
    } else {
        output += "N/A.\n";
    }
    output += "\n**Users with updated strikes:**\n";
    if (Array.isArray(usersChanged)) {
        usersChanged.forEach(user => {
            output += `- ${user.username} was ${user.action} 1 strike (${user.beforeStrikes} -> ${user.afterStrikes}).\n`;
        });
    } else {
        output += "N/A.\n";
    }
    const logFile = path.join(global.__basedir, 'logs', `reset.log`);
    const strikeUpdates = usersChanged.map(u => `${u.username} (${u.beforeStrikes} -> ${u.afterStrikes})`).join(', ');
    const incompleteUsers = users.incomplete.map(u => u.username).join(', ');
    const logLine = `[${new Date().toISOString()}] Reset performed on spreadsheet ID ${spreadsheetId} | Quota Period: ${expiryDate.toLocaleDateString('en-US')} -> ${today.toLocaleDateString('en-US')} | Incomplete: [${incompleteUsers || 'N/A'}] | Strikes Updated: [${strikeUpdates || 'N/A'}]`;
    fs.appendFileSync(logFile, logLine + '\n');
    return output;
}

async function getUsers(settings, spreadsheetId) {
    try {
        const roster = await getRosterData(settings, spreadsheetId);
        const imcomplete = roster.filter(row => row.quotaStatus && row.quotaStatus.toString().toLowerCase() === 'incomplete');
        return {
            all: roster,
            incomplete: imcomplete,
        };
    } catch (err) {
        throw new Error(`Failed to get users: ${err.message}`);
    }
}
async function manageStrikes(users, settings, spreadsheetId) {
    const usersChanged = [];
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const roster = await getRosterData(settings, spreadsheetId);

    for (let i = 0; i < users.incomplete.length; i++) {
        const user = users.incomplete[i];
        let strikes = parseInt(user.strikes, 10) || 0;
        const rosterEntry = roster.find(row => row.username === user.username && row.quotaStatus && row.quotaStatus.toString().toLowerCase() === 'incomplete');
        if (strikes < 3 && rosterEntry) {
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${settings.rosterSheetName}!${settings.strikeColumn}${rosterEntry.sheetRow}`,
                valueInputOption: 'RAW',
                requestBody: {
                    values: [[strikes + 1]],
                },
            });
            usersChanged.push({ username: user.username, beforeStrikes: strikes, afterStrikes: strikes + 1, action: "added" });
            user.strikes = strikes + 1;
        }
    }

    for (let i = 0; i < users.all.length; i++) {
        const user = users.all[i];
        let points = parseInt(user.points, 10) || 0;
        let strikes = parseInt(user.strikes, 10) || 0;
        let quotaToRemoveStrike = parseInt(settings.quotaToRemoveStrike, 10) || 0;
        const rosterEntry = roster.find(row => row.username === user.username && (!row.quotaStatus || row.quotaStatus.toString().toLowerCase() !== 'incomplete'));
        if (points >= quotaToRemoveStrike && strikes > 0 && rosterEntry) {
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${settings.rosterSheetName}!${settings.strikeColumn}${rosterEntry.sheetRow}`,
                valueInputOption: 'RAW',
                requestBody: {
                    values: [[strikes - 1]],
                },
            });
            usersChanged.push({ username: user.username, beforeStrikes: strikes, afterStrikes: strikes - 1, action: "removed" });
            user.strikes = strikes - 1;
        }
    }
    return [users, usersChanged];
}
module.exports = { loadSettings, getRosterData, resetDB };
