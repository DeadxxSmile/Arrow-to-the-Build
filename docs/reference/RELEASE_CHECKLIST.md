# ATTB 2.0 Release Checklist

The release target is **ATTB v2.0.0** with both bundled ESO addon components at **v1.0.0**. Feature work is frozen. From this point until publication, changes are limited to verified release blockers, regression fixes, documentation, packaging, and final test evidence.

## Freeze rules

- Do not add new product features unless a verified release blocker requires one.
- Prefer deleting dead code/data over adding compatibility scaffolding for unreleased behavior.
- Preserve existing character data, build revisions, user JSON files, and addon links across upgrades.
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
- test dark and light themes and both expanded/collapsed sidebars;
- confirm the Simple ATTB mark is used for Windows/app chrome and the Words mark only on large branding surfaces.

On an upgrade install with existing beta data:

- confirm migrations leave characters, bundled/user builds, drafts, revisions, settings, addon snapshots/links, overrides, and saved-build JSON paths intact;
- confirm no user build ID, revision history, or character/build association changes unexpectedly.

## ESO addon regression pass

With both bundled addon components enabled:

- verify addon/bridge versions and manifests match the release package;
- verify first-enable messaging clearly explains ESO-controlled disk timing and links to the ZOS/ESOUI references;
- verify `/reloadui` produces a reliable fresh desktop snapshot;
- verify level, attributes, available points, skills/passives, action bars, equipment, and detailed Champion data reconcile correctly;
- verify new-character discovery never adds or links a character without approval;
- verify Create Build from Character and Adapt Build to Character preserve CURRENT-vs-TARGET ownership;
- verify overrides remain separate from live ESO data and disabling override mode removes them cleanly;
- verify the bridge budget/reconciliation diagnostics do not discard newer complete state.

## Documentation and repository hygiene

- README version/status matches `package.json`.
- GitHub Pages version text, addon section, screenshots, and release links match the 2.0.0 package and published claims.
- Build Quick Start, Editor Guide, JSON Guide, Format, Validation, Skill Catalog, patch-maintenance guide, addon-integration guide, and Testing guide match current behavior.
- `BUILD_SCHEMA.json` and `BUILD_TEMPLATE.json` match Schema 4 behavior and validation.
- No historical milestone plans, obsolete conversion scripts, temp archives, databases, logs, `node_modules`, generated installers, or unreferenced build assets are present in the source ZIP.
- Desktop source ZIP naming follows `Arrow-to-the-Build_vX.X.X[-tag].zip`. Standalone addon source archives use `ATTB-ESOAddon-Source-vX.X.X.zip`; the addon repository build script may create `ATTB-ESOAddon-Built-vX.X.X.zip` for manual installation.

## Final release handoff

Before publishing the v2.0.0 release:

1. Run the complete native suite twice.
2. Run the renderer build and all-route boot test.
3. Build and install the Windows package on a clean profile and over an existing beta profile.
4. Perform the ESO `/reloadui` sync regression and Create/Adapt workflow once more.
5. Validate all seven bundled builds and exported Schema 4 JSON.
6. Resolve or explicitly disposition every item in `DEPENDENCY_AUDIT.md`, then review fresh dependency audit output and document any accepted advisory.
7. Create the clean source ZIP and record its SHA-256.
8. Freeze that artifact for final release review; do not rebuild it silently after testing.
