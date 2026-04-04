import { logger } from '@chauhaidang/xq-common-kit';
import type { Matcher, ElementActions, ScrollDirection, ScrollEdge, SwipeSpeed } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _el = (matcher: Matcher): any => (globalThis as any).element(matcher);

/**
 * Returns an interaction handle for the element matched by `matcher`.
 * All actions are logged via xq-common-kit logger for debugging.
 *
 * @example
 * import { screen } from '@chauhaidang/xq-test-utils';
 *
 * await screen.element(screen.by.id('submit-btn')).tap();
 * await screen.element(screen.by.id('email-input')).typeText('user@example.com');
 * await screen.element(screen.by.id('feed')).scroll(300, 'down');
 */
export function getElement(matcher: Matcher): ElementActions {
  return {
    async tap(): Promise<void> {
      logger.debug('[screen] tap', { matcher });
      await _el(matcher).tap();
    },

    async doubleTap(): Promise<void> {
      logger.debug('[screen] doubleTap', { matcher });
      await _el(matcher).multiTap(2);
    },

    async longPress(durationMs?: number): Promise<void> {
      logger.debug('[screen] longPress', { matcher, durationMs });
      await _el(matcher).longPress(undefined, durationMs);
    },

    async typeText(text: string): Promise<void> {
      logger.debug('[screen] typeText', { matcher, text });
      await _el(matcher).typeText(text);
    },

    async replaceText(text: string): Promise<void> {
      logger.debug('[screen] replaceText', { matcher, text });
      await _el(matcher).replaceText(text);
    },

    async clearText(): Promise<void> {
      logger.debug('[screen] clearText', { matcher });
      await _el(matcher).clearText();
    },

    async scroll(pixels: number, direction: ScrollDirection = 'down'): Promise<void> {
      logger.debug('[screen] scroll', { matcher, pixels, direction });
      await _el(matcher).scroll(pixels, direction);
    },

    async scrollTo(edge: ScrollEdge): Promise<void> {
      logger.debug('[screen] scrollTo', { matcher, edge });
      await _el(matcher).scrollTo(edge);
    },

    async swipe(
      direction: ScrollDirection,
      speed: SwipeSpeed = 'fast',
      normalizedOffset = 0.75,
    ): Promise<void> {
      logger.debug('[screen] swipe', { matcher, direction, speed, normalizedOffset });
      await _el(matcher).swipe(direction, speed, normalizedOffset);
    },
  };
}
