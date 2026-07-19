
const path = require('path');
const { mongoose } = require(path.join(global.__basedir, 'db/db.js'));

const memberCountSchema = new mongoose.Schema({
    groupId: { type: String, required: true, index: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    memberCount: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
});

memberCountSchema.index({ groupId: 1, month: 1, year: 1 });

module.exports = mongoose.models.MemberCount || mongoose.model('MemberCount', memberCountSchema);