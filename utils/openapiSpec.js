const path = require('path');
const glob = require('glob');
const swaggerJSDoc = require('swagger-jsdoc');

function buildSwaggerDefinition() {
    return {
        openapi: '3.0.0',
        info: {
            title: 'Storcale API',
            version: '1.0.0',
            description: 'API documentation for Storcale',
        },
        servers: [
            { url: '/api' },
        ],
        components: {
            securitySchemes: {
                ApiKeyAuth: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'api-key',
                },
            },
        },
        security: [
            { ApiKeyAuth: [] },
        ],
    };
}

/**
 * Parses every route file's JSDoc/@swagger comments into a single OpenAPI document.
 * Used both by /api-docs (Swagger UI) and by the admin-ui Routes explorer so
 * new endpoints show up in both places automatically, with zero extra wiring.
 */
function buildOpenApiSpec() {
    const apiFiles = glob.sync(path.join(global.__basedir, 'routes/**/*.js'));
    return swaggerJSDoc({ swaggerDefinition: buildSwaggerDefinition(), apis: apiFiles });
}

let cached = null;

function getOpenApiSpec(force = false) {
    if (!force && cached) return cached;
    cached = buildOpenApiSpec();
    return cached;
}

module.exports = { buildOpenApiSpec, getOpenApiSpec };
