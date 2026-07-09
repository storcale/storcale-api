module.exports = {
  clearMocks: true,
  collectCoverage: false,
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.js'],
  setupFiles: ["./tests/jest.setup.js"],
};