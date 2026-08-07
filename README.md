# Arrow to the Build (ATTB)

> **I Used To Be Meta Like You, Then I Took An Arrow To The Build**

**Arrow to the Build** is an offline-first Windows companion for **The Elder Scrolls Online**. It turns
static build guides into character-specific progression plans: what to unlock next, which skill-line
ranks matter, how to spend Champion Points, what gear to chase, and how the final hotbars and rotation
fit together.

ATTB is built with Electron, React, Vite, SQLite through `better-sqlite3`, and electron-builder/NSIS.
Character data stays on the local computer. Build definitions are ordinary human-readable JSON files.

[Project website](https://deadxxsmile.github.io/Arrow-to-the-Build/) ·
[Latest releases](https://github.com/DeadxxSmile/Arrow-to-the-Build/releases) ·
[Source repository](https://github.com/DeadxxSmile/Arrow-to-the-Build) ·
[ESO addon source](https://github.com/DeadxxSmile/Arrow-to-the-Build-ESO-Addon) ·
[Report an issue](https://github.com/DeadxxSmile/Arrow-to-the-Build/issues) ·
[Buy Me a Coffee](https://buymeacoffee.com/deadx_xsmile) ·
[Deadx_xSmile Linktree](https://linktr.ee/deadx_xsmile)

## Highlights

- Two remembered workspaces in one app: the Character Tracker and the Build Editor.
- One bundled flexible PvE progression build for every ESO class: the **Mighty Seven**.
- Character level, race, alliance, recorded attributes, three Champion Point budgets, skill-line ranks,
  skills, morphs, passives, and ultimates.
- Bundled **ESO companion addon 1.0.0** with first-launch setup, profile auto-detection, install/repair, SavedVariables synchronization, and explicit new-character discovery.
- Per-field synced-data overrides for safe build testing, with one-click restoration to the latest live ESO value.
- Dynamic next-purchase recommendations based on real prerequisites and entered line ranks.
- A dedicated Champion Points workspace with required paths, recommended branches, optional
  alternatives, and final slottable bars.
- Numeric-only Current Levels entry for character level, attributes, CP totals, skill-line ranks, and
  multi-rank passives.
- Build-related versus personal Skill Point accounting.
- Piece-by-piece equipment tracking across leveling, starter, intermediate, and final stages.
- ESO-inspired front and back hotbars with structured rotations or priority systems.
- Character backup import/export under the Character Tracker’s **Help & Tools**.
- A dedicated **Build Editor** workspace with its own navigation, Build Library, creation entry points, offline Build Setup Guide, and build JSON import/export tools.
- Dark and light themes, ESO Plus access notes, curated resources, and optional trusted remote images.
- Local SQLite persistence with pre-migration backups, plus automatic human-readable JSON mirrors for every permanently saved user build.
- A configurable user build folder that defaults to `Documents\Arrow to the Build\Builds`, with safe copy-before-switch behavior and external-change protection.
- A narrow sandboxed Electron preload API.

## Bundled builds: the Mighty Seven

| Class | Build |
|---|---|
| Arcanist | Stamina Arcanist Flexible PvE |
| Dragonknight | Magicka Dragonknight Flexible PvE |
| Necromancer | Stamina Necromancer Flexible PvE |
| Nightblade | Stamina Nightblade Flexible PvE |
| Sorcerer | Magicka Sorcerer Flexible PvE |
| Templar | Magicka Templar Flexible PvE |
| Warden | Magicka Warden Flexible PvE |

These are progression-oriented starting points, not claims that one loadout is perfect for every trial,
dungeon, PvP campaign, or group composition. The frozen Update 50 buildcraft audit curates passive spending,
weapon bars, Champion Points, Scribing recipes, gear-stage set counts, consumables, and practical alternatives
so the bundle teaches coherent ESO builds rather than merely schema-valid JSON. Additional variants and
community builds can be added through stable Schema 4 JSON. The Build Editor provides protected forks,
recovery drafts, autosave, undo/redo, saved revisions, guided creation, and visual editors for the major Schema 4 sections.

Build research and attribution notes are in
[`docs/reference/BUNDLED_BUILD_SOURCES.md`](docs/reference/BUNDLED_BUILD_SOURCES.md).

## Install or build for Windows

### Install a published release

1. Open the [latest releases](https://github.com/DeadxxSmile/Arrow-to-the-Build/releases) page.
2. Download `ATTB-Setup-<version>.exe` from the release assets.
3. Run the installer.

ATTB does not update itself automatically. Installing a newer version keeps the local database and runs
any required database migrations when the app starts. Exporting a character backup before an update is
still a sensible precaution.

### Requirements for building from source

- Windows 10 or Windows 11
- A current Node.js LTS installation with npm
- Internet access during dependency installation and the optional build-time skill-icon download

### One-step build

1. Download or clone this repository.
2. Open the repository folder.
3. Run `BUILD-ATTB.bat`.

The script:

1. Installs the exact dependencies from `package-lock.json` with `npm ci`.
2. Downloads available ESO skill icons from UESP into the local build cache. Missing icons keep ATTB's
   initials fallback.
3. Runs the complete test suite through Electron's embedded Node runtime.
4. Builds the Vite renderer and creates the NSIS installer.

The finished installer is written to:

```text
dist\ATTB-Setup-<version>.exe
```

The build script **does not launch the installer**.

### Unsigned Windows warning

ATTB is a free, open-source project and the installer is currently unsigned. Windows may display
**Unknown Publisher**, SmartScreen, or Smart App Control warnings. Review the source and only bypass a
warning when the files came from this repository or another source you trust.

## Development

Install dependencies:

```powershell
npm ci --include=dev
```

Run Vite and Electron together:

```powershell
npm start
```

Run the test suite:

```powershell
npm test
```

Build only the production renderer:

```powershell
npm run build:renderer
```

Refresh the local skill-icon cache:

```powershell
npm run fetch:icons
```

Build the complete Windows package:

```powershell
npm run build
```

Development mode stores `attb.db` in the repository root. The database and generated build folders are
ignored by Git.

## ESO companion addon

ATTB 2.0 bundles the stable **Arrow to the Build ESO Companion Addon 1.0.0**. The addon is optional and local-only: it does not automate combat, spend points, equip items, contact a server, or read data back from the desktop app. It exports observed character state through ESO's normal SavedVariables system.

The integration deliberately uses two ESO addon components:

- `ArrowToTheBuild` - the durable, fuller multi-character archive.
- `ArrowToTheBuildBridge` - a deliberately small current-character bridge with a 32 KiB internal budget.

Together they can provide the desktop app with character identity, level and attributes, available points, purchased skills and morphs, passive ranks, action bars, equipped gear, and Champion Point investments. The desktop keeps that observed **CURRENT** state separate from the authored **TARGET** build: synchronization never silently replaces the selected build, Build Notes, variants, recommendations, or future progression. Newly discovered characters always require approval before they are added or linked.

ESO remains in control of when SavedVariables are serialized to disk. ATTB can capture a change in memory before the physical Lua file updates. Loading screens, logout, game exit, and other ESO save opportunities can refresh the files naturally; when the desktop looks stale, **`/reloadui` is the reliable on-demand refresh path**. ATTB intentionally does not promise an instant or fixed-minute synchronization interval.

For the underlying ESO addon constraint, see the [ESOUI SavedVariables timing discussion](https://www.esoui.com/forums/showthread.php?t=8957) and [ESOUI data-storage reference](https://wiki.esoui.com/Storing_data_and_accessing_files).

The desktop app can install/repair the bundled addon automatically. The standalone source, data-contract documentation, and manual-build tooling live in the dedicated repository:

[**Arrow-to-the-Build-ESO-Addon on GitHub**](https://github.com/DeadxxSmile/Arrow-to-the-Build-ESO-Addon)

Detailed desktop ownership, reconciliation, bridge-budget, and troubleshooting behavior is documented in [`ESO_ADDON_INTEGRATION.md`](docs/reference/ESO_ADDON_INTEGRATION.md).

## Data, backups, and privacy

The packaged app stores local data under:

```text
%LOCALAPPDATA%\ArrowToTheBuild
```

Important locations include:

- `attb.db`: active characters, builds, settings, addon snapshots, links, overrides, and progress
- `Backups\`: automatic pre-migration database copies
- `ImageCache\`: optional trusted remote build images

When addon synchronization is enabled, ATTB reads the local ESO profile selected by the user and can install two bundled ESO addon components:

```text
<Elder Scrolls Online profile>\AddOns\ArrowToTheBuild
<Elder Scrolls Online profile>\AddOns\ArrowToTheBuildBridge
```

ESO writes the durable multi-character archive and a deliberately small current-character sync bridge to:

```text
<Elder Scrolls Online profile>\SavedVariables\ArrowToTheBuild.lua
<Elder Scrolls Online profile>\SavedVariables\ArrowToTheBuildBridge.lua
```

ATTB parses both files as restricted data and never executes them. The bridge is kept compact so ESO can use normal SavedVariables save opportunities without waiting for the much larger archive. ESO still controls when any addon data actually reaches disk, so `/reloadui` is the reliable way to force a fresh snapshot when the desktop looks stale. The first-enable screen explains this limitation and links to ZOS/ESOUI documentation. One ESO profile (`live`, `liveeu`, or `pts`) is active at a time. New characters are never added silently; the app can create a newly named editable build from the snapshot or attach an existing compatible-class build as the target.

ATTB has no account system and does not upload character data. External Help & Tools links open in the
default browser. Remote build images are disabled by default and restricted to HTTPS, public network
addresses, real image formats, and a five-megabyte limit.

Character backups are human-readable JSON files and include the selected build definition, profile,
progression, gear completion, and notes. Importing and exporting is available under
**Help & Tools → Character Backups**.

## Creating build JSON

ATTB 2.0 uses the stable public **build Schema 4**. Bundled, imported, manually authored, and visually authored files use the same format. Valid Schema 3 files are migrated automatically during import.

### Start in the app

Open **Build Editor → Build Setup Guide** for the complete offline documentation, and **Build Editor → Import / Export** to export a blank template, export any bundled or imported build as editable JSON, or import a finished build without developer tools. When forking a bundled build, assign the copy a new permanent `id` and name before importing it; bundled IDs are protected from replacement.

The same source documents remain in the repository:

| Task | Document |
|---|---|
| Understand how the app, editor, and JSON fit together | [`BUILD_QUICK_START.md`](docs/reference/BUILD_QUICK_START.md) |
| Use every page of the visual Build Editor | [`BUILD_EDITOR_GUIDE.md`](docs/reference/BUILD_EDITOR_GUIDE.md) |
| Hand-make or directly edit Schema 4 JSON | [`BUILD_JSON_GUIDE.md`](docs/reference/BUILD_JSON_GUIDE.md) |
| Fix validation, draft, revision, or file-sync problems | [`BUILD_VALIDATION_GUIDE.md`](docs/reference/BUILD_VALIDATION_GUIDE.md) |
| Copy a valid importable starting file | [`BUILD_TEMPLATE.json`](docs/reference/BUILD_TEMPLATE.json) |
| Read the compact Schema 4 contract | [`BUILD_FORMAT.md`](docs/reference/BUILD_FORMAT.md) |
| Understand stable line and skill IDs | [`SKILL_CATALOG.md`](docs/reference/SKILL_CATALOG.md) |
| Review the current ESO systems coverage audit | [`ESO_BUILD_SYSTEM_AUDIT.md`](docs/reference/ESO_BUILD_SYSTEM_AUDIT.md) |
| Update the catalog and builds for an ESO patch | [`UPDATING_FOR_GAME_PATCHES.md`](docs/reference/UPDATING_FOR_GAME_PATCHES.md) |
| Add editor validation and autocomplete | [`BUILD_SCHEMA.json`](docs/reference/BUILD_SCHEMA.json) |
| Test the current app and Build Editor | [`TESTING.md`](docs/reference/TESTING.md) |
| Understand the Build Editor architecture | [`BUILD_EDITOR_ARCHITECTURE.md`](docs/reference/BUILD_EDITOR_ARCHITECTURE.md) |
| Install, test, and understand ESO addon synchronization | [`ESO_ADDON_INTEGRATION.md`](docs/reference/ESO_ADDON_INTEGRATION.md) |
| Prepare and verify the 2.0 stable release | [`RELEASE_CHECKLIST.md`](docs/reference/RELEASE_CHECKLIST.md) |
| Review dependency/security audit findings | [`DEPENDENCY_AUDIT.md`](docs/reference/DEPENDENCY_AUDIT.md) |

The seven files in [`resources/builds/`](resources/builds/) are complete working examples. The format
supports profile recommendations, setup help, build concepts, catalog-linked unlocks, progression
phases, structured hotbars, rotations, piece-by-piece gear, Champion Point paths, consumables, tips,
exact Scribing recipes, pure-class or subclass configurations, complete named loadouts, validated variants, quickslots, transformations, companions, performance notes, and namespaced extension data.

Schema 1 and 2 were pre-release formats and are intentionally unsupported. Schema 3 is accepted and normalized to Schema 4; exports always use Schema 4.

## Repository layout

```text
ATTB/
├── BUILD-ATTB.bat
├── LICENSE
├── README.md
├── docs/                  GitHub Pages site and technical references
├── public/                Vite public assets and generated skill-icon cache
├── resources/             Bundled builds, catalog, artwork, icons, and tested ESO addon
├── src/                   Electron main process, shared logic, and React renderer
├── tests/                 Node/Electron regression suite
├── tools/                 Catalog generator, icon fetcher, and test launcher
├── package.json
└── vite.config.js
```

## Security and issue reporting

Report reproducible bugs through
[GitHub Issues](https://github.com/DeadxxSmile/Arrow-to-the-Build/issues). For a security-sensitive
issue, avoid posting private character backups, local paths, or exploit details publicly; contact the
repository owner through the profile information on GitHub first.

Useful diagnostic information includes:

- ATTB version
- Windows version
- whether the issue occurs in development, packaged, or both
- the first relevant console error and stack trace
- exact steps to reproduce

Do not include passwords, authentication tokens, private build files, or unredacted personal paths.

## Contributing

Contributions are welcome. Before submitting a pull request:

1. Keep the app offline-first and build definitions human-readable.
2. Use stable catalog IDs rather than free-form skill names.
3. Run `npm test` and `npm run build:renderer`.
4. Document new build sources and access requirements.
5. Do not add copyrighted artwork unless redistribution is permitted.

## Support and creator links

ATTB is free and open source. To support continued development, use
[Buy Me a Coffee](https://buymeacoffee.com/deadx_xsmile). Other Deadx_xSmile channels and profiles are
collected on [Linktree](https://linktr.ee/deadx_xsmile).

## Current stable release

**v2.0.0** is the stable major release of Arrow to the Build. It completes the shift from the original character checklist into a two-workspace **Character Tracker + Build Editor** with local ESO character synchronization.

The 2.0 release includes guided and advanced Schema 4 authoring, protected recovery drafts and immutable revisions, autosave and undo/redo, local JSON mirroring, seven manually audited Update 50 starter builds, CURRENT-vs-TARGET character comparison, Create Build from Character, Adapt Build to Character, portable Build Notes, synchronized equipment/action bars/Champion Points, and the stable **ESO Companion Addon 1.0.0**.

Release notes: [`RELEASE_NOTES_2.0.0.md`](RELEASE_NOTES_2.0.0.md)

The ESO integration remains intentionally split into `ArrowToTheBuild` (durable archive) and `ArrowToTheBuildBridge` (small current-character bridge), both at **1.0.0**. ESO controls when SavedVariables reach disk; `/reloadui` remains the reliable user-controlled refresh path.

For final regression and upgrade checks, see [`TESTING.md`](docs/reference/TESTING.md) and [`RELEASE_CHECKLIST.md`](docs/reference/RELEASE_CHECKLIST.md). For build creation and authoring, start with [`BUILD_QUICK_START.md`](docs/reference/BUILD_QUICK_START.md).

## License and game disclaimer

Copyright © 2026 DeadxxSmile.

ATTB is licensed under the **GNU General Public License v3.0 only**. See [`LICENSE`](LICENSE).

Arrow to the Build is an unofficial community project. It is not affiliated with, endorsed by, or
sponsored by ZeniMax Media, Bethesda Softworks, or The Elder Scrolls Online. All game names, marks, and
game artwork belong to their respective owners. Skill icons downloaded by the build helper remain
third-party game assets and are not covered by ATTB's GPL license.
