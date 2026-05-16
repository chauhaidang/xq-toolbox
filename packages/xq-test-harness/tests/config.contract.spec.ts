import { test, expect } from '@playwright/test';
import { mergeApiHarnessPlaywrightConfig } from '../dist/config';

test.describe('harness Playwright config merge', () => {
  test('includes bdd then contract projects when both requested', () => {
    const cfg = mergeApiHarnessPlaywrightConfig({
      contractSpecs: '**/*.contract.spec.ts',
      bdd: {
        name: 'bdd',
        features: 'bdd-dogfood/**/*.feature',
        steps: 'bdd-dogfood/steps/**/*.ts',
        outputDir: '.features-gen',
      },
    });
    const names = cfg.projects?.map((p) => p.name).filter(Boolean) as string[];
    expect(names).toContain('bdd');
    expect(names).toContain('contract');
    expect(names.indexOf('bdd')).toBeLessThan(names.indexOf('contract'));
  });

  test('does not set channel in use by default', () => {
    const cfg = mergeApiHarnessPlaywrightConfig({
      use: { baseURL: 'http://example.test' },
    });
    expect(cfg.use?.channel).toBeUndefined();
  });

  test('merges overrides.use into harness use', () => {
    const cfg = mergeApiHarnessPlaywrightConfig({
      use: { baseURL: 'http://a.test' },
      overrides: { use: { extraHTTPHeaders: { 'X-Test': '1' } } },
    });
    expect(cfg.use?.baseURL).toBe('http://a.test');
    expect(cfg.use?.extraHTTPHeaders).toEqual({ 'X-Test': '1' });
  });
});
