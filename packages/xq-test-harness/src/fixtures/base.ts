import { test as bddBaseTest } from 'playwright-bdd';
import { expect } from '@playwright/test';

/**
 * Placeholder for future XQ-specific test context (shared clients, auth, tracing, etc.).
 * Steps may accept `{ xq }` today for forward compatibility; the value is an empty object.
 */
export type XQFixture = Record<string, never>;

/**
 * Canonical extended `test`: playwright-bdd runtime + reserved `xq` fixture.
 * Uses Playwright’s built-in `request` and other fixtures unchanged — configure API `baseURL` via `use.baseURL` in config (often from `process.env`).
 */
export const test = bddBaseTest.extend<{ xq: XQFixture }>({
  // Playwright requires object destructuring for fixture dependencies; none used yet.
  // eslint-disable-next-line no-empty-pattern -- xq placeholder has no parent deps
  xq: async ({}, use) => {
    await use({} as XQFixture);
  },
});

export { expect };
