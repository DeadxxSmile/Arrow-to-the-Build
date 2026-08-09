# ATTB 2.1.6 Release Checklist

The release target is **ATTB v2.1.6** with the streamlined single ESO addon at **v1.1.0**. v2.1.6 keeps the v2.1.5 theme/routing cleanup and restores one shared typography system across every theme. Theme switching may change palette and surface treatment, but it must not change font family, size, weight, spacing, line height, wrapping, or layout metrics. Freeze the branch after these corrections for regression fixes, packaging, and final test evidence.

## Freeze rules

- Do not add features beyond the v2.1.1 skill-gate/build-reconciliation correctness scope unless a verified release blocker requires one.
- Prefer deleting dead code/data over adding compatibility scaffolding for unreleased behavior.
- Preserve desktop character data, build revisions, user JSON files, and addon links across upgrades. The v2.1.3 legacy bridge migration intentionally discards only the two obsolete ESO addon SavedVariables files before a fresh single-addon snapshot is generated.
- Treat bundled builds and Schema 4 compatibility as public contracts.
- Keep the ESO integration local-only and describe SavedVariables timing as ESO-controlled. `/reloadui` remains the reliable on-demand refresh path.

## Required automated gates

Run from a clean dependency install:

```text
npm ci --include=dev --no-audit --no-fund
npm test
npm run build:renderer
npm run build
```

Before release, confirm:

- the full Electron/native SQLite suite passes;
- the renderer production build completes without unexpected chunk or React-import warnings;
- every Character Tracker and Build Editor route boots without a white screen or console error;
- all bundled builds validate against Schema 4 and the current skill catalog;
- every bundled-build image reference resolves and no orphan build assets are packaged;
- the preload IPC contract matches the registered main-process handlers and every renderer `window.api` call is exposed;
- the packaged app contains every main-process runtime file and only the reference documents it reads;
- native `.node` modules remain unpacked from ASAR;
- the ESO addon ships once through `extraResources`, not as a duplicate copy inside ASAR;
- source-only tests, tools, architecture notes, branding masters, and public schema files remain outside the installer.

## Installed-app regression pass

On a clean Windows profile:

- install the generated NSIS package;
- launch, create a manual character, restart, and confirm persistence;
- exercise both Character Tracker and Build Editor workspaces;
- create, autosave, save, reopen, fork, export, import, and restore a build revision;
- confirm the user-build JSON folder mirrors permanent saves but not recovery drafts;
- test Character Backup export/import;
- test ATTB Default, Deep Dark, Light, and Old Scrolls themes and both expanded/collapsed sidebars;
- confirm General Settings remains selected when opened from the Build Editor Settings route;
- confirm Default primary actions use the restrained dark/bronze treatment rather than bright orange fills;
- confirm switching among all four themes does not change typography, text wrapping, or control geometry;
- confirm the title bar shows the running `v2.1.6` value;
- confirm the Simple ATTB mark is used for Windows/app chrome and the Words mark only on large branding surfaces;
- test all eight combat companions in the Character Tracker and both curated targets per companion;
- author, duplicate, edit, validate, save, export, and re-import companion setups in the Build Editor;
- reproduce the Agility/Athletics/Concentration rank-gate regression and confirm Suggested Next Picks does not label them available early.
- spot-check one class, weapon, World, Guild, Alliance War, racial, and crafting passive against the generated Update 50 unlock ledger; confirm each next passive point stays locked until its exact catalog gate.
- confirm the Build Editor creates multi-point passives with distinct per-point `required_rank` values and morph rows retain the base-skill dependency.

On an upgrade install with existing beta data:

- confirm migrations leave characters, bundled/user builds, drafts, revisions, settings, addon snapshots/links, overrides, and saved-build JSON paths intact;
- confirm no user build ID, revision history, or character/build association changes unexpectedly.

## ESO addon regression pass

With bundled `ArrowToTheBuild` 1.1.0 enabled:

- verify manifest/API/version metadata match the release package;
- verify only one addon component and one active SavedVariables archive are installed/watched;
- verify an exact legacy 1.0.0 bridge addon folder is safely retired while its old SavedVariables file is preserved;
- verify first-enable messaging clearly explains ESO-controlled disk timing and links to the ZOS/ESOUI references;
- verify `/reloadui` produces a reliable fresh desktop snapshot;
- verify level, attributes, available points, skills/passives, action bars, equipment, and detailed Champion data reconcile correctly;
- verify new-character discovery never adds or links a character without approval;
- verify Create Build from Character and Adapt Build to Character preserve CURRENT-vs-TARGET ownership;
- verify overrides remain separate from live ESO data and disabling override mode removes them cleanly;
- verify the Lua source-quality regression rejects generic API `pcall`/`_G` probing, obsolete event guesses, bridge/priority-save code, and skill-XP rescan spam.

## Documentation and repository hygiene

- README version/status matches `package.json`.
- GitHub Pages version text, addon section, screenshots, and release links match the 2.1.6 package and published claims.
- Build Quick Start, Editor Guide, JSON Guide, Format, Validation, Skill Catalog, patch-maintenance guide, addon-integration guide, and Testing guide match current behavior.
- `BUILD_SCHEMA.json` and `BUILD_TEMPLATE.json` match Schema 4 behavior and validation.
- No historical milestone plans, obsolete conversion scripts, temp archives, databases, logs, `node_modules`, generated installers, or unreferenced build assets are present in the source ZIP.
- Desktop source ZIP naming follows `Arrow-to-the-Build_vX.X.X[-tag].zip`. Standalone addon source archives use `ATTB-ESOAddon-Source-vX.X.X.zip`; the addon repository build script may create `ATTB-ESOAddon-Built-vX.X.X.zip` for manual installation.

## Final release handoff

Before publishing the v2.1.6 release:

1. Run the complete native suite twice.
2. Run the renderer build and all-route boot test.
3. Build and install the Windows package on a clean profile and over an existing beta profile.
4. Perform the ESO `/reloadui` sync regression and Create/Adapt workflow once more.
5. Validate all seven bundled builds and exported Schema 4 JSON.
6. Resolve or explicitly disposition every item in [`DEPENDENCY_AUDIT.md`](DEPENDENCY_AUDIT.md), then review fresh dependency audit output and document any accepted advisory.
7. Create the clean source ZIP and record its SHA-256.
8. Freeze that artifact for final release review; do not rebuild it silently after testing.
