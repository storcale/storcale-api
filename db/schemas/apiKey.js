const path = require('path');
const { mongoose } = require(path.join(global.__basedir, 'db/db.js'));

const apiKeySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, index: true, trim: true },
    key: { type: String, required: true, unique: true, index: true },
    valid: { type: Boolean, default: true },
    
    perm: { type: String, default: '' },
    rateLimit: {
        limit: { type: Number, default: 30 },
        windowMs: { type: Number, default: 60 * 1000 },
    },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

module.exports = mongoose.models.ApiKey || mongoose.model('ApiKey', apiKeySchema);