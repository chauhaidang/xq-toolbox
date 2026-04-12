// Database
export {
  PostgresDatabaseHelper,
  DatabaseHelper,
  createDatabaseHelper,
} from './database';
export type { IDatabaseHelper, DatabaseConfig, HealthCheckResult } from './database';

// Service readiness
export { waitForService } from './service-readiness';
export type { WaitForServiceOptions } from './service-readiness';

// Reporting
export { JunitMarkdownReporter, generateTestReport } from './reporting';
export type { ITestReporter, GenerateTestReportOptions } from './reporting';

// Test config
export { getComponentTestConfig } from './test-config';
export type { ComponentTestConfigOptions } from './test-config';

// E2E (Detox) — iOS simulator helpers
export { createDetoxConfig, createE2eJestConfig } from './e2e/config';
export type { DetoxConfigOptions, E2eJestConfigOptions } from './e2e/config';

export { App } from './e2e/app';
export type { LaunchOptions } from './e2e/app';

export { screen } from './e2e/screen';
export type { Matcher, WebMatcher } from './e2e/screen';
