import { screen } from '../e2e/screen';

// Capture Jest's expect before beforeAll overwrites globalThis.expect with a Detox mock
const jestExpect = expect;

// ─── Detox global mocks ───────────────────────────────────────────────────────

const mockTap = jest.fn().mockResolvedValue(undefined);
const mockMultiTap = jest.fn().mockResolvedValue(undefined);
const mockLongPress = jest.fn().mockResolvedValue(undefined);
const mockTypeText = jest.fn().mockResolvedValue(undefined);
const mockReplaceText = jest.fn().mockResolvedValue(undefined);
const mockClearText = jest.fn().mockResolvedValue(undefined);
const mockScroll = jest.fn().mockResolvedValue(undefined);
const mockScrollTo = jest.fn().mockResolvedValue(undefined);
const mockSwipe = jest.fn().mockResolvedValue(undefined);

const mockElementHandle = {
  tap: mockTap,
  multiTap: mockMultiTap,
  longPress: mockLongPress,
  typeText: mockTypeText,
  replaceText: mockReplaceText,
  clearText: mockClearText,
  scroll: mockScroll,
  scrollTo: mockScrollTo,
  swipe: mockSwipe,
};

const mockWithTimeout = jest.fn().mockResolvedValue(undefined);
const makeExpectHandle = (negated = false): any => {
  const handle: any = {
    toBeVisible: jest.fn().mockReturnValue({ withTimeout: mockWithTimeout }),
    toExist: jest.fn().mockReturnValue({ withTimeout: mockWithTimeout }),
    toHaveText: jest.fn().mockReturnValue({ withTimeout: mockWithTimeout }),
    toHaveLabel: jest.fn().mockResolvedValue(undefined),
    toHaveId: jest.fn().mockResolvedValue(undefined),
    toHaveValue: jest.fn().mockResolvedValue(undefined),
  };
  if (!negated) handle.not = makeExpectHandle(true);
  return handle;
};

const mockExpectHandle = makeExpectHandle();

const mockByHandle = {
  id: jest.fn().mockReturnValue('matcher-id'),
  text: jest.fn().mockReturnValue('matcher-text'),
  label: jest.fn().mockReturnValue('matcher-label'),
  type: jest.fn().mockReturnValue('matcher-type'),
  traits: jest.fn().mockReturnValue('matcher-traits'),
  atIndex: jest.fn().mockReturnThis(),
  and: jest.fn().mockReturnThis(),
  withAncestor: jest.fn().mockReturnThis(),
  withDescendant: jest.fn().mockReturnThis(),
  web: {
    id: jest.fn().mockReturnValue('web-matcher-id'),
    className: jest.fn().mockReturnValue('web-matcher-class'),
    cssSelector: jest.fn().mockReturnValue('web-matcher-css'),
    name: jest.fn().mockReturnValue('web-matcher-name'),
    xpath: jest.fn().mockReturnValue('web-matcher-xpath'),
    tag: jest.fn().mockReturnValue('web-matcher-tag'),
    href: jest.fn().mockReturnValue('web-matcher-href'),
    hrefContains: jest.fn().mockReturnValue('web-matcher-hrefContains'),
    value: jest.fn().mockReturnValue('web-matcher-value'),
    label: jest.fn().mockReturnValue('web-matcher-label'),
    type: jest.fn().mockReturnValue('web-matcher-type'),
  },
};

// Web element action mocks
const mockWebTap = jest.fn().mockResolvedValue(undefined);
const mockWebTypeText = jest.fn().mockResolvedValue(undefined);
const mockWebReplaceText = jest.fn().mockResolvedValue(undefined);
const mockWebClearText = jest.fn().mockResolvedValue(undefined);
const mockWebSelectAllText = jest.fn().mockResolvedValue(undefined);
const mockWebScrollToView = jest.fn().mockResolvedValue(undefined);
const mockWebFocus = jest.fn().mockResolvedValue(undefined);
const mockWebMoveCursorToEnd = jest.fn().mockResolvedValue(undefined);
const mockWebRunScript = jest.fn().mockResolvedValue('script-result');
const mockWebGetCurrentUrl = jest.fn().mockResolvedValue('https://example.com');
const mockWebGetTitle = jest.fn().mockResolvedValue('Page Title');
const mockWebToHaveText = jest.fn().mockResolvedValue(undefined);
const mockWebToExist = jest.fn().mockResolvedValue(undefined);
const mockWebToHaveValue = jest.fn().mockResolvedValue(undefined);

