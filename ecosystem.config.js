module.exports = {
    apps: [
        {
            name: "api",
            script: "bun",
            args: "start",
            cwd: "/storcale-api",
            env: {
                NODE_ENV: "production"
            },
            autorestart: true,
            watch: false,
        }
    ]
};