const app = require('./app');
const port = process.env.PORT;
const env = process.env.NODE_ENV || 'development';
    app.listen(port, () => {
        console.log(`Express started on port ${port}`);
        console.log(`Environment: ${env}`);
        console.log('Documentation: ' + (env === 'production' ? 'https://storcale-api.omegadev.xyz/api-docs' : 'http://localhost:' + port + '/api-docs'));
});