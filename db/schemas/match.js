const path = require("path");
const { mongoose } = require(path.join(global.__basedir, "db/db.js"));

const matchSchema = new mongoose.Schema(
{
    sessionId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    // for v1 compability
    data: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },

    matchStartTime: {
        type: Number,
        index: true,
    },

    endTime: {
        type: Number,
        index: true,
    },
},
{
    timestamps: true,
});

module.exports =
    mongoose.models.Match || mongoose.model("Match", matchSchema);