const path = require('path');
const { mongoose } = require(path.join(global.__basedir, 'db/db.js'));

const bannedIpSchema = new mongoose.Schema({
    ip: { type: String, required: true, unique: true, index: true },
    reason: { type: String, default: 'unspecified' },
    bannedAt: { type: Date, default: Date.now },
    bannedBy: { type: String, default: 'admin' },
});

module.exports = mongoose.models.BannedIp || mongoose.model('BannedIp', bannedIpSchema);