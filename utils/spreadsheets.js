const { google } = require('googleapis');
const path = require('path');
const Spreadsheet = require(path.join(global.__basedir, 'db/schemas/spreadsheet.js'));

const auth = new google.auth.GoogleAuth({
    keyFile: path.join(global.__basedir, 'envs/gsaKey.env.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function checkSpreadsheet(spreadsheetId) {
    try {
        const client = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: client });
        await sheets.spreadsheets.get({ spreadsheetId });
        return true;
    } catch (err) {
        return err && err.message ? err.message : false;
    }
}

class SpreadsheetManager {

    async getSpreadsheet(category) {
        const key = category.toLowerCase();
        const doc = await Spreadsheet.findOne({ category: key }).lean();
        if (!doc) {
            throw new Error(`Category ${category} does not exist.`);
        }
        return doc.value;
    }

    async getAll() {
        const docs = await Spreadsheet.find({}).lean();
        const map = {};
        docs.forEach((d) => { map[d.category] = d.value; });
        return map;
    }

    async updateSpreadsheet(category, newSpreadsheetId) {
        const check = await checkSpreadsheet(newSpreadsheetId);
        if (check !== true) {
            throw new Error(`Spreadsheet ID ${newSpreadsheetId} is invalid or inaccessible. Reason: ${check}. Make sure vanguards-api@vanguards-api.iam.gserviceaccount.com is added/The ID is correct.`);
        }
        const key = category.toLowerCase();
        await Spreadsheet.findOneAndUpdate(
            { category: key },
            { category: key, value: newSpreadsheetId },
            { upsert: true }
        );
        return `${category} spreadsheet updated successfully to https://docs.google.com/spreadsheets/d/${newSpreadsheetId}/edit. `;
    }

    async addKey(category, spreadsheetId) {
        const check = await checkSpreadsheet(spreadsheetId);
        if (check !== true) {
            throw new Error(`Spreadsheet ID ${spreadsheetId} is invalid or inaccessible. Reason: ${check}. Make sure vanguards-api@vanguards-api.iam.gserviceaccount.com is added/The ID is correct.`);
        }
        const key = category.toLowerCase();
        const existing = await Spreadsheet.findOne({ category: key });
        if (existing) {
            throw new Error(`Invalid data format for category ${category}.`);
        }
        await Spreadsheet.create({ category: key, value: spreadsheetId });
        return `Sucessfully added https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit under ${category}!`;
    }

    async removeKey(category, spreadsheetId) {
        const key = category.toLowerCase();
        const doc = await Spreadsheet.findOne({ category: key });
        if (!doc) {
            throw new Error(`Category ${category} does not exist.`);
        }
        if (doc.value === spreadsheetId) {
            await Spreadsheet.deleteOne({ category: key });
        } else if (Array.isArray(doc.value)) {
            const idx = doc.value.indexOf(spreadsheetId);
            if (idx === -1) {
                throw new Error(`Spreadsheet ID ${spreadsheetId} does not exist in category ${category}.`);
            }
            doc.value.splice(idx, 1);
            if (doc.value.length === 0) {
                await Spreadsheet.deleteOne({ category: key });
            } else {
                doc.markModified('value');
                await doc.save();
            }
        } else {
            throw new Error(`Spreadsheet ID ${spreadsheetId} does not exist in category ${category}.`);
        }
        return `Sucessfully removed ${category} from the database!`;
    }
}

module.exports = { SpreadsheetManager };