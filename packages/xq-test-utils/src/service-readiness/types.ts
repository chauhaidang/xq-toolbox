/**
 * Service-readiness types.
 */

export interface WaitForServiceOptions {
    /** Timeout in milliseconds. Default: 30000 */
    timeout?: number;
    /** Poll interval in milliseconds. Default: 1000 */
    interval?: number;
}
