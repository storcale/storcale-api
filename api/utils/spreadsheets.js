const { google } = require('googleapis');
const { get } = require('http');
const spreadsheetFile = require('../envs/spreadsheets.env.json');

function getSpreadsheets() {
    const spreadsheets = {};
    for (const [category, keys] of Object.entries(spreadsheetFile)) {
        spreadsheets[category.toLowerCase()] = keys;
    }
    return spreadsheets;
}
const auth = new google.auth.GoogleAuth({
    keyFile: './envs/gsaKey.env.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function checkSpreadsheet(spreadsheetId) {
    try{
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    return true
    }catch (err) {
        console.error('Error checking spreadsheet:', err);
        return false;
    }
}

class SpreadsheetManager {
    constructor() {
        this.spreadsheets = getSpreadsheets();
    }
    getSpreadsheet(category) {
    if (!this.spreadsheets[category.toLowerCase()]) {
        throw new Error(`Category ${category} does not exist.`);
    }
    return this.spreadsheets[category.toLowerCase()];
    }

    updateSpreadsheet(category, newSpreadsheetId) {
        if (!checkSpreadsheet(newSpreadsheetId)) {
            throw new Error(`Spreadsheet ID ${newSpreadsheetId} is invalid or inaccessible. Make sure vanguards-api@vanguards-api.iam.gserviceaccount.com is added/The ID is correct.`);
        }
        updateSpreadsheet(category, newSpreadsheetId);
        this.spreadsheets = getSpreadsheets();
        return true
    }
    addKey(category, SpreadsheetId) {
        if (!checkSpreadsheet(SpreadsheetId)) {
            throw new Error(`Spreadsheet ID ${SpreadsheetId} is invalid or inaccessible. Make sure vanguards-api@vanguards-api.iam.gserviceaccount.com is added/The ID is correct.`);
        }
        const spreadsheets = getSpreadsheets();
        if (!spreadsheets[category.toLowerCase()]) {
            spreadsheets[category.toLowerCase()] = [SpreadsheetId];
        }
        else {
            throw new Error(`Category ${category} already exists.`);
        }
        return true
    }
}

module.exports = { SpreadsheetManager }