const path = require('path');
const { mongoose } = require(path.join(global.__basedir, 'db/db.js'));

const playerStatSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true, index: true },
    username: { type: String },
    kills: { type: Number, default: 0 },
    deaths: { type: Number, default: 0 },
    playTimeSec: { type: Number, default: 0 },
    matchesPlayed: { type: Number, default: 0 },
    totalPing: { type: Number, default: 0 },
    pingSamples: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.models.PlayerStat || mongoose.model('PlayerStat', playerStatSchema);