module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/setup/test-setup.js'],
  testTimeout: 30000,
  verbose: true,
  collectCoverage: false,
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  bail: false, // Don't bail so all tests run and get reported
  forceExit: true,
  clearMocks: true,
  // Output JSON results for CI/CD processing
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '.',
        outputName: 'junit.xml',
        suiteName: 'E2E Tests',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: 'true',
        includeConsoleOutput: 'true',
        includeShortConsoleOutput: 'false',
        addFileAttribute: 'true',
      },
    ],
  ],
}