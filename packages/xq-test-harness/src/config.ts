import { defineConfig, type PlaywrightTestConfig } from '@playwright/test';
import { defineBddProject } from 'playwright-bdd';

/** BDD project options: same as playwright-bdd `defineBddProject` input (`name` optional, defaults to `bdd`). */
export type ApiHarnessBddConfig = Omit<Parameters<typeof defineBddProject>[0], 'name'> & {
  name?: string;
};

export interface DefineApiHarnessConfigOptions {
  /** Glob(s) resolved relative to `contractTestDir` for the `contract` Playwright project. */
  contractSpecs?: string | string[];
  /** Directory containing contract specs (default: `tests`). */
  contractTestDir?: string;
  /** When set, prepends a BDD project (bddgen output + generated tests). */
  bdd?: ApiHarnessBddConfig;
  /** Default `use` options merged with harness defaults and `overrides.use`. */
  use?: PlaywrightTestConfig['use'];
  webServer?: PlaywrightTestConfig['webServer'];
  /** Extra projects merged after harness-built bdd/contract projects. */
  projects?: PlaywrightTestConfig['projects'];
  /** Shallow merge on top; `use` is deep-merged; `projects` are appended after harness projects when set. */
  overrides?: Partial<PlaywrightTestConfig>;
}

/**
 * Pure merge used by {@link defineApiHarnessConfig} and by contract tests (no Playwright wrapper).
 */
export function mergeApiHarnessPlaywrightConfig(
  options: DefineApiHarnessConfigOptions,
): PlaywrightTestConfig {
  const projects: NonNullable<PlaywrightTestConfig['projects']> = [];

  if (options.bdd) {
    const name = options.bdd.name ?? 'bdd';
    const { name: _ignored, ...bddRest } = options.bdd;
    const bddProject = defineBddProject({
      ...bddRest,
      name,
      outputDir: bddRest.outputDir ?? '.features-gen',
    });
    projects.push(bddProject as NonNullable<PlaywrightTestConfig['projects']>[number]);
  }

  if (options.contractSpecs !== undefined && options.contractSpecs !== '') {
    const testMatch = Array.isArray(options.contractSpecs)
      ? options.contractSpecs
      : [options.contractSpecs];
    projects.push({
      name: 'contract',
      testDir: options.contractTestDir ?? 'tests',
      testMatch,
    });
  }

  if (options.projects?.length) {
    projects.push(...options.projects);
  }

  const harnessUse: PlaywrightTestConfig['use'] = {
    ...(options.use ?? {}),
  };

  const base: PlaywrightTestConfig = {
    projects,
    use: harnessUse,
    webServer: options.webServer,
    reporter: [
      ['list'],
      ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ],
  };

  const overrides = options.overrides ?? {};
  const { projects: extraOverrideProjects, use: overrideUse, ...restOverrides } = overrides;

  const mergedUse: PlaywrightTestConfig['use'] = {
    ...base.use,
    ...overrideUse,
  };

  const mergedProjects = [...(base.projects ?? []), ...(extraOverrideProjects ?? [])];

  return {
    ...base,
    ...restOverrides,
    use: mergedUse,
    projects: mergedProjects,
  };
}

/**
 * Playwright `defineConfig` wrapper with bdd + contract project merge and `use` merge semantics.
 */
export function defineApiHarnessConfig(options: DefineApiHarnessConfigOptions) {
  return defineConfig(mergeApiHarnessPlaywrightConfig(options));
}

export { defineBddProject } from 'playwright-bdd';
