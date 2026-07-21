const app = require('./app');
const { sendDeploymentStatus } = require('./utils/sendDeploymentStatus');
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
    .catch(async (err) => {
        console.error('Failed to initialize app:', err);
        if (env === 'production') {
            try {
                await sendDeploymentStatus({
                    environment: env,
                    status: 'failure',
                    error: err.message || String(err)
                });
            } catch (notifyErr) {
                console.error('Deployment failure webhook failed:', notifyErr.message || notifyErr);
            }
        }
        process.exit(1);
    });