const makeWebExpectHandle = (negated = false): any => {
  const handle: any = {
    toHaveText: mockWebToHaveText,
    toExist: mockWebToExist,
    toHaveValue: mockWebToHaveValue,
  };
  if (!negated) handle.not = makeWebExpectHandle(true);
  return handle;
};

const mockWebExpectHandle = makeWebExpectHandle();

const mockWebElementHandle = {
  tap: mockWebTap,
  typeText: mockWebTypeText,
  replaceText: mockWebReplaceText,
  clearText: mockWebClearText,
  selectAllText: mockWebSelectAllText,
  scrollToView: mockWebScrollToView,
  focus: mockWebFocus,
  moveCursorToEnd: mockWebMoveCursorToEnd,
  runScript: mockWebRunScript,
  getCurrentUrl: mockWebGetCurrentUrl,
  getTitle: mockWebGetTitle,
  toHaveText: mockWebToHaveText,
  toExist: mockWebToExist,
  toHaveValue: mockWebToHaveValue,
  not: mockWebExpectHandle.not,
};

beforeAll(() => {
  (globalThis as any).by = mockByHandle;
  (globalThis as any).element = jest.fn().mockReturnValue(mockElementHandle);
  (globalThis as any).expect = jest.fn().mockReturnValue(mockExpectHandle);
  (globalThis as any).waitFor = jest.fn().mockReturnValue(mockExpectHandle);
  (globalThis as any).web = { element: jest.fn().mockReturnValue(mockWebElementHandle) };
});

afterAll(() => {
  ['by', 'element', 'expect', 'waitFor', 'web'].forEach((k) => delete (globalThis as any)[k]);
});

beforeEach(() => jest.clearAllMocks());

// ─── screen.by ───────────────────────────────────────────────────────────────

describe('screen.by', () => {
  it('by.id delegates to Detox by.id', () => {
    screen.by.id('btn');
    jestExpect(mockByHandle.id).toHaveBeenCalledWith('btn');
  });

  it('by.text delegates to Detox by.text', () => {
    screen.by.text('Submit');
    jestExpect(mockByHandle.text).toHaveBeenCalledWith('Submit');
  });

  it('by.label delegates to Detox by.label', () => {
    screen.by.label('Close button');
    jestExpect(mockByHandle.label).toHaveBeenCalledWith('Close button');
  });

  it('by.type delegates to Detox by.type', () => {
    screen.by.type('RCTTextView');
    jestExpect(mockByHandle.type).toHaveBeenCalledWith('RCTTextView');
  });

  it('by.traits delegates to Detox by.traits with array', () => {
    screen.by.traits(['button', 'selected']);
    jestExpect(mockByHandle.traits).toHaveBeenCalledWith(['button', 'selected']);
  });
});

// ─── screen.element actions ───────────────────────────────────────────────────

describe('screen.element', () => {
  const matcher = 'matcher-id';

  it('tap calls element.tap()', async () => {
    await screen.element(matcher).tap();
    jestExpect(mockTap).toHaveBeenCalledTimes(1);
  });

  it('doubleTap calls element.multiTap(2)', async () => {
    await screen.element(matcher).doubleTap();
    jestExpect(mockMultiTap).toHaveBeenCalledWith(2);
  });

  it('longPress calls element.longPress with duration', async () => {
    await screen.element(matcher).longPress(800);
    jestExpect(mockLongPress).toHaveBeenCalledWith(undefined, 800);
  });

  it('typeText calls element.typeText', async () => {
    await screen.element(matcher).typeText('hello');
    jestExpect(mockTypeText).toHaveBeenCalledWith('hello');
  });

  it('replaceText calls element.replaceText', async () => {
    await screen.element(matcher).replaceText('world');
    jestExpect(mockReplaceText).toHaveBeenCalledWith('world');
  });

  it('clearText calls element.clearText', async () => {
    await screen.element(matcher).clearText();
    jestExpect(mockClearText).toHaveBeenCalledTimes(1);
  });

  it('scroll calls element.scroll with pixels and direction', async () => {
    await screen.element(matcher).scroll(300, 'down');
    jestExpect(mockScroll).toHaveBeenCalledWith(300, 'down');
  });

  it('scroll defaults direction to "down"', async () => {
    await screen.element(matcher).scroll(200);
    jestExpect(mockScroll).toHaveBeenCalledWith(200, 'down');
  });

  it('scrollTo calls element.scrollTo with edge', async () => {
    await screen.element(matcher).scrollTo('bottom');
    jestExpect(mockScrollTo).toHaveBeenCalledWith('bottom');
  });

  it('swipe calls element.swipe with defaults', async () => {
    await screen.element(matcher).swipe('up');
    jestExpect(mockSwipe).toHaveBeenCalledWith('up', 'fast', 0.75);
  });
});

