const path = require('path');
const { getEicConnection } = require(path.join(global.__basedir, 'db/db.js'));

const caseSchema = new (require('mongoose')).Schema({
    caseId: { type: Number, required: true, unique: true, index: true},
    robloxUsername: { type: String, required: true},
    robloxId: { type: Number, required: true},
    weaponMechanic: {type: String, required: true},
    activeBannedGames: {type:Array, required: true},
    active: {type:Boolean,required: true}
});

const eicConn = getEicConnection();
module.exports = eicConn.models.caseSchema || eicConn.model('case', caseSchema);