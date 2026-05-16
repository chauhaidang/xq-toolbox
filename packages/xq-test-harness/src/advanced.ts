import { mergeTests } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

export { mergeTests };

/**
 * Escape hatch: bind playwright-bdd to a custom extended `test` (e.g. after `mergeTests`).
 */
export function createHarnessBdd(customTest: Parameters<typeof createBdd>[0]) {
  return createBdd(customTest);
}
