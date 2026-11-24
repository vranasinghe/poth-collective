module.exports = {
    testEnvironment: 'node',
    testMatch: ['<rootDir>/tests/**/*.test.js'],
    // Runs before every test file: forces a test-only environment and removes any inherited database URI
    setupFiles: ['<rootDir>/tests/helpers/env.js'],
    testTimeout: 60000,
    clearMocks: true
};
