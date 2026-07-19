const app = require('./app');
const port = process.env.PORT || 9902;
const env = process.env.NODE_ENV || 'development';

app.init()
    .then(() => {
        app.listen(port, () => {
            console.log(`Express started on port ${port}`);
            console.log(`Environment: ${env}`);
            console.log('Documentation: ' + (env === 'production' ? 'https://storcale-api.omegadev.xyz/api-docs' : 'http://localhost:' + port + '/api-docs'));
        });
    })
    .catch((err) => {
        console.error('Failed to initialize app:', err);
        process.exit(1);
    });