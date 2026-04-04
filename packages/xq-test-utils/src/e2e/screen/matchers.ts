import type { Matcher, WebMatcher } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _by = (): any => (globalThis as any).by;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _byWeb = (): any => (globalThis as any).by.web;

// ─── Native element matchers ─────────────────────────────────────────────────

/**
 * Native element selector builders.
 * Use these to describe which native element to target, then pass the result to
 * `screen.element()`, `screen.expect()`, or `screen.waitFor()`.
 *
 * @example
 * import { screen } from '@chauhaidang/xq-test-utils';
 * const { by } = screen;
 *
 * // Find by testID (most reliable — prefer this)
 * screen.element(by.id('submit-button')).tap();
 *
 * // Find by visible text
 * screen.expect(by.text('Sign in')).toBeVisible();
 *
 * // Narrow down when multiple elements match
 * screen.element(by.atIndex(by.id('list-item'), 2)).tap();
 */
export const by = {
  /**
   * Match by testID prop (most reliable selector — prefer over text/label).
   * Supports regex.
   */
  id: (testId: string | RegExp): Matcher => _by().id(testId),

  /**
   * Match by visible text content. Supports regex.
   * Less stable than `by.id` — avoid in performance-sensitive suites.
   */
  text: (text: string | RegExp): Matcher => _by().text(text),

  /**
   * Match by accessibility label (iOS: accessibilityLabel, Android: contentDescription).
   * Supports regex.
   */
  label: (label: string | RegExp): Matcher => _by().label(label),

  /**
   * Match by native component class name. No regex support.
   * iOS examples: 'RCTTextView', 'RCTImageView'
   * Android examples: 'android.widget.TextView', 'android.widget.ImageView'
   */
  type: (className: string): Matcher => _by().type(className),

  /**
   * iOS only. Match by accessibility traits.
   * Pass one or more trait strings; the element must have all of them.
   *
   * Supported traits: 'button' | 'link' | 'header' | 'searchField' |
   *   'image' | 'selected' | 'plays' | 'key' | 'text' | 'summary' |
   *   'disabled' | 'frequentUpdates' | 'startsMedia' | 'adjustable' |
   *   'allowsDirectInteraction' | 'pageTurn'
   *
   * @example
   * screen.expect(by.traits(['button', 'selected'])).toBeVisible();
   */
  traits: (traits: string[]): Matcher => _by().traits(traits),

  /**
   * Narrow a matcher to a specific index when multiple elements match.
   * @example screen.element(by.atIndex(by.id('item'), 0))  // first match
   */
  atIndex: (matcher: Matcher, index: number): Matcher =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (matcher as any).atIndex(index),

  /**
   * Logical AND: element must satisfy both matchers.
   * @example by.and(by.id('input'), by.text('Email'))
   */
  and: (matcher: Matcher, additional: Matcher): Matcher =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (matcher as any).and(additional),

  /**
   * Match elements that are descendants of a specific ancestor element.
   * @example by.withAncestor(by.id('row-btn'), by.id('user-row'))
   */
  withAncestor: (matcher: Matcher, ancestor: Matcher): Matcher =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (matcher as any).withAncestor(ancestor),

  /**
   * Match elements that contain a specific descendant element.
   * @example by.withDescendant(by.id('parent'), by.id('child-badge'))
   */
  withDescendant: (matcher: Matcher, descendant: Matcher): Matcher =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (matcher as any).withDescendant(descendant),
};

// ─── Web-view element matchers ───────────────────────────────────────────────

/**
 * Web-view element selector builders.
 * Use these to describe elements inside a `<WebView>` component, then pass
 * the result to `screen.webElement()` or `screen.webExpect()`.
 *
 * NOTE: These matchers only work inside a React Native WebView rendered by
 * the app — they do not apply to native elements.
 *
 * @example
 * import { screen } from '@chauhaidang/xq-test-utils';
 * const { webBy } = screen;
 *
 * await screen.webElement(webBy.id('username')).typeText('alice');
 * await screen.webExpect(webBy.cssSelector('button.submit')).toExist();
 */
export const webBy = {
  /**
   * Match web element by HTML `id` attribute. iOS + Android.
   * @example webBy.id('submit-form')
   */
  id: (id: string): WebMatcher => _byWeb().id(id),

  /**
   * Match web element by CSS class name. iOS + Android.
   * @example webBy.className('submit-btn')
   */
  className: (className: string): WebMatcher => _byWeb().className(className),

  /**
   * Match web element by CSS selector. iOS + Android.
   * @example webBy.cssSelector('button[type="submit"]')
   */
  cssSelector: (selector: string): WebMatcher => _byWeb().cssSelector(selector),

  /**
   * Match form input by `name` attribute. iOS + Android.
   * @example webBy.name('email')
   */
  name: (name: string): WebMatcher => _byWeb().name(name),

  /**
   * Match web element by XPath expression. iOS + Android.
   * @example webBy.xpath('//button[@type="submit"]')
   */
  xpath: (xpath: string): WebMatcher => _byWeb().xpath(xpath),

  /**
   * Match web element by HTML tag name. iOS + Android.
   * @example webBy.tag('input')
   */
  tag: (tag: string): WebMatcher => _byWeb().tag(tag),

  /**
   * Match anchor element by exact href. iOS + Android (Android has limitations).
   * @example webBy.href('https://example.com/terms')
   */
  href: (href: string): WebMatcher => _byWeb().href(href),

  /**
   * Match anchor element where href contains the given string. iOS + Android.
   * @example webBy.hrefContains('example.com')
   */
  hrefContains: (partial: string): WebMatcher => _byWeb().hrefContains(partial),

  /**
   * iOS only. Match web element by `value` attribute.
   * @example webBy.value('submit')
   */
  value: (value: string): WebMatcher => _byWeb().value(value),

  /**
   * iOS only. Match web element by label text.
   * @example webBy.label('Username')
   */
  label: (label: string): WebMatcher => _byWeb().label(label),

  /**
   * iOS only. Match web element by XCUIElement accessibility type.
   * @example webBy.type('XCUIElementTypeButton')
   */
  type: (xcuiType: string): WebMatcher => _byWeb().type(xcuiType),

  /**
   * Select a specific element when multiple web elements match.
   * iOS only when used with web matchers.
   * @example webBy.atIndex(webBy.tag('input'), 0)  // first <input>
   */
  atIndex: (matcher: WebMatcher, index: number): WebMatcher =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (matcher as any).atIndex(index),
};
