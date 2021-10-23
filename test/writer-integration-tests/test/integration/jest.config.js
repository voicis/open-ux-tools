module.exports = {
    preset: 'jest-puppeteer',
    transform: {
        '^.+\\.ts$': 'ts-jest'
    },
    modulePathIgnorePatterns: ['<rootDir>/test-output/*']
};
