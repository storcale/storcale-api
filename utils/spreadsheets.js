const { google } = require('googleapis');

function getSpreadsheets() {
    const fs = require('fs');
    const filePath = require('path').join(__dirname, '../envs/spreadsheets.env.json');
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
        throw e;
    }
}

const auth = new google.auth.GoogleAuth({
    keyFile: './envs/gsaKey.env.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function checkSpreadsheet(spreadsheetId) {
    try {
        const client = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: client });
        await sheets.spreadsheets.get({ spreadsheetId });
        return true;
    } catch {
        return false;
    }
}

class SpreadsheetManager {
    constructor() {
        this.spreadsheets = getSpreadsheets();
    }
    getSpreadsheet(category) {
        const key = category.toLowerCase();
        if (!this.spreadsheets[key]) {
            throw new Error(`Category ${category} does not exist.`);
        }
        return this.spreadsheets[category.toLowerCase()];
    }

    async updateSpreadsheet(category, newSpreadsheetId) {
        const check = await checkSpreadsheet(newSpreadsheetId);
        if (!check) {
            throw new Error(`Spreadsheet ID ${newSpreadsheetId} is invalid or inaccessible. Make sure vanguards-api@vanguards-api.iam.gserviceaccount.com is added/The ID is correct.`);
        }
        this.spreadsheets[category.toLowerCase()] = newSpreadsheetId;
        const fs = require('fs');
        const filePath = require('path').join(__dirname, '../envs/spreadsheets.env.json');
        fs.writeFileSync(filePath, JSON.stringify(this.spreadsheets, null, 4));
        this.spreadsheets = getSpreadsheets();
        return `${category} spreadsheet updated successfully to https://docs.google.com/spreadsheets/d/${newSpreadsheetId}/edit. `;
    }
    async addKey(category, SpreadsheetId) {
        const check = await checkSpreadsheet(SpreadsheetId);
        if (!check) {
            throw new Error(`Spreadsheet ID ${SpreadsheetId} is invalid or inaccessible. Make sure vanguards-api@vanguards-api.iam.gserviceaccount.com is added/The ID is correct.`);
        }
        const fs = require('fs');
        const filePath = require('path').join(__dirname, '../envs/spreadsheets.env.json');
        let fileData = {};
        try {
            fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (e) {
            throw e
        }
        const cat = category.toLowerCase();
        if (!fileData[cat]) {
            fileData[cat] = SpreadsheetId;
        } else {
            throw new Error(`Invalid data format for category ${category}.`);
        }
        fs.writeFileSync(filePath, JSON.stringify(fileData, null, 4));
        this.spreadsheets = getSpreadsheets();
        return `Sucessfully added https://docs.google.com/spreadsheets/d/${SpreadsheetId}/edit under ${category}!`;
    }
    async removeKey(category, SpreadsheetId) {
        const fs = require('fs');
        const filePath = require('path').join(__dirname, '../envs/spreadsheets.env.json');
        let fileData = {};
        try {
            fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (e) {
            throw e;
        }
        const cat = category.toLowerCase();
        if (!fileData[cat]) {
            throw new Error(`Category ${category} does not exist.`);
        }
        if (fileData[cat] === SpreadsheetId) {
            delete fileData[cat];
        } else if (Array.isArray(fileData[cat])) {
            // remove array
            const idx = fileData[cat].indexOf(SpreadsheetId);
            if (idx === -1) {
                throw new Error(`Spreadsheet ID ${SpreadsheetId} does not exist in category ${category}.`);
            }
            fileData[cat].splice(idx, 1);
            if (fileData[cat].length === 0) {
                delete fileData[cat];
            }
        } else {
            throw new Error(`Spreadsheet ID ${SpreadsheetId} does not exist in category ${category}.`);
        }
        fs.writeFileSync(filePath, JSON.stringify(fileData, null, 4));
        this.spreadsheets = getSpreadsheets();
        return `Sucessfully removed ${category} from the database!`;
    }
}

module.exports = { SpreadsheetManager }