const path = require('path');
const { mongoose } = require(path.join(global.__basedir, 'db/db.js'));

const webhookSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, index: true, trim: true },
    url: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.models.Webhook || mongoose.model('Webhook', webhookSchema);