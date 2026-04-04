---
name: e2e-screen
description: >
  Interact with UI elements in Detox E2E tests using the screen object from
  @chauhaidang/xq-test-utils. Use when you need to select elements, perform
  actions (tap, type, scroll), assert state, or wait for conditions — for both
  native elements and web-view (WebView) elements.
---

# `e2e-screen` skill

`screen` is the primary interaction surface for Detox E2E tests. It provides
element selectors, actions, assertions, and wait-for helpers for both **native**
React Native elements and **web-view** elements inside a `<WebView>` component.

All Detox globals (`by`, `element`, `expect`, `waitFor`, `web`) are wrapped
internally — consumers never import or reference Detox directly.

---

## Import

```ts
import { screen } from '@chauhaidang/xq-test-utils';
const { by, webBy } = screen;
```

---

## 1. Native selectors — `screen.by`

Build a matcher describing which native element to target. Pass the result to
`screen.element()`, `screen.expect()`, or `screen.waitFor()`.

### Core selectors

| Selector | Signature | Regex | Platform | When to use |
|----------|-----------|-------|----------|-------------|
| `by.id` | `by.id(testId)` | Yes | iOS + Android | **Prefer this.** Targets the `testID` React prop. |
| `by.text` | `by.text(text)` | Yes | iOS + Android | Visible text content. Fragile — avoid in large suites. |
| `by.label` | `by.label(label)` | Yes | iOS + Android | `accessibilityLabel` (iOS) / content description (Android). |
| `by.type` | `by.type(className)` | No | iOS + Android | Native class name (e.g. `'RCTTextView'`, `'android.widget.TextView'`). |
| `by.traits` | `by.traits(traits)` | No | **iOS only** | Accessibility traits array. |

**Supported `by.traits` values:**
`'button'` `'link'` `'header'` `'searchField'` `'image'` `'selected'` `'plays'`
`'key'` `'text'` `'summary'` `'disabled'` `'frequentUpdates'` `'startsMedia'`
`'adjustable'` `'allowsDirectInteraction'` `'pageTurn'`

### Combinators

| Method | Signature | Description |
|--------|-----------|-------------|
| `by.atIndex` | `by.atIndex(matcher, index)` | Pick element at zero-based index from multiple matches. |
| `by.and` | `by.and(matcher, extra)` | Element must satisfy both matchers. |
| `by.withAncestor` | `by.withAncestor(matcher, ancestor)` | Element must be inside `ancestor`. |
| `by.withDescendant` | `by.withDescendant(matcher, descendant)` | Element must contain `descendant`. |

```ts
// Second matching list item
screen.element(by.atIndex(by.id('list-item'), 1)).tap();

// Button inside a specific row
screen.element(by.withAncestor(by.id('edit-btn'), by.id('user-row'))).tap();

// iOS: find a selected button by traits
screen.expect(by.traits(['button', 'selected'])).toBeVisible();
```

---

## 2. Native actions — `screen.element(matcher)`

Returns an `ElementActions` handle for the matched native element.

| Action | Signature | Description |
|--------|-----------|-------------|
| `tap` | `tap()` | Single tap |
| `doubleTap` | `doubleTap()` | Two rapid taps |
| `longPress` | `longPress(durationMs?)` | Extended press |
| `typeText` | `typeText(text)` | Type via system keyboard (simulates keystrokes) |
| `replaceText` | `replaceText(text)` | Replace content without keyboard simulation (faster) |
| `clearText` | `clearText()` | Clear all text from an input |
| `scroll` | `scroll(pixels, direction?)` | Scroll by distance. Direction: `up/down/left/right`. Default: `down`. |
| `scrollTo` | `scrollTo(edge)` | Scroll to edge: `top/bottom/left/right`. |
| `swipe` | `swipe(direction, speed?, offset?)` | Speed: `fast/slow`. Offset: 0–1. Default: `fast`, `0.75`. |

```ts
await screen.element(by.id('email-input')).typeText('user@example.com');
await screen.element(by.id('feed')).scroll(500, 'down');
await screen.element(by.id('login-btn')).tap();
```

---

## 3. Native assertions — `screen.expect(matcher)`

Returns an `ElementExpectations` handle. All assertions are async.

| Assertion | Signature | Description |
|-----------|-----------|-------------|
| `toBeVisible` | `toBeVisible(percent?)` | Element is at least `percent`% visible. Default 75%. |
| `toExist` | `toExist()` | Element is present in the view hierarchy (may be off-screen). |
| `toHaveText` | `toHaveText(text)` | Element displays this exact text. |
| `toHaveLabel` | `toHaveLabel(label)` | Accessibility label matches. |
| `toHaveId` | `toHaveId(id)` | testID matches. |
| `toHaveValue` | `toHaveValue(value)` | Accessibility value matches (slider, toggle). |
| `.not.*` | Prefix any assertion with `.not` | Negate the assertion. |

```ts
await screen.expect(by.id('dashboard-header')).toBeVisible();
await screen.expect(by.id('error-banner')).not.toBeVisible();
await screen.expect(by.id('username-label')).toHaveText('Alice');
```

---

## 4. Native wait-for — `screen.waitFor(matcher)`

Polls until the element reaches a state or the timeout expires.

| Wait | Signature | Description |
|------|-----------|-------------|
| `toBeVisible` | `toBeVisible(opts?)` | Wait until visible |
| `toExist` | `toExist(opts?)` | Wait until in hierarchy |
| `toHaveText` | `toHaveText(text, opts?)` | Wait until text matches |
| `.not.*` | Prefix with `.not` | Wait until condition is NOT true |

