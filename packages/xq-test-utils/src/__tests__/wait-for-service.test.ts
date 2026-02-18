/**
 * Unit tests for waitForService
 */

import { waitForService } from '../service-readiness/wait-for-service';

describe('waitForService', () => {
  it('rejects when URL is unreachable within timeout', async () => {
    // Use a non-routable URL so the request never succeeds
    const unreachableUrl = 'http://192.0.2.1:9999/health';
    const shortTimeout = 500;

    await expect(
      waitForService(unreachableUrl, { timeout: shortTimeout, interval: 50 })
    ).rejects.toThrow();
  }, 10000);

  it('accepts options with timeout and interval', async () => {
    // Just verify the function can be called with options (will reject for bad URL)
    const promise = waitForService('http://127.0.0.1:59999/health', {
      timeout: 100,
      interval: 20,
    });
    await expect(promise).rejects.toThrow();
  }, 5000);
});
