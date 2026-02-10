/**
 * Jest config factory for component/integration tests.
 * Returns a config that can be merged with or used as jest.config.component.js.
 *
 * @param {{
 *   rootDir?: string;
 *   testMatch: string | string[];
 *   setupPath: string;
 *   teardownPath: string;
 *   helpersPath?: string;
 *   tsconfigPath?: string;
 *   testTimeout?: number;
 *   displayName?: string;
 * }} options
 * @returns {import('jest').Config}
 */
function getComponentTestConfig(options) {
  const {
    rootDir = './',
    testMatch,
    setupPath,
    teardownPath,
    helpersPath,
    tsconfigPath = '<rootDir>/tsconfig.json',
    testTimeout = 60000,
    displayName = 'Component Tests',
  } = options;

  const config = {
    displayName,
    preset: 'ts-jest',
    testEnvironment: 'node',
    rootDir,
    testMatch: Array.isArray(testMatch) ? testMatch : [testMatch],
    testTimeout,
    setupFilesAfterEnv: [setupPath],
    globalTeardown: teardownPath,
    maxWorkers: 1,
    verbose: true,
    bail: false,
    collectCoverageFrom: [],
    moduleFileExtensions: ['ts', 'js', 'json'],
    transform: {
      '^.+\\.ts$': [
        'ts-jest',
        {
          tsconfig: tsconfigPath,
        },
      ],
    },
  };

  if (helpersPath) {
    config.moduleNameMapper = {
      '^@helpers/(.*)$': `${helpersPath}/$1`,
    };
  }

  return config;
}

module.exports = getComponentTestConfig;
