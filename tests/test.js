const request = require("supertest");
const app = require("../app");
const fs = require("fs");
const path = require("path");
const os = require("os");

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
const agent = request.agent(app)
    .set('api-key', process.env.ADMIN_KEY);

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
    const failed = results.some(r => !r.passed);

    const logLine =
        (failed ? "Tests Failed" : "Tests Passed") +
        " | Details: " +
        results
            .map(r => r.passed ? ` ${r.name} - Passed` : ` ${r.name} - Failed: ${r.error}`)
            .join(", ");

    log(logLine);

    try {
        await agent
            .post("/api/admin/notify")
            .send({
                title: process.env.NODE_ENV.toUpperCase() + (failed ? " : Tests Failed" : " : Tests Passed"),
                message: logLine,
                priority: failed ? "5" : "3",
                actions: [
                    {
                        action: "view",
                        label: "view logs",
                        url: `https://storcale-api.omegadev.xyz/admin-ui/dashboard`,
                        clear: false
                    }
                ],
                click: "",
                email: ""
            })
            .expect(200);
    } catch (err) {
        log(`Failed to send notification: ${err.message}`);
    }
});

describe("General", () => {
    test("Api key required", () =>
        runTest("Api key required", async () => {
            await request(app)
                .get("/api/admin/logs")
                .expect(401);
        })
    );

    test("Public route open", () =>
        runTest("Public route open", async () => {
            await request(app)
                .get("/admin-ui/dashboard")
                .expect(200);
        })
    );
});
// TNIV
describe("TNIV/group",() => {
    test("Past membercount",() =>
        runTest("June 2026 membercount", async () => {
            await agent
                .get("/api/tniv/group/membercount")
                .query({ groupId: 3612873, year: 2026, month: 5 })
                .expect(res => {
                    console.log(res.body)
                    if (res.body.memberCount !== 79888) {
                        throw new Error("Response does not contain expected memberCount");
                    }
                })
                .expect(200);
        }),
    )
    test("Current membercount",() =>
        runTest("Current membercount", async () => {
            const res = await agent
                .get("/api/tniv/group/membercount")
                .query({ groupId: 3612873 })
                .expect(res => {
                    if (typeof res.body.memberCount !== 'number') {
                        throw new Error("Response does not contain memberCount");
                    }
                })
                .expect(200)
            
        })
    )
})

