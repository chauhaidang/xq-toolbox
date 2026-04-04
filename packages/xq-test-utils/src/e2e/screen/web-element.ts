import { logger } from '@chauhaidang/xq-common-kit';
import type { WebMatcher, WebElementActions, WebElementExpectations } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _webEl = (matcher: WebMatcher): any => (globalThis as any).web.element(matcher);

/**
 * Returns an interaction handle for the web-view element matched by `matcher`.
 * All actions are logged via xq-common-kit logger for debugging.
 *
 * Use `screen.webBy.*` to build the matcher, then pass it here.
 *
 * @example
 * import { screen } from '@chauhaidang/xq-test-utils';
 *
 * await screen.webElement(screen.webBy.id('username')).typeText('alice');
 * await screen.webElement(screen.webBy.cssSelector('button.submit')).tap();
 */
export function getWebElement(matcher: WebMatcher): WebElementActions {
  return {
    async tap(): Promise<void> {
      logger.debug('[screen.webElement] tap', { matcher });
      await _webEl(matcher).tap();
    },

    async typeText(text: string): Promise<void> {
      logger.debug('[screen.webElement] typeText', { matcher, text });
      await _webEl(matcher).typeText(text);
    },

    async replaceText(text: string): Promise<void> {
      logger.debug('[screen.webElement] replaceText', { matcher, text });
      await _webEl(matcher).replaceText(text);
    },

    async clearText(): Promise<void> {
      logger.debug('[screen.webElement] clearText', { matcher });
      await _webEl(matcher).clearText();
    },

    async selectAllText(): Promise<void> {
      logger.debug('[screen.webElement] selectAllText', { matcher });
      await _webEl(matcher).selectAllText();
    },

    async scrollToView(): Promise<void> {
      logger.debug('[screen.webElement] scrollToView', { matcher });
      await _webEl(matcher).scrollToView();
    },

    async focus(): Promise<void> {
      logger.debug('[screen.webElement] focus', { matcher });
      await _webEl(matcher).focus();
    },

    async moveCursorToEnd(): Promise<void> {
      logger.debug('[screen.webElement] moveCursorToEnd', { matcher });
      await _webEl(matcher).moveCursorToEnd();
    },

    async runScript(script: string): Promise<unknown> {
      logger.debug('[screen.webElement] runScript', { matcher });
      return _webEl(matcher).runScript(script);
    },

    async getCurrentUrl(): Promise<string> {
      logger.debug('[screen.webElement] getCurrentUrl');
      return _webEl(matcher).getCurrentUrl();
    },

    async getTitle(): Promise<string> {
      logger.debug('[screen.webElement] getTitle');
      return _webEl(matcher).getTitle();
    },
  };
}

/**
 * Returns an assertion handle for the web-view element matched by `matcher`.
 * Wraps Detox's `web.element().expect()` — consumers never call Detox APIs directly.
 *
 * @example
 * import { screen } from '@chauhaidang/xq-test-utils';
 *
 * await screen.webExpect(screen.webBy.id('error-msg')).toHaveText('Invalid email');
 * await screen.webExpect(screen.webBy.cssSelector('.spinner')).not.toExist();
 */
export function expectWebElement(matcher: WebMatcher): WebElementExpectations {
  const build = (negated: boolean): WebElementExpectations => {
    const base = () => (negated ? _webEl(matcher).not : _webEl(matcher));

    const assertions: WebElementExpectations = {
      async toHaveText(text: string): Promise<void> {
        logger.debug('[screen.webExpect] toHaveText', { negated, text });
        await base().toHaveText(text);
      },

      async toExist(): Promise<void> {
        logger.debug('[screen.webExpect] toExist', { negated });
        await base().toExist();
      },

      async toHaveValue(value: string): Promise<void> {
        logger.debug('[screen.webExpect] toHaveValue', { negated, value });
        await base().toHaveValue(value);
      },

      get not(): Omit<WebElementExpectations, 'not'> {
        return build(true);
      },
    };

    return assertions;
  };

  return build(false);
}
