import type { Config } from 'jest';
import { logger } from '@chauhaidang/xq-common-kit';

const DEFAULT_SIMULATOR = 'iPhone 15';
const DEFAULT_JEST_CONFIG = 'e2e/jest.config.js';
const DEFAULT_SETUP_TIMEOUT = 120_000;
const DEFAULT_TEARDOWN_TIMEOUT = 30_000;
const DEFAULT_TEST_TIMEOUT = 120_000;

export interface DetoxConfigOptions {
  /**
   * iOS simulator device type to target.
   * @default 'iPhone 15'
   * @example 'iPhone 16 Pro'
   */
  simulator?: string;
}

/**
 * Creates a Detox configuration for iOS simulator (release build).
 * The consumer only needs to supply the compiled app binary path — everything
 * else (device type, configuration name, test runner defaults) is handled
 * internally.
 *
 * @param binaryPath - Path to the compiled .app bundle, relative to the project root.
 *   Example: 'ios/build/Build/Products/Release-iphonesimulator/MyApp.app'
 * @param options - Optional overrides for device and runner defaults.
 *
 * @example
 * // .detoxrc.js
 * const { createDetoxConfig } = require('@chauhaidang/xq-test-utils');
 * module.exports = createDetoxConfig('ios/build/Release-iphonesimulator/MyApp.app', {
 *   simulator: 'iPhone 16 Pro',
 * });
 */
export function createDetoxConfig(binaryPath: string, options: DetoxConfigOptions = {}): object {
  const { simulator = DEFAULT_SIMULATOR } = options;
  logger.debug('[xq-test-utils] Creating Detox config', { binaryPath, simulator });

  return {
    testRunner: {
      args: { config: DEFAULT_JEST_CONFIG },
      jest: {
        setupTimeout: DEFAULT_SETUP_TIMEOUT,
        teardownTimeout: DEFAULT_TEARDOWN_TIMEOUT,
      },
    },
    apps: {
      'ios.release': {
        type: 'ios.app',
        binaryPath,
      },
    },
    devices: {
      simulator: {
        type: 'ios.simulator',
        device: { type: simulator },
      },
    },
    configurations: {
      'ios.sim.release': {
        device: 'simulator',
        app: 'ios.release',
      },
    },
  };
}

export interface E2eJestConfigOptions {
  /**
   * Glob patterns matching your e2e test files.
   * @default ['<rootDir>/**\/*.e2e.ts']
   */
  testMatch?: string[];
  /**
   * Path to a per-suite setup file (runs inside the worker after the test
   * framework is installed). Optional.
   */
  setupFilePath?: string;
  /** @default 120_000 */
  testTimeout?: number;
  /** @default 'E2E Tests' */
  displayName?: string;
  /** Path to the project's tsconfig. @default '<rootDir>/tsconfig.json' */
  tsconfigPath?: string;
}

/**
 * Creates a Jest configuration tuned for running Detox E2E tests.
 * Uses the Detox test environment and jest-circus runner.
 * Runs tests serially (maxWorkers: 1) as required by Detox.
 *
 * @example
 * // e2e/jest.config.js
 * const { createE2eJestConfig } = require('@chauhaidang/xq-test-utils');
 * module.exports = createE2eJestConfig();
 */
export function createE2eJestConfig(options: E2eJestConfigOptions = {}): Config {
  const {
    testMatch = ['<rootDir>/**/*.e2e.ts'],
    setupFilePath,
    testTimeout = DEFAULT_TEST_TIMEOUT,
    displayName = 'E2E Tests',
    tsconfigPath = '<rootDir>/tsconfig.json',
  } = options;

  const config: Config = {
    displayName,
    testEnvironment: 'detox/runners/jest/testEnvironment',
    testRunner: 'jest-circus/runner',
    testMatch,
    testTimeout,
    maxWorkers: 1,
    verbose: true,
    moduleFileExtensions: ['ts', 'js', 'json'],
    transform: {
      '^.+\\.ts$': ['ts-jest', { tsconfig: tsconfigPath }],
    },
  };

  if (setupFilePath) {
    config.setupFilesAfterEnv = [setupFilePath];
  }

  return config;
}
