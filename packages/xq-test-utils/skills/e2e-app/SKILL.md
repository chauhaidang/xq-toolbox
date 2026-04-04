---
name: e2e-app
description: >
  Control the React Native app lifecycle in Detox E2E tests using the App
  controller from @chauhaidang/xq-test-utils. Use when you need to launch,
  reset, terminate, relaunch, or background the app.
---

# `e2e-app` skill

`App` is a high-level controller for the iOS app under test. It wraps Detox's
`device` global so that test files never import or reference Detox APIs directly.

All methods are async and emit debug logs via xq-common-kit.

---

## Import

```ts
import { App } from '@chauhaidang/xq-test-utils';
```

---

## Methods

### `App.launch(options?)`

Launches the app. Pass `{ newInstance: true }` to force a fresh process.

```ts
await App.launch();
await App.launch({ newInstance: true });
await App.launch({ permissions: { notifications: 'YES', camera: 'NO' } });
```

**`LaunchOptions`**

| Option | Type | Description |
|--------|------|-------------|
| `newInstance` | `boolean` | Force a new process instead of resuming |
| `permissions` | `Record<string, string>` | Runtime permission grants/denials |
| `launchArgs` | `Record<string, unknown>` | Arguments exposed via `ProcessInfo` |
| `languageAndLocale` | `{ language?, locale? }` | Override device language/locale |

---

### `App.reset(options?)`

Deletes all app data and launches as a clean install. Equivalent to uninstall
and re-install. Use at the start of an independent test suite.

```ts
await App.reset();
await App.reset({ permissions: { notifications: 'YES' } });
```

---

### `App.terminate()`

Terminates the running app process. Paired with `App.launch()` in teardown.

```ts
await App.terminate();
```

---

### `App.relaunch(options?)`

Terminates then re-launches without deleting data. Use when you need a cold
start mid-suite without losing storage.

```ts
await App.relaunch();
```

---

### `App.background(durationMs?)`

Sends the app to the home screen, waits `durationMs` milliseconds, then
restores it to the foreground. Default duration: 2000 ms.

```ts
await App.background();          // 2 s
await App.background(5_000);     // 5 s
```

---

## Typical patterns

**Standard suite lifecycle**
```ts
beforeAll(async () => {
  await App.launch({ newInstance: true });
});

afterAll(async () => {
  await App.terminate();
});
```

**Full state reset between suites**
```ts
beforeEach(async () => {
  await App.reset();
});
```

**Background/foreground test**
```ts
it('resumes correctly after backgrounding', async () => {
  await App.background(3_000);
  // assert app state after return
});
```

---

## Rules for agents using this skill

- Never use Detox's `device` global directly — always use `App`.
- Use `App.reset()` (not `App.launch({ delete: true })`) for full state reset.
- `App.background()` requires the app to already be launched.
- All `App` methods must be awaited — they are all async.
