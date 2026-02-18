/**
 * Unit tests for getComponentTestConfig
 */

import { getComponentTestConfig } from '../test-config/jest-component';

describe('getComponentTestConfig', () => {
    const requiredOptions = {
        testMatch: '<rootDir>/test/**/*.test.ts',
        setupPath: '<rootDir>/test/setup.ts',
        teardownPath: '<rootDir>/test/teardown.ts',
    };

    it('should return a valid Jest config with defaults', () => {
        const config = getComponentTestConfig(requiredOptions);

        expect(config.preset).toBe('ts-jest');
        expect(config.testEnvironment).toBe('node');
        expect(config.rootDir).toBe('./');
        expect(config.testMatch).toEqual(['<rootDir>/test/**/*.test.ts']);
        expect(config.testTimeout).toBe(60000);
        expect(config.displayName).toBe('Component Tests');
        expect(config.maxWorkers).toBe(1);
        expect(config.verbose).toBe(true);
        expect(config.setupFilesAfterEnv).toEqual(['<rootDir>/test/setup.ts']);
        expect(config.globalTeardown).toBe('<rootDir>/test/teardown.ts');
    });

    it('should accept testMatch as an array', () => {
        const config = getComponentTestConfig({
            ...requiredOptions,
            testMatch: ['**/a.test.ts', '**/b.test.ts'],
        });

        expect(config.testMatch).toEqual(['**/a.test.ts', '**/b.test.ts']);
    });

    it('should allow overriding rootDir, testTimeout, and displayName', () => {
        const config = getComponentTestConfig({
            ...requiredOptions,
            rootDir: '/custom',
            testTimeout: 120000,
            displayName: 'Integration',
        });

        expect(config.rootDir).toBe('/custom');
        expect(config.testTimeout).toBe(120000);
        expect(config.displayName).toBe('Integration');
    });

    it('should set moduleNameMapper when helpersPath is provided', () => {
        const config = getComponentTestConfig({
            ...requiredOptions,
            helpersPath: '<rootDir>/test/helpers',
        });

        expect(config.moduleNameMapper).toEqual({
            '^@helpers/(.*)$': '<rootDir>/test/helpers/$1',
        });
    });

    it('should NOT set moduleNameMapper when helpersPath is omitted', () => {
        const config = getComponentTestConfig(requiredOptions);

        expect(config.moduleNameMapper).toBeUndefined();
    });

    it('should use custom tsconfigPath in ts-jest transform', () => {
        const config = getComponentTestConfig({
            ...requiredOptions,
            tsconfigPath: '<rootDir>/tsconfig.test.json',
        });

        expect(config.transform).toEqual({
            '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
        });
    });

    it('should default tsconfigPath to <rootDir>/tsconfig.json', () => {
        const config = getComponentTestConfig(requiredOptions);

        expect(config.transform).toEqual({
            '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
        });
    });
});
