module.exports = {
  apps: [
    {
      name: "api",
      script: "bun",
      args: "start",
      cwd: "/home/storcale/storcale-api",  
      env: {
        NODE_ENV: "production"
      },
      exec_mode: "cluster",
      instances: "1",
      autorestart: true,
      watch: false,
    }
  ]
};