import { logger } from '@chauhaidang/xq-common-kit';
import type { Matcher, ElementExpectations, ElementWaits } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _expect = (matcher: Matcher): any => (globalThis as any).expect((globalThis as any).element(matcher));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _waitFor = (matcher: Matcher): any => (globalThis as any).waitFor((globalThis as any).element(matcher));

const DEFAULT_TIMEOUT = 5_000;

/**
 * Returns an assertion handle for the element matched by `matcher`.
 * Wraps Detox's `expect()` — consumers never call Detox APIs directly.
 *
 * @example
 * import { screen } from '@chauhaidang/xq-test-utils';
 *
 * await screen.expect(screen.by.id('welcome')).toBeVisible();
 * await screen.expect(screen.by.id('error-banner')).not.toBeVisible();
 * await screen.expect(screen.by.id('title')).toHaveText('Home');
 */
export function expectElement(matcher: Matcher): ElementExpectations {
  const build = (negated: boolean): ElementExpectations => {
    const base = () => (negated ? _expect(matcher).not : _expect(matcher));

    const assertions: ElementExpectations = {
      async toBeVisible(percent?: number): Promise<void> {
        logger.debug('[screen.expect] toBeVisible', { negated, percent });
        await base().toBeVisible(percent);
      },

      async toExist(): Promise<void> {
        logger.debug('[screen.expect] toExist', { negated });
        await base().toExist();
      },

      async toHaveText(text: string): Promise<void> {
        logger.debug('[screen.expect] toHaveText', { negated, text });
        await base().toHaveText(text);
      },

      async toHaveLabel(label: string): Promise<void> {
        logger.debug('[screen.expect] toHaveLabel', { negated, label });
        await base().toHaveLabel(label);
      },

      async toHaveId(id: string): Promise<void> {
        logger.debug('[screen.expect] toHaveId', { negated, id });
        await base().toHaveId(id);
      },

      async toHaveValue(value: string): Promise<void> {
        logger.debug('[screen.expect] toHaveValue', { negated, value });
        await base().toHaveValue(value);
      },

      get not(): Omit<ElementExpectations, 'not'> {
        return build(true);
      },
    };

    return assertions;
  };

  return build(false);
}

/**
 * Returns a wait-for handle for the element matched by `matcher`.
 * Wraps Detox's `waitFor()` — consumers never call Detox APIs directly.
 *
 * @example
 * import { screen } from '@chauhaidang/xq-test-utils';
 *
 * // Wait up to 5 s for a spinner to disappear
 * await screen.waitFor(screen.by.id('spinner')).not.toExist();
 *
 * // Custom timeout
 * await screen.waitFor(screen.by.id('dashboard')).toBeVisible({ timeout: 10_000 });
 */
export function waitForElement(matcher: Matcher): ElementWaits {
  const build = (negated: boolean): ElementWaits => {
    const base = () => (negated ? _waitFor(matcher).not : _waitFor(matcher));

    const waits: ElementWaits = {
      async toBeVisible({ timeout = DEFAULT_TIMEOUT } = {}): Promise<void> {
        logger.debug('[screen.waitFor] toBeVisible', { negated, timeout });
        await base().toBeVisible().withTimeout(timeout);
      },

      async toExist({ timeout = DEFAULT_TIMEOUT } = {}): Promise<void> {
        logger.debug('[screen.waitFor] toExist', { negated, timeout });
        await base().toExist().withTimeout(timeout);
      },

      async toHaveText(text: string, { timeout = DEFAULT_TIMEOUT } = {}): Promise<void> {
        logger.debug('[screen.waitFor] toHaveText', { negated, text, timeout });
        await base().toHaveText(text).withTimeout(timeout);
      },

      get not(): Omit<ElementWaits, 'not'> {
        return build(true);
      },
    };

    return waits;
  };

  return build(false);
}
