import path from 'node:path';
import { defineApiHarnessConfig } from '@chauhaidang/xq-test-harness/config';

const mockPort = 19998;
const mockScript = path.join('..', 'xq-test-harness', 'scripts', 'mock-http-server.mjs');

export default defineApiHarnessConfig({
  bdd: {
    name: 'bdd',
    features: 'features/**/*.feature',
    steps: 'steps/**/*.ts',
    outputDir: '.features-gen',
    importTestFrom: './bdd-world.ts',
    disableWarnings: { importTestFrom: true },
  },
  use: {
    baseURL: `http://127.0.0.1:${mockPort}`,
  },
  webServer: {
    command: `node ${mockScript}`,
    url: `http://127.0.0.1:${mockPort}/health`,
    reuseExistingServer: !process.env.CI,
    env: {
      HARNESS_MOCK_PORT: String(mockPort),
    },
  },
});
