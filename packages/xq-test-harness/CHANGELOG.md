# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-05-11

### Added

- Initial release: `defineApiHarnessConfig`, bundled `@playwright/test` + `playwright-bdd`, Tier A BDD exports (`Given` / `When` / `Then` / `Step`), `./config` and `./advanced` entrypoints, contract merge tests, and dogfood BDD layout.

### Changed

- `request` uses Playwright’s default API fixture; configure `use.baseURL` in config for relative URLs. Added reserved `xq` fixture (`XQFixture`) as a placeholder for future XQ context.
