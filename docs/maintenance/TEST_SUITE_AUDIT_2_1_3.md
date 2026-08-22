# ATTB v2.1.3 Test Suite Audit

> **Historical record:** This audit describes the v2.1.3 suite cleanup. The current application release is ATTB 3.1.1 and the current test count is defined by the live repository, not this archived report.

Date: 2026-08-09

This audit followed the addon v1.1.0 cleanup with the same goal: keep the codebase easy to reason about without removing protections that actually matter.

## Result

Before the audit:

- 335 automated tests
- 5,466 lines under `tests/`
- 65 tests in the broad `uiStructure.test.js` source-inspection file
- 23 packaging tests
- 5 release-consistency tests

After the audit:

- 278 automated tests
- 4,584 lines under `tests/`
- 20 focused renderer regression/source-contract tests
- 12 packaging tests
- 4 release-consistency tests

The cleanup removes 57 tests and 882 lines of test code, about 17% of the test count and 16% of the test source. No application or addon runtime code changed during this audit.

## What was removed or consolidated

### Decorative UI implementation locks

The old renderer test file had accumulated many assertions for exact CSS dimensions, sidebar spacing, panel gaps, type size, button styling, navigation order, and exact display copy. Those tests made harmless visual changes capable of failing the production build.

They were removed unless they protected a real historical failure such as:

- the collapsed workspace scroll region;
- `defaultOpen` not opening `<details>`;
- an undefined object-shorthand identifier blanking the renderer;
- a missing React namespace import;
- a missing hero image leaving stray placeholder text;
- unsupported browser-native dialogs inside Electron.

### Duplicate feature wiring checks

Broad source scans that only proved a route, label, or preload method existed were removed when a behavioral test already exercises the feature. This especially affected Build Editor, character creation, loadouts/variants, addon import, and create/adapt-from-character wiring.

The IPC contract tests remain authoritative for preload/main-process channel matching.

### Packaging duplication

Packaging checks were consolidated around actual release risks:

- runtime files are included;
- developer/source-only files are excluded;
- migrations ship;
- bundled build assets exist and ship;
- the addon ships once through `extraResources`;
- native SQLite is unpacked correctly;
- Windows installer settings are safe;
- dependencies are not redundantly bundled;
- the public build script runs the required steps.

Historical cleanup assertions, website screenshot inventory, marketing-link checks, and repeated package-version checks were removed from the build-blocking packaging suite.

### Release duplication

The Mighty Seven "exactly one build per class" check already exists in stronger bundled-build/schema tests, so the duplicate release-consistency copy was removed.

## What was deliberately kept

The audit did not chase a low test count. The following suites remain detailed because failures here can corrupt data, silently change builds, or break synchronization:

- `persistence.test.js`
- `addonIntegration.test.js`
- `addonParser.test.js`
- `buildEditorStorage.test.js`
- `buildStorage.test.js`
- `validation.test.js`
- `catalogIntegrity.test.js`
- `catalogMigration.test.js`
- `buildLogic.test.mjs`
- `cp.test.mjs`
- `attributes.test.mjs`
- `variants.test.mjs`

These are primarily behavioral, schema, data-integrity, security, migration, or regression tests. Their count is useful coverage rather than test-suite decoration.

## Current test ownership

- **Behavior and data safety:** persistence, storage, parser, validation, migrations, build logic, CP, attributes, variants.
- **End-to-end desktop/addon contract:** addon integration and addon parser tests.
- **Static contracts:** IPC channel pairing, local module resolution, release metadata, packaging.
- **Renderer source regressions:** a small set of bugs that cannot be exercised cheaply without adding a browser testing stack.
- **Manual/live verification:** visual layout, ordinary copy changes, installer UX, and behavior inside a real ESO client remain in `TESTING.md` instead of being encoded as brittle source assertions.

## Validation after cleanup

The 20 test files that do not require the local Electron-native SQLite module were run together after the cleanup:

- 173 tests passed
- 0 failed

The complete 278-test suite still runs through `npm test` using Electron's embedded Node and `better-sqlite3`. A Windows `BUILD-ATTB.bat` run is the final full-suite verification because the source-cleanup environment does not have the Electron-native SQLite dependency installed.

## Rule going forward

A new automated test should answer at least one of these questions:

1. Can this break or lose user data?
2. Can this accept invalid build/addon input?
3. Can this silently produce the wrong character/build state?
4. Can this break the installer or packaged runtime?
5. Is this a real regression that the existing test layers would not catch?

If the answer is no and the test only freezes copy or visual implementation details, it belongs in manual QA rather than the build-blocking suite.
