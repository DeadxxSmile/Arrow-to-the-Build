# ATTB 2.2.0 Release Checklist

The release target is **ATTB v2.2.0** with the streamlined single ESO addon at **v1.1.1**. v2.2.0 promotes Help & Tools into a dedicated third workspace with grouped Gear, Combat, Progression, Companion, and Reference sections for the player-facing ESO concepts that sit around an authored build: sets, traits, enchantments, combat stats, buffs/debuffs, status effects, armor weights, weapons, shopping decisions, Mundus Stones, Champion Points, skill terminology, Scribing, consumables, common build jargon, and companion build mechanics. The v2.1.8 temporary-unlock retirement lifecycle remains part of the current baseline. The public build format remains **Schema 4** and the addon remains unchanged. Freeze the branch after this approved Help & Tools workspace expansion for regression fixes, packaging, and final test evidence.

## Freeze rules

- Do not add features beyond the approved v2.2.0 Help & Tools workspace and release-polish scope unless a verified release blocker requires one.
- Prefer deleting dead code/data over adding compatibility scaffolding for unreleased behavior.
- Preserve desktop character data, build revisions, user JSON files, and addon links across upgrades. The v2.1.3 legacy bridge migration intentionally discards only the two obsolete ESO addon SavedVariables files before a fresh single-addon snapshot is generated.
- Treat bundled builds and Schema 4 compatibility as public contracts. Existing Schema 4 builds without `retire_when` must continue to import and behave normally.
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
- every Character Tracker, Build Editor, and Help & Tools route boots without a white screen or console error;
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
- exercise Character Tracker, Build Editor, and Help & Tools workspaces;
- create, autosave, save, reopen, fork, export, import, and restore a build revision;
- confirm the user-build JSON folder mirrors permanent saves but not recovery drafts;
- test Character Backup export/import from Character Tracker → Character Data → Backups & Import and confirm the old Help & Tools backup route redirects there;
- test ATTB Default, Deep Dark, Light, Old Scrolls, SkyTrim, and Woodland themes across Character, Build, Help, and Settings;
- confirm the General tab remains selected when opened from the Build Editor settings route;
- confirm Default primary actions use the restrained dark/bronze treatment rather than bright orange fills;
- confirm switching among all six themes does not change typography, text wrapping, or control geometry;
- confirm the title bar shows the running `v2.2.0` value;
- open the Help & Tools workspace and verify each Gear, Combat, Progression, Companion, and Reference route loads, scrolls, and inherits all six themes without hard-coded colors;
- verify the legacy `/help/traits` route redirects to the equipment-trait reference and the Help & Tools sidebar highlights the correct topic;
- verify the Character / Build / Help tab strip fills the top of the sidebar in all three workspaces, Settings remains separate at the bottom, and stale pre-2.2.0 Character routes such as `/help` are rejected instead of bouncing back into Help & Tools;
- confirm the Simple ATTB mark is used for Windows/app chrome and the Words mark only on large branding surfaces;
- test all eight combat companions in the Character Tracker and both curated targets per companion;
- author, duplicate, edit, validate, save, export, and re-import companion setups in the Build Editor;
- reproduce the Agility/Athletics/Concentration rank-gate regression and confirm Suggested Next Picks does not label them available early.
- spot-check one class, weapon, World, Guild, Alliance War, racial, and crafting passive against the generated Update 50 unlock ledger; confirm each next passive point stays locked until its exact catalog gate.
- confirm the Build Editor creates multi-point passives with distinct per-point `required_rank` values and morph rows retain the base-skill dependency.
- confirm every Mighty Seven `status: "temporary"` unlock has a valid `retire_when` rule and older Schema 4 builds without one still validate.
- confirm authored retirement cutoffs remove temporary unlocks from Do These Next without marking the ESO skill unowned.
- confirm an owned retired temporary unlock appears in Leveling Cleanup with the correct reclaimable Skill Point total.
- confirm a synced/read-only character can manually retire a temporary unlock without enabling general override mode, and can later choose Keep active or Use build cutoff.
- confirm temporary retirement state survives restart, character backup export/import, and remains scoped to unlock IDs in the selected build.

On an upgrade install with existing beta data:

- confirm migrations leave characters, bundled/user builds, drafts, revisions, settings, addon snapshots/links, overrides, and saved-build JSON paths intact;
- confirm no user build ID, revision history, or character/build association changes unexpectedly.

## ESO addon regression pass

With bundled `ArrowToTheBuild` 1.1.1 enabled:

- verify manifest/API/version metadata match the release package;
- verify only one addon component and one active SavedVariables archive are installed/watched;
- verify a verified legacy bridge installation is retired conservatively: recognized old addon/SavedVariables files are removed for the one-time reset, while unrecognized addon folders are left untouched;
- verify first-enable messaging clearly explains ESO-controlled disk timing and links to the ZOS/ESOUI references;
- verify `/reloadui` produces a reliable fresh desktop snapshot;
- verify level, attributes, available points, skills/passives, action bars, equipment, and detailed Champion data reconcile correctly;
- verify new-character discovery never adds or links a character without approval;
- verify Create Build from Character and Adapt Build to Character preserve CURRENT-vs-TARGET ownership;
- verify overrides remain separate from synced ESO data and disabling override mode removes them cleanly;
- verify the Lua source-quality regression rejects generic API `pcall`/`_G` probing, obsolete event guesses, bridge/priority-save code, and skill-XP rescan spam.

## Documentation and repository hygiene

- README version/status matches `package.json`.
- Website version text, addon section, screenshots, progression copy, Help & Tools feature copy, and release links match the 2.2.0 package and published claims.
- Build Quick Start, Editor Guide, JSON Guide, Format, Validation, Skill Catalog, patch-maintenance guide, addon-integration guide, and Testing guide match current behavior.
- `BUILD_SCHEMA.json` and `BUILD_TEMPLATE.json` match Schema 4 behavior and validation.
- No historical milestone plans, obsolete conversion scripts, temp archives, databases, logs, `node_modules`, generated installers, or unreferenced build assets are present in the source ZIP.
- GitHub release descriptions/notes are standalone release handoff artifacts only. Do not keep versioned files such as `2-2-0_release.md` in the repository root or package them in the desktop source ZIP.
- Desktop source ZIP naming follows `Arrow-to-the-Build_vX.X.X[-tag].zip`. Standalone addon source archives use `ATTB-ESOAddon-Source-vX.X.X.zip`; the addon repository build script may create `ATTB-ESOAddon-Built-vX.X.X.zip` for manual installation.

## Final release handoff

Before publishing the v2.2.0 release:

1. Run the complete native suite twice.
2. Run the renderer build and all-route boot test.
3. Build and install the Windows package on a clean profile and over an existing beta profile.
4. Perform the ESO `/reloadui` sync regression and Create/Adapt workflow once more.
5. Validate all seven bundled builds and exported Schema 4 JSON.
6. Resolve or explicitly disposition every item in [`DEPENDENCY_AUDIT.md`](DEPENDENCY_AUDIT.md), then review fresh dependency audit output and document any accepted advisory.
7. Create the clean source ZIP and record its SHA-256.
8. Freeze that artifact for final release review; do not rebuild it silently after testing.
