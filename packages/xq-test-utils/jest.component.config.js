/**
 * Thin CJS wrapper so external consumers can still do:
 *   require('@chauhaidang/xq-test-utils/jest.component.config')
 *
 * The real implementation lives in src/test-config/jest-component.ts
 * and is compiled to dist/test-config/jest-component.js.
 */
const { getComponentTestConfig } = require('./dist/test-config/jest-component');
module.exports = getComponentTestConfig;
