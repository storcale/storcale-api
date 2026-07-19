const request = require("supertest");
const app = require("../app");
const fs = require("fs");
const path = require("path");

const disconnectDb = require("../db/db.js").disconnectDB;

const results = [];
const logFilePath = path.join(__dirname, "../access.log");

function log(message) {
    const line = `[${new Date().toISOString()}] ${message}`;
    console.log(line);

    try {
        fs.appendFileSync(logFilePath, line + "\n");
    } catch (err) {
        console.error("Failed to write log:", err);
    }
}

let agent;

beforeAll(async () => {
    await app.init();

    agent = request.agent(app)
        .set("api-key", process.env.ADMIN_KEY);
}, 30000);


async function runTest(name, fn) {
    try {
        await fn();

        results.push({
            name,
            passed: true
        });

    } catch (err) {
        results.push({
            name,
            passed: false,
            error: err.message
        });

        throw err;
    }
}


afterAll(async () => {
    const failed =
        results.length === 0 ||
        results.some(r => !r.passed);

    const logLine =
        (failed ? "Tests Failed" : "Tests Passed") +
        " | Details: " +
        results
            .map(r =>
                r.passed
                    ? `${r.name} - Passed`
                    : `${r.name} - Failed: ${r.error}`
            )
            .join(", ");

    log(logLine);

    try {
        await disconnectDb();
    } catch (err) {
        console.error(
            "Failed to disconnect from DB:",
            err.message
        );
    }

    if (
        agent && process.env.NODE_ENV !== "development" &&
        process.env.NODE_ENV !== "test"
    ) {
        try {
            await agent
                .post("/api/admin/notify")
                .send({
                    title:
                        process.env.NODE_ENV.toUpperCase() +
                        (failed
                            ? " : Tests Failed"
                            : " : Tests Passed"),

                    message: logLine,
                    priority: failed ? "5" : "3",

                    actions: [
                        {
                            action: "view",
                            label: "view logs",
                            url: "https://storcale-api.omegadev.xyz/admin-ui/dashboard",
                            clear: false
                        }
                    ],

                    click: "",
                    email: ""
                })
                .expect(200);

        } catch (err) {
            console.error(
                `Failed to send notification: ${err.message}`
            );
        }
    }
});


describe("General", () => {

    test("Api key required", async () => {
        await runTest(
            "Api key required",
            async () => {
                await request(app)
                    .get("/api/admin/logs")
                    .expect(401);
            }
        );
    });


    test("Public route open", async () => {
        await runTest(
            "Public route open",
            async () => {
                await request(app)
                    .get("/admin-ui/dashboard")
                    .expect(200);
            }
        );
    });

});


describe("TNIV/group", () => {

    if (process.env.NODE_ENV !== "github") {

        test(
            "Past membercount",
            async () => {
                await runTest(
                    "June 2026 membercount",
                    async () => {
                        await agent
                            .get("/api/tniv/group/membercount")
                            .query({
                                groupId: 3612873,
                                year: 2026,
                                month: 5
                            })
                            .expect(200)
                            .expect(res => {
                                if (
                                    res.body.memberCount !== 79888
                                ) {
                                    throw new Error(
                                        "Unexpected memberCount"
                                    );
                                }
                            });
                    }
                );
            },
            30000
        );
    }


    test(
        "Current membercount",
        async () => {
            await runTest(
                "Current membercount",
                async () => {
                    await agent
                        .get("/api/tniv/group/membercount")
                        .query({
                            groupId: 3612873
                        })
                        .expect(200)
                        .expect(res => {
                            if (
                                typeof res.body.memberCount !== "number"
                            ) {
                                throw new Error(
                                    "Response does not contain memberCount"
                                );
                            }
                        });
                }
            );
        },
        30000
    );

});


describe("TNIV/DB", () => {

    describe("stats", () => {

        test(
            "Get global stats",
            async () => {
                await runTest(
                    "Get global stats",
                    async () => {

                        await agent
                            .get("/api/tniv/db/player/stats")
                            .query({
                                from: "01/01/2024",
                                to: "06/30/2028"
                            })
                            .expect(200)
                            .expect(res => {

                                if (
                                    typeof res.body.totalKills !== "number" ||
                                    res.body.totalKills < 1
                                ) {
                                    throw new Error(
                                        "Missing kill statistics"
                                    );
                                }

                            });

                    }
                );
            },
            30000
        );

    });


    describe("match", () => {

        let sessionId = null;


        test(
            "Get matches",
            async () => {

                await runTest(
                    "Get matches",
                    async () => {

                        await agent
                            .get("/api/tniv/db/match")
                            .expect(200)
                            .expect(res => {

                                if (
                                    !Array.isArray(res.body.body)
                                ) {
                                    throw new Error(
                                        "Response does not contain matches"
                                    );
                                }

                            });

                    }
                );

            },
            30000
        );


        test(
            "Add match",
            async () => {

                await runTest(
                    "Add match",
                    async () => {

                        const matchData =
                            fs.readFileSync(
                                path.join(
                                    __dirname,
                                    "exampleMatch.json"
                                ),
                                "utf8"
                            );

                        const json =
                            JSON.parse(matchData);


                        await agent
                            .post("/api/tniv/db/match")
                            .send(json)
                            .expect(200)
                            .expect(res => {

                                if (
                                    !res.body ||
                                    !res.body.code
                                ) {
                                    throw new Error(
                                        "Missing sessionId"
                                    );
                                }

                                sessionId =
                                    res.body.code;
                            });

                    }
                );

            },
            30000
        );


        test(
            "Delete match",
            async () => {

                await runTest(
                    "Delete match",
                    async () => {

                        await agent
                            .delete("/api/tniv/db/match")
                            .send({
                                sessionId
                            })
                            .expect(200);

                    }
                );

            },
            30000
        );

    });

});


describe("TNIV/Sheets", () => {

    describe("events", () => {


        test(
            "get Events",
            async () => {

                await runTest(
                    "get Events",
                    async () => {

                        await agent
                            .get("/api/tniv/sheets/events")
                            .expect(200)
                            .expect(res => {

                                if (
                                    !Array.isArray(res.body.main) ||
                                    res.body.main.length === 0
                                ) {
                                    throw new Error(
                                        "Invalid events response"
                                    );
                                }

                            });

                    }
                );

            },
            30000
        );


        test(
            "get Event Stats",
            async () => {

                await runTest(
                    "get Event Stats",
                    async () => {

                        await agent
                            .get("/api/tniv/sheets/events/stats")
                            .expect(200)
                            .expect(res => {

                                if (
                                    !res.body ||
                                    !res.body.stats ||
                                    res.body.stats.EventCount < 1
                                ) {
                                    throw new Error(
                                        "Invalid event stats"
                                    );
                                }

                            });

                    }
                );

            },
            30000
        );


    });

});