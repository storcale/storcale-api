const path = require('path');
const { mongoose } = require(path.join(global.__basedir, 'db/db.js'));
// TODO fix schema
const matchSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true, index: true },
    // Raw match payload exactly as posted by the terminal, kept as-is for backwards compatibility
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    matchStartTime: { type: Number, index: true },
    endTime: { type: Number },
}, { timestamps: true });

module.exports = mongoose.models.Match || mongoose.model('Match', matchSchema);