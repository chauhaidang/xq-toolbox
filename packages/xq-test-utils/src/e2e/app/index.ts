import { logger } from '@chauhaidang/xq-common-kit';

export interface LaunchOptions {
  /**
   * Start a brand-new app instance, even if one is already running.
   * @default false
   */
  newInstance?: boolean;
  /**
   * Grant runtime permissions before launch.
   * Example: `{ notifications: 'YES', camera: 'NO' }`
   */
  permissions?: Record<string, string>;
  /**
   * Override launch arguments exposed to the app via ProcessInfo.
   */
  launchArgs?: Record<string, unknown>;
  /**
   * Override device language and locale.
   * Example: `{ language: 'fr', locale: 'fr_FR' }`
   */
  languageAndLocale?: { language?: string; locale?: string };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _device = (): any => (globalThis as any).device;

/**
 * High-level controller for the app under test.
 * Wraps Detox's `device` global — consumers never need to import or reference
 * Detox APIs directly.
 *
 * All methods are async and log their actions via xq-common-kit logger.
 *
 * @example
 * import { App } from '@chauhaidang/xq-test-utils';
 *
 * beforeAll(async () => {
 *   await App.launch({ newInstance: true });
 * });
 *
 * afterAll(async () => {
 *   await App.terminate();
 * });
 */
export const App = {
  /**
   * Launches the app. Pass `{ newInstance: true }` to guarantee a fresh
   * process instead of resuming an existing one.
   */
  async launch(options?: LaunchOptions): Promise<void> {
    logger.info('[App] Launching', options ?? {});
    await _device().launchApp(options);
  },

  /**
   * Deletes all app data and re-launches as a clean install.
   * Use this at the start of a suite that requires a pristine state.
   */
  async reset(options?: Omit<LaunchOptions, 'newInstance'>): Promise<void> {
    logger.info('[App] Resetting (fresh install)', options ?? {});
    await _device().launchApp({ ...options, newInstance: true, delete: true });
  },

  /**
   * Terminates the running app process.
   */
  async terminate(): Promise<void> {
    logger.info('[App] Terminating');
    await _device().terminateApp();
  },

  /**
   * Sends the app to the background for `durationMs` milliseconds, then
   * brings it back to the foreground. Useful for testing lifecycle events.
   * @param durationMs - How long to keep the app backgrounded. Default 2000.
   */
  async background(durationMs = 2000): Promise<void> {
    logger.info(`[App] Backgrounding for ${durationMs}ms`);
    await _device().sendToHome();
    await new Promise((resolve) => setTimeout(resolve, durationMs));
    await _device().activateApp();
    logger.info('[App] Restored to foreground');
  },

  /**
   * Terminates then re-launches the app without deleting its data.
   * Useful for testing cold-start behaviour mid-suite.
   */
  async relaunch(options?: LaunchOptions): Promise<void> {
    logger.info('[App] Relaunching (terminate + launch)', options ?? {});
    await _device().terminateApp();
    await _device().launchApp(options);
  },
};
