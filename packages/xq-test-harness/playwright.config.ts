import path from 'node:path';
import { defineApiHarnessConfig } from './dist/config';

const mockPort = Number(process.env.HARNESS_MOCK_PORT ?? '19999');

export default defineApiHarnessConfig({
  bdd: {
    name: 'bdd',
    features: 'bdd-dogfood/**/*.feature',
    steps: 'bdd-dogfood/steps/**/*.ts',
    outputDir: '.features-gen',
    importTestFrom: './bdd-world.ts',
    disableWarnings: { importTestFrom: true },
  },
  contractSpecs: '**/*.contract.spec.ts',
  contractTestDir: 'tests',
  use: {
    baseURL: `http://127.0.0.1:${mockPort}`,
  },
  webServer: {
    command: `node ${path.join('scripts', 'mock-http-server.mjs')}`,
    url: `http://127.0.0.1:${mockPort}/health`,
    reuseExistingServer: !process.env.CI,
    env: {
      HARNESS_MOCK_PORT: String(mockPort),
    },
  },
});
