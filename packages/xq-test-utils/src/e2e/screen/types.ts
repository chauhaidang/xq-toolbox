/**
 * An opaque handle representing a Detox matcher.
 * Obtained from `screen.by.*` and passed to `screen.element()`,
 * `screen.expect()`, or `screen.waitFor()`.
 *
 * Consumers never interact with the underlying Detox type directly.
 */
export type Matcher = unknown;

export type ScrollDirection = 'up' | 'down' | 'left' | 'right';
export type SwipeSpeed = 'fast' | 'slow';
export type ScrollEdge = 'top' | 'bottom' | 'left' | 'right';

export interface ElementActions {
  /** Single tap at the element's activation point. */
  tap(): Promise<void>;
  /** Double tap. */
  doubleTap(): Promise<void>;
  /** Long press, optionally with a custom duration in ms. */
  longPress(durationMs?: number): Promise<void>;
  /**
   * Type text via the system keyboard.
   * Simulates key events; slower but most realistic.
   */
  typeText(text: string): Promise<void>;
  /** Replace all text without simulating key events. */
  replaceText(text: string): Promise<void>;
  /** Clear all text in a text input. */
  clearText(): Promise<void>;
  /**
   * Scroll the element by `pixels` in the given direction.
   * @param pixels - Scroll distance in points.
   */
  scroll(pixels: number, direction?: ScrollDirection): Promise<void>;
  /**
   * Scroll the element until its edge (top/bottom/left/right) is visible.
   */
  scrollTo(edge: ScrollEdge): Promise<void>;
  /**
   * Swipe gesture on the element.
   * @param normalizedOffset - Distance as fraction of the element size, 0–1. Default 0.75.
   */
  swipe(direction: ScrollDirection, speed?: SwipeSpeed, normalizedOffset?: number): Promise<void>;
}

export interface ElementExpectations {
  /** Assert the element is at least `percent`% visible. Default threshold: 75%. */
  toBeVisible(percent?: number): Promise<void>;
  /** Assert the element is present in the view hierarchy (may be off-screen). */
  toExist(): Promise<void>;
  /** Assert the element's text equals `text`. */
  toHaveText(text: string): Promise<void>;
  /** Assert the element's accessibility label equals `label`. */
  toHaveLabel(label: string): Promise<void>;
  /** Assert the element's accessibility identifier (testID) equals `id`. */
  toHaveId(id: string): Promise<void>;
  /** Assert the element's accessibility value equals `value`. */
  toHaveValue(value: string): Promise<void>;
  /** Negate the next assertion. */
  readonly not: Omit<ElementExpectations, 'not'>;
}

export interface WaitForOptions {
  /** How long to wait before failing, in milliseconds. @default 5000 */
  timeout?: number;
}

export interface ElementWaits {
  /** Wait until the element is at least `percent`% visible. */
  toBeVisible(options?: WaitForOptions): Promise<void>;
  /** Wait until the element exists in the hierarchy. */
  toExist(options?: WaitForOptions): Promise<void>;
  /** Wait until the element's text equals `text`. */
  toHaveText(text: string, options?: WaitForOptions): Promise<void>;
  /** Negate: wait until the condition is NOT true. */
  readonly not: Omit<ElementWaits, 'not'>;
}

// ─── Web-view types ───────────────────────────────────────────────────────────

/**
 * An opaque handle representing a Detox web-view matcher.
 * Obtained from `screen.webBy.*` and passed to `screen.webElement()` or
 * `screen.webExpect()`.
 *
 * Consumers never interact with the underlying Detox type directly.
 */
export type WebMatcher = unknown;

export interface WebElementActions {
  /** Tap the web element. */
  tap(): Promise<void>;
  /** Type text via the system keyboard. */
  typeText(text: string): Promise<void>;
  /** Replace element content without simulating key events. */
  replaceText(text: string): Promise<void>;
  /** Clear all text in the element. */
  clearText(): Promise<void>;
  /** Select all text in the element. */
  selectAllText(): Promise<void>;
  /** Scroll the web view until the element is visible. */
  scrollToView(): Promise<void>;
  /** Move keyboard focus to the element. */
  focus(): Promise<void>;
  /** Move the text cursor to the end of the content. */
  moveCursorToEnd(): Promise<void>;
  /** Run arbitrary JavaScript inside the web view and return the result. */
  runScript(script: string): Promise<unknown>;
  /** Returns the current URL of the web view. */
  getCurrentUrl(): Promise<string>;
  /** Returns the page title of the web view. */
  getTitle(): Promise<string>;
}

export interface WebElementExpectations {
  /** Assert the element's text content equals `text`. */
  toHaveText(text: string): Promise<void>;
  /** Assert the element exists in the web view DOM. */
  toExist(): Promise<void>;
  /** Assert the element's value attribute equals `value`. */
  toHaveValue(value: string): Promise<void>;
  /** Negate the next assertion. */
  readonly not: Omit<WebElementExpectations, 'not'>;
}