**`WaitForOptions`:** `{ timeout?: number }` — default `5000` ms.

```ts
await screen.waitFor(by.id('loading-spinner')).not.toExist();
await screen.waitFor(by.id('home-screen')).toBeVisible({ timeout: 10_000 });
```

---

## 5. Web-view selectors — `screen.webBy`

Use inside a `<WebView>` component only. Pass the result to `screen.webElement()`
or `screen.webExpect()`.

| Selector | Signature | Platform | Description |
|----------|-----------|----------|-------------|
| `webBy.id` | `webBy.id(id)` | iOS + Android | HTML `id` attribute |
| `webBy.className` | `webBy.className(cls)` | iOS + Android | CSS class name |
| `webBy.cssSelector` | `webBy.cssSelector(sel)` | iOS + Android | CSS selector |
| `webBy.name` | `webBy.name(name)` | iOS + Android | `name` attribute (form inputs) |
| `webBy.xpath` | `webBy.xpath(xpath)` | iOS + Android | XPath expression |
| `webBy.tag` | `webBy.tag(tag)` | iOS + Android | HTML tag name |
| `webBy.href` | `webBy.href(href)` | iOS + Android* | Exact href on anchors |
| `webBy.hrefContains` | `webBy.hrefContains(partial)` | iOS + Android* | Partial href on anchors |
| `webBy.value` | `webBy.value(value)` | **iOS only** | `value` attribute |
| `webBy.label` | `webBy.label(label)` | **iOS only** | Label text |
| `webBy.type` | `webBy.type(xcuiType)` | **iOS only** | XCUIElement accessibility type |
| `webBy.atIndex` | `webBy.atIndex(matcher, index)` | **iOS only** | Specific element from multiple matches |

\* Android has limitations with `href` matchers.

---

## 6. Web-view actions — `screen.webElement(matcher)`

Returns a `WebElementActions` handle for the matched web-view element.

| Action | Signature | Description |
|--------|-----------|-------------|
| `tap` | `tap()` | Tap the element |
| `typeText` | `typeText(text)` | Type text via keyboard |
| `replaceText` | `replaceText(text)` | Replace content without keyboard |
| `clearText` | `clearText()` | Clear all text |
| `selectAllText` | `selectAllText()` | Select all text in element |
| `scrollToView` | `scrollToView()` | Scroll web view until element is visible |
| `focus` | `focus()` | Move keyboard focus to element |
| `moveCursorToEnd` | `moveCursorToEnd()` | Move text cursor to end |
| `runScript` | `runScript(script)` | Run JavaScript; returns result |
| `getCurrentUrl` | `getCurrentUrl()` | Returns current web view URL |
| `getTitle` | `getTitle()` | Returns page title |

```ts
await screen.webElement(webBy.id('username')).typeText('alice');
await screen.webElement(webBy.cssSelector('button.submit')).tap();
const url = await screen.webElement(webBy.id('any')).getCurrentUrl();
```

---

## 7. Web-view assertions — `screen.webExpect(matcher)`

Returns a `WebElementExpectations` handle.

| Assertion | Signature | Description |
|-----------|-----------|-------------|
| `toHaveText` | `toHaveText(text)` | Element's text content equals `text` |
| `toExist` | `toExist()` | Element exists in the DOM |
| `toHaveValue` | `toHaveValue(value)` | Element's `value` attribute equals `value` |
| `.not.*` | Prefix with `.not` | Negate the assertion |

```ts
await screen.webExpect(webBy.id('error-msg')).toHaveText('Invalid email');
await screen.webExpect(webBy.cssSelector('.spinner')).not.toExist();
```

---

## Complete test example

```ts
import { App, screen } from '@chauhaidang/xq-test-utils';
const { by, webBy } = screen;

describe('Login flow', () => {
  beforeAll(async () => {
    await App.launch({ newInstance: true });
  });

  afterAll(async () => {
    await App.terminate();
  });

  it('logs in with valid credentials', async () => {
    await screen.element(by.id('email-input')).typeText('user@example.com');
    await screen.element(by.id('password-input')).typeText('password123');
    await screen.element(by.id('login-btn')).tap();

    await screen.waitFor(by.id('dashboard-header')).toBeVisible();
    await screen.expect(by.id('error-banner')).not.toBeVisible();
  });

  it('interacts with embedded terms web view', async () => {
    await screen.element(by.id('terms-link')).tap();
    await screen.waitFor(by.id('webview-container')).toBeVisible();

    // Interact inside the web view
    await screen.webElement(webBy.id('accept-btn')).tap();
    await screen.webExpect(webBy.cssSelector('.confirmation')).toExist();
  });
});
```

---

## Rules for agents using this skill

- Prefer `by.id` over `by.text` — testIDs are stable; visible text changes.
- `by.traits` is **iOS only** — do not use in cross-platform tests.
- `webBy.*` selectors only work inside a `<WebView>` — do not use on native elements.
- `webBy.value`, `webBy.label`, `webBy.type`, `webBy.atIndex` are **iOS only**.
- All `screen.element`, `screen.expect`, `screen.waitFor`, `screen.webElement`,
  and `screen.webExpect` calls must be **awaited**.
- Use `screen.waitFor` when an element appears asynchronously (network, animation).
- Use `screen.expect` for synchronous state assertions after an action completes.
- Never access Detox globals (`by`, `element`, `expect`, `waitFor`, `web`) directly.
