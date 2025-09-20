const communityEventTypes = new Set([
    "Mass Patrol",
    "Music Night",
    "Gamenight",
    "VC event",
    "Joint Event",
    "Joint Mass Patrol",
    "Joint Gamenight",
    "Internal Joint Gamenight",
    "Joint VC Event"
]);

const diplomacyEventTypes = new Set([
    "Raid/Defense",
    "Practice Raid/Defense Training",
    "Joint Practice Raid/Defense Training",
    "Combat Training",
    "Spar",
    "Joint Spar",
    "Joint Gamenight",
    "Joint Event"
]);

const JointEventTypes = new Set([
    "Joint Practice Raid/Defense Training",
    "Joint Spar",
    "Joint Gamenight",
    "Joint Mass Patrol",
    "Joint Event",
    "Internal Joint Gamenight"
]);

const officerCoreEventTypes = new Set([
    "Mass Patrol",
    "Music Night",
    "Gamenight",
    "VC Event",
    "Joint Event",
    "Spar"
]);

const GuardiansEventTypes = new Set([
    "Raid/Defense",
    "GOE",
    "Joint Practice Raid/Defense Training",
]);

const eventTypes = {
    community: communityEventTypes,
    diplomacy: diplomacyEventTypes,
    officerCore: officerCoreEventTypes,
    guardians: GuardiansEventTypes,
    joint: JointEventTypes
};

module.exports = { eventTypes };