// ─── screen.expect assertions ─────────────────────────────────────────────────

describe('screen.expect', () => {
  const matcher = 'matcher-id';

  it('toBeVisible calls expect().toBeVisible()', async () => {
    await screen.expect(matcher).toBeVisible();
    jestExpect(mockExpectHandle.toBeVisible).toHaveBeenCalled();
  });

  it('not.toBeVisible calls expect().not.toBeVisible()', async () => {
    await screen.expect(matcher).not.toBeVisible();
    jestExpect(mockExpectHandle.not.toBeVisible).toHaveBeenCalled();
  });

  it('toHaveText calls expect().toHaveText()', async () => {
    await screen.expect(matcher).toHaveText('Hello');
    jestExpect(mockExpectHandle.toHaveText).toHaveBeenCalledWith('Hello');
  });
});

// ─── screen.waitFor ───────────────────────────────────────────────────────────

describe('screen.waitFor', () => {
  const matcher = 'matcher-id';

  it('toBeVisible calls waitFor().toBeVisible().withTimeout()', async () => {
    await screen.waitFor(matcher).toBeVisible({ timeout: 3000 });
    jestExpect(mockExpectHandle.toBeVisible).toHaveBeenCalled();
    jestExpect(mockWithTimeout).toHaveBeenCalledWith(3000);
  });

  it('uses 5000 ms default timeout', async () => {
    await screen.waitFor(matcher).toBeVisible();
    jestExpect(mockWithTimeout).toHaveBeenCalledWith(5000);
  });

  it('not.toExist calls waitFor().not.toExist().withTimeout()', async () => {
    await screen.waitFor(matcher).not.toExist();
    jestExpect(mockExpectHandle.not.toExist).toHaveBeenCalled();
    jestExpect(mockWithTimeout).toHaveBeenCalledWith(5000);
  });
});

// ─── screen.webBy ─────────────────────────────────────────────────────────────

describe('screen.webBy', () => {
  it('webBy.id delegates to Detox by.web.id', () => {
    screen.webBy.id('form-email');
    jestExpect(mockByHandle.web.id).toHaveBeenCalledWith('form-email');
  });

  it('webBy.className delegates to Detox by.web.className', () => {
    screen.webBy.className('submit-btn');
    jestExpect(mockByHandle.web.className).toHaveBeenCalledWith('submit-btn');
  });

  it('webBy.cssSelector delegates to Detox by.web.cssSelector', () => {
    screen.webBy.cssSelector('button[type="submit"]');
    jestExpect(mockByHandle.web.cssSelector).toHaveBeenCalledWith('button[type="submit"]');
  });

  it('webBy.name delegates to Detox by.web.name', () => {
    screen.webBy.name('email');
    jestExpect(mockByHandle.web.name).toHaveBeenCalledWith('email');
  });

  it('webBy.xpath delegates to Detox by.web.xpath', () => {
    screen.webBy.xpath('//button[@type="submit"]');
    jestExpect(mockByHandle.web.xpath).toHaveBeenCalledWith('//button[@type="submit"]');
  });

  it('webBy.tag delegates to Detox by.web.tag', () => {
    screen.webBy.tag('input');
    jestExpect(mockByHandle.web.tag).toHaveBeenCalledWith('input');
  });

  it('webBy.href delegates to Detox by.web.href', () => {
    screen.webBy.href('https://example.com/terms');
    jestExpect(mockByHandle.web.href).toHaveBeenCalledWith('https://example.com/terms');
  });

  it('webBy.hrefContains delegates to Detox by.web.hrefContains', () => {
    screen.webBy.hrefContains('example.com');
    jestExpect(mockByHandle.web.hrefContains).toHaveBeenCalledWith('example.com');
  });

  it('webBy.value delegates to Detox by.web.value', () => {
    screen.webBy.value('submit');
    jestExpect(mockByHandle.web.value).toHaveBeenCalledWith('submit');
  });

  it('webBy.label delegates to Detox by.web.label', () => {
    screen.webBy.label('Username');
    jestExpect(mockByHandle.web.label).toHaveBeenCalledWith('Username');
  });

  it('webBy.type delegates to Detox by.web.type', () => {
    screen.webBy.type('XCUIElementTypeButton');
    jestExpect(mockByHandle.web.type).toHaveBeenCalledWith('XCUIElementTypeButton');
  });
});

