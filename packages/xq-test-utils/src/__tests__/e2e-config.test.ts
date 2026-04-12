import { createDetoxConfig, createE2eJestConfig } from '../e2e/config';

describe('createDetoxConfig', () => {
  const BINARY = 'ios/build/Release-iphonesimulator/MyApp.app';

  it('sets the binary path on the ios.release app', () => {
    const config = createDetoxConfig(BINARY) as any;
    expect(config.apps['ios.release'].binaryPath).toBe(BINARY);
    expect(config.apps['ios.release'].type).toBe('ios.app');
  });

  it('targets iPhone 15 simulator by default', () => {
    const config = createDetoxConfig(BINARY) as any;
    expect(config.devices.simulator.type).toBe('ios.simulator');
    expect(config.devices.simulator.device.type).toBe('iPhone 15');
  });

  it('overrides the simulator device type when simulator option is provided', () => {
    const config = createDetoxConfig(BINARY, { simulator: 'iPhone 16 Pro' }) as any;
    expect(config.devices.simulator.device.type).toBe('iPhone 16 Pro');
  });

  it('creates an ios.sim.release configuration', () => {
    const config = createDetoxConfig(BINARY) as any;
    expect(config.configurations['ios.sim.release']).toEqual({
      device: 'simulator',
      app: 'ios.release',
    });
  });

  it('sets sensible testRunner defaults', () => {
    const config = createDetoxConfig(BINARY) as any;
    expect(config.testRunner.args.config).toBe('e2e/jest.config.js');
    expect(config.testRunner.jest.setupTimeout).toBe(120_000);
    expect(config.testRunner.jest.teardownTimeout).toBe(30_000);
  });
});

describe('createE2eJestConfig', () => {
  it('uses Detox test environment and jest-circus runner', () => {
    const config = createE2eJestConfig();
    expect(config.testEnvironment).toBe('detox/runners/jest/testEnvironment');
    expect(config.testRunner).toBe('jest-circus/runner');
  });

  it('defaults to 120 s testTimeout', () => {
    const config = createE2eJestConfig();
    expect(config.testTimeout).toBe(120_000);
  });

  it('sets maxWorkers to 1 (Detox runs serially)', () => {
    const config = createE2eJestConfig();
    expect(config.maxWorkers).toBe(1);
  });

  it('defaults displayName to "E2E Tests"', () => {
    const config = createE2eJestConfig();
    expect(config.displayName).toBe('E2E Tests');
  });

  it('accepts custom testMatch, testTimeout, displayName', () => {
    const config = createE2eJestConfig({
      testMatch: ['<rootDir>/e2e/**/*.spec.ts'],
      testTimeout: 60_000,
      displayName: 'iOS E2E',
    });
    expect(config.testMatch).toEqual(['<rootDir>/e2e/**/*.spec.ts']);
    expect(config.testTimeout).toBe(60_000);
    expect(config.displayName).toBe('iOS E2E');
  });

  it('omits setupFilesAfterEnv when setupFilePath is not provided', () => {
    const config = createE2eJestConfig();
    expect(config.setupFilesAfterEnv).toBeUndefined();
  });

  it('includes setupFilesAfterEnv when setupFilePath is provided', () => {
    const config = createE2eJestConfig({ setupFilePath: '<rootDir>/e2e/setup.ts' });
    expect(config.setupFilesAfterEnv).toContain('<rootDir>/e2e/setup.ts');
  });
});
