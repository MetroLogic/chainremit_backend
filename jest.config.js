module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src', '<rootDir>/tests'],
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov'],
    coverageThreshold: {
        global: {
            branches: 3,
            functions: 4,
            lines: 8,
            statements: 8,
        },
    },
    moduleFileExtensions: ['ts', 'js', 'json'],
    testMatch: ['**/?(*.)+(spec|test).ts'],
    setupFiles: ['dotenv/config'],
    testTimeout: 10000,
    forceExit: true,
    detectOpenHandles: true,
};
