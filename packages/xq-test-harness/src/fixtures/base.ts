import { test as bddBaseTest } from 'playwright-bdd';
import { expect } from '@playwright/test';

/**
 * Mergeable type map for API clients. The harness exports an empty interface;
 * consumers augment it with declaration merging and must populate matching
 * keys on `xq.apis` in `bdd-world.ts` via `test.extend` (augmentation alone
 * does not create instances).
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- intentional merge target for declare module
export interface XQApiClients {}

/**
 * XQ-specific test context (logging, tracing placeholders, etc.).
 * `apis` starts as `{}` at runtime; consumers merge implementations that
 * align with their augmented `XQApiClients`.
 */
export type XQFixture = {
  apis: XQApiClients;
  kafka: object;
  redis: object;
  postgres: object;
  http: object;
  tracing: object;
  logging: {
    info: (message: string) => void;
    error: (message: string) => void;
    warn: (message: string) => void;
  };
  metrics: object;
};

/**
 * Canonical extended `test`: playwright-bdd runtime + reserved `xq` fixture.
 * Uses Playwright’s built-in `request` and other fixtures unchanged — configure API `baseURL` via `use.baseURL` in config (often from `process.env`).
 */
export const test = bddBaseTest.extend<{ xq: XQFixture }>({
  // Playwright requires object destructuring for fixture dependencies; none used yet.
  // eslint-disable-next-line no-empty-pattern -- xq placeholder has no parent deps
  xq: async ({}, use) => {
    await use({
      apis: {},
      kafka: {},
      redis: {},
      postgres: {},
      http: {},
      tracing: {},
      logging: {
        info: (message: string) => {
          console.log(message);
        },
        error: (message: string) => {
          console.error(message);
        },
        warn: (message: string) => {
          console.warn(message);
        },
      },
      metrics: {},
    });
  },
});

export { expect };