// ─── screen.webElement actions ────────────────────────────────────────────────

describe('screen.webElement', () => {
  const webMatcher = 'web-matcher-id';

  it('tap calls web.element().tap()', async () => {
    await screen.webElement(webMatcher).tap();
    jestExpect(mockWebTap).toHaveBeenCalledTimes(1);
  });

  it('typeText calls web.element().typeText()', async () => {
    await screen.webElement(webMatcher).typeText('hello@example.com');
    jestExpect(mockWebTypeText).toHaveBeenCalledWith('hello@example.com');
  });

  it('replaceText calls web.element().replaceText()', async () => {
    await screen.webElement(webMatcher).replaceText('new text');
    jestExpect(mockWebReplaceText).toHaveBeenCalledWith('new text');
  });

  it('clearText calls web.element().clearText()', async () => {
    await screen.webElement(webMatcher).clearText();
    jestExpect(mockWebClearText).toHaveBeenCalledTimes(1);
  });

  it('selectAllText calls web.element().selectAllText()', async () => {
    await screen.webElement(webMatcher).selectAllText();
    jestExpect(mockWebSelectAllText).toHaveBeenCalledTimes(1);
  });

  it('scrollToView calls web.element().scrollToView()', async () => {
    await screen.webElement(webMatcher).scrollToView();
    jestExpect(mockWebScrollToView).toHaveBeenCalledTimes(1);
  });

  it('focus calls web.element().focus()', async () => {
    await screen.webElement(webMatcher).focus();
    jestExpect(mockWebFocus).toHaveBeenCalledTimes(1);
  });

  it('moveCursorToEnd calls web.element().moveCursorToEnd()', async () => {
    await screen.webElement(webMatcher).moveCursorToEnd();
    jestExpect(mockWebMoveCursorToEnd).toHaveBeenCalledTimes(1);
  });

  it('runScript calls web.element().runScript() and returns result', async () => {
    const result = await screen.webElement(webMatcher).runScript('return 42;');
    jestExpect(mockWebRunScript).toHaveBeenCalledWith('return 42;');
    jestExpect(result).toBe('script-result');
  });

  it('getCurrentUrl calls web.element().getCurrentUrl()', async () => {
    const url = await screen.webElement(webMatcher).getCurrentUrl();
    jestExpect(url).toBe('https://example.com');
  });

  it('getTitle calls web.element().getTitle()', async () => {
    const title = await screen.webElement(webMatcher).getTitle();
    jestExpect(title).toBe('Page Title');
  });
});

// ─── screen.webExpect assertions ─────────────────────────────────────────────

describe('screen.webExpect', () => {
  const webMatcher = 'web-matcher-id';

  it('toHaveText calls web.element().toHaveText()', async () => {
    await screen.webExpect(webMatcher).toHaveText('Hello World');
    jestExpect(mockWebToHaveText).toHaveBeenCalledWith('Hello World');
  });

  it('toExist calls web.element().toExist()', async () => {
    await screen.webExpect(webMatcher).toExist();
    jestExpect(mockWebToExist).toHaveBeenCalledTimes(1);
  });

  it('toHaveValue calls web.element().toHaveValue()', async () => {
    await screen.webExpect(webMatcher).toHaveValue('active');
    jestExpect(mockWebToHaveValue).toHaveBeenCalledWith('active');
  });

  it('not.toExist calls web.element().not.toExist()', async () => {
    await screen.webExpect(webMatcher).not.toExist();
    jestExpect(mockWebExpectHandle.not.toExist).toHaveBeenCalledTimes(1);
  });
});
