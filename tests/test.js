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
        await request(app)
            .post("/api/admin/notify")
            .set("api-key", process.env.ADMIN_KEY)
            .send({
                title: failed ? "Tests Failed" : "Tests Passed",
                message: logLine,
                priority: failed ? "3" : "5",
                actions: [
                    {
                        action: "view",
                        label: "view logs",
                        url: `https://storcale-api.omegadev.xyz/admin-ui/dashboard`,
                        clear: false
                    }
                ],
                click: "",
                email: failed ? process.env.EMAIL : ""
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