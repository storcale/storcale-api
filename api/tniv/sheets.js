const { google } = require('googleapis');
const { get } = require('http');

const auth = new google.auth.GoogleAuth({
    keyFile: './envs/gsaKey.env.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function loadSettings(spreadsheetId) {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    // Step 1: Get spreadsheet metadata to check if sheet exists
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetExists = meta.data.sheets.some(sheet => sheet.properties.title === 'apiSettings');

    // Step 2: If not, create and populate the sheet
    if (!sheetExists) {
        // Create the sheet
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

        // Set headers, labels, and sample data
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
                        range: 'apiSettings!A2:A8',
                        values: [
                            ['Date field:'],
                            ['Roster sheet name:'],
                            ['Quota period :'],
                            ['Points column:'],
                            ['Strike column:'],
                            ['Quota status column:'],
                            ['Settings sheet name:'],
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

        throw new Error('Settings sheet created. Please fill in the required fields.');
    }
    const settingsRange = 'apiSettings!C2:C8';
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
    };

    for (const key in settings) {
        if (!settings[key]) {
            throw new Error('Missing setting: ' + key);
        }
    }

    return settings;
}

async function getRosterData(settings, spreadsheetId) {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const range = `${settings.rosterSheetName}!A3:Z`;

    const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
    });

    const data = res.data.values || [];
    const result = [];

    function colLetterToIndex(col) {
        if (typeof col === 'string') {
            return col.toUpperCase().charCodeAt(0) - 65;
        }
        return col;
    }

    const pointsCol = colLetterToIndex(settings.pointsColumn);
    const strikeCol = colLetterToIndex(settings.strikeColumn);
    const quotaStatusCol = colLetterToIndex(settings.quotaStatusColumn);

    let rowIndex = 0;
    while (rowIndex < data.length) {
        const row = data[rowIndex];
        const username = row[0];

        if (!username) break;
        if (username.toString().toLowerCase() === 'username') {
            rowIndex++;
            continue;
        }

        const points = row[pointsCol] || '';
        const strike = row[strikeCol] || '';
        const quotaStatus = row[quotaStatusCol] || '';

        result.push([username, points, quotaStatus, strike]);

        rowIndex++;
    }

    return result;
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

    if (expiryDate >= today)
        throw Error("Database can not be reset until", expiryDate.toDateString());
    const users = await getUsers(settings, spreadsheetId);
    
    
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${settings.settingsSheetName}!${settings.dateField}`,
        valueInputOption: 'RAW',
        requestBody: {
            values: [[today.toLocaleDateString('en-US')]],
        },
    });

    // Prepare a human-readable list of incomplete users and users with strikes
    let output = "**Users with incomplete quota:**\n";
    users.incomplete.forEach(user => {
        output += `- ${user.username} (Points: ${user.points}, Strikes: ${user.strikes})\n`;
    });

    output += "\n**Users with Strikes:**\n";
    users.strikes.forEach(user => {
        output += `- ${user.username} (Points: ${user.points}, Strikes: ${user.strikes})\n`;
    });
    output += `\n\nDatabase reset successfully.`;
    return output;
}

async function getUsers(settings, spreadsheetId) {
    try {
        const roster = await getRosterData(settings, spreadsheetId);
        const imcomplete = roster.filter(row => row[2] && row[2].toString().toLowerCase() === 'incomplete').map(row => ({ username: row[0], quotaStatus: row[2], points: row[1], strikes: row[3] }));
        const strikes = roster.filter(row => {
            const strikes = parseInt(row[3], 10);
            return !isNaN(strikes) && strikes > 0;
        }).map(row => ({ username: row[0], points: row[1], strikes: row[3] }));
        return {
            incomplete: imcomplete,
            strikes: strikes,
        };
    } catch (err) {
        throw new Error(`Failed to get users: ${err.message}`);
    }
}

module.exports = { loadSettings, getRosterData, resetDB };
