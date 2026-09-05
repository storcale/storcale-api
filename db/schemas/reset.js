const path = require('path');
const { mongoose } = require(path.join(global.__basedir, 'db/db.js'));

const resetSchema = new mongoose.Schema({
    spreadsheetId: { type: String, required: true, index: true },
    periodStart: { type: Number, required: true },
    periodEnd: { type: Number, required: true },
    incompleteString: { type: String, required: true },
    strikesString: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
});
resetSchema.index({ spreadsheetId: 1, periodStart: 1, periodEnd: 1 });

module.exports = mongoose.models.Reset || mongoose.model('Reset', resetSchema);