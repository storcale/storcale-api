const path = require('path');
const { mongoose } = require(path.join(global.__basedir, 'db/db.js'));

const spreadsheetSchema = new mongoose.Schema({
    category: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
});

module.exports = mongoose.models.Spreadsheet || mongoose.model('Spreadsheet', spreadsheetSchema);