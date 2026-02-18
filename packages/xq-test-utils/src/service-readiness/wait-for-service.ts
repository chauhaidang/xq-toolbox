/**
 * Wait for a service URL to become available (e.g. health check endpoint).
 * Uses wait-on under the hood for polling.
 */

import waitOn from 'wait-on';
import { WaitForServiceOptions } from './types';

/**
 * Wait until the given URL is reachable (HTTP 2xx or TCP open).
 * @param healthUrl - URL to poll (e.g. http://localhost:8080/health)
 * @param options - Optional timeout and interval
 * @throws If the resource is not ready within the timeout
 */
export async function waitForService(
    healthUrl: string,
    options?: WaitForServiceOptions
): Promise<void> {
    const timeout = options?.timeout ?? 30000;
    const interval = options?.interval ?? 1000;

    await waitOn({
        resources: [healthUrl],
        timeout,
        interval,
    });
}
