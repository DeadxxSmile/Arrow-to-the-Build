# Arrow to the Build (ATTB)

> **I Used To Be Meta Like You, Then I Took An Arrow To The Build**

Current public release: **v3.1.0**  
Current development version: **v3.1.0**

**Arrow to the Build** is an offline-first Windows companion for **The Elder Scrolls Online**. It combines a character progression tracker with a full visual build editor so a static build guide becomes an actual plan for a specific character: what to unlock next, which skill-line ranks matter, how to spend Champion Points, what gear to chase, what belongs on each bar, and how the finished build fits together.

ATTB keeps character and build data on your PC. There is no account system or cloud requirement, and build definitions remain human-readable JSON files.

[![Latest Release](https://img.shields.io/github/v/release/DeadxxSmile/Arrow-to-the-Build)](https://github.com/DeadxxSmile/Arrow-to-the-Build/releases/latest)
[![Platform](https://img.shields.io/badge/platform-Windows-lightgrey)](https://github.com/DeadxxSmile/Arrow-to-the-Build/releases/latest)
[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](LICENSE)

[Website](https://arrowtothebuild.com) ·
[Latest Release](https://github.com/DeadxxSmile/Arrow-to-the-Build/releases/latest) ·
[ESO Addon Source](https://github.com/DeadxxSmile/Arrow-to-the-Build-ESO-Addon) ·
[Issues](https://github.com/DeadxxSmile/Arrow-to-the-Build/issues) ·
[Buy Me a Coffee](https://buymeacoffee.com/deadx_xsmile) ·
[Deadx_xSmile](https://linktr.ee/deadx_xsmile)

---

## What ATTB does

ATTB is split into three remembered workspaces that share the same local character and build data.

### Character Tracker

The Character Tracker is the play-side workspace. It keeps the selected build beside the character's current ESO progress and answers the practical question: **what should I do next?**

It can track:

- character level, class, race, alliance, and attributes
- Craft, Warfare, and Fitness Champion Point totals
- skill-line ranks, purchased abilities, morphs, passives, and ultimates
- build-required versus personal Skill Point spending
- build-specific next-purchase recommendations based on prerequisites, current line ranks, and available Skill Points
- temporary leveling unlocks that retire when their job is done, with per-character keep/retire choices and reclaimable Skill Point cleanup
- scope-aware equipment planning: full leveling stages for new characters, or transition/bridge/final targets for existing Level 50 and CP160+ characters
- front and back action bars plus rotations or priority systems
- Champion Point paths, optional branches, and final slottables
- combat-companion targets, equipment direction, traits, abilities, Ultimate, and playstyle notes
- build variants and loadouts
- character backups and restore
- optional per-character Basic Info screenshots, copied into local app data and safely re-encoded before display
- a dedicated Help & Tools workspace with grouped Gear, Combat, Progression, Companion, and Reference sections for the ESO concepts that sit around a build

Synced ESO values remain separate from the authored build target, so live character data never silently rewrites the build you are following.

### Build Editor

The Build Editor is the authoring workspace. It can create, fork, import, edit, validate, revise, and export complete ATTB builds without hand-editing JSON.

Highlights include:

- guided build creation and blank-build authoring
- explicit build starting points for **New character**, **Existing Level 50**, and **Existing CP160+** plans, so ATTB does not require fictional leveling content for an established character
- protected forks of bundled builds
- autosave and recovery drafts
- undo and redo
- immutable saved revisions and revision comparison
- visual editing for setup, class configuration, skills, progression phases, equipment, Champion Points, bars, rotations, companions, consumables, variants, and loadouts
- temporary-unlock retirement cutoffs by character level, skill-line rank, or replacement unlock
- Review & Save validation before a permanent build is written
- automatic human-readable JSON mirrors for saved user builds
- configurable user-build storage, defaulting to `Documents\Arrow to the Build\Builds`

The visual editor and imported files use the same public **Schema 4** build format. Schema 4 includes optional `progression_scope` metadata; older Schema 4 files that omit it retain the historical new-character/leveling behavior.

---

## Bundled builds: the Mighty Seven

ATTB ships with one flexible PvE progression build for every ESO class.

| Class | Bundled build |
|---|---|
| Arcanist | Stamina Arcanist Flexible PvE |
| Dragonknight | Magicka Dragonknight Flexible PvE |
| Necromancer | Stamina Necromancer Flexible PvE |
| Nightblade | Stamina Nightblade Flexible PvE |
| Sorcerer | Magicka Sorcerer Flexible PvE |
| Templar | Magicka Templar Flexible PvE |
| Warden | Magicka Warden Flexible PvE |

These are progression-oriented starting points rather than claims that one loadout is perfect for every dungeon, trial, PvP campaign, or group composition. They are intended to demonstrate complete, coherent ATTB builds while giving new and returning characters a practical route from leveling into permanent gear and Champion Point planning. Temporary leveling purchases in the Mighty Seven now carry explicit retirement cutoffs, so filler skills can leave the recommendation queue once the build has moved past them.

Build research and attribution notes are kept in [`docs/maintenance/BUNDLED_BUILD_SOURCES.md`](docs/maintenance/BUNDLED_BUILD_SOURCES.md).

---

## ESO addon and character synchronization

ATTB includes an optional local ESO addon named **ArrowToTheBuild**. The desktop app can install or repair it automatically; Minion or ESOUI installation is not required.

The addon has one job: capture character state into ESO's normal SavedVariables system so the desktop app can read it.

It can export:

- character identity and level
- attributes and available points
- skill-line ranks
- purchased abilities and morphs
- passive ranks
- current action bars
- equipped gear
- Champion Point investments and slotted Champion skills

The integration uses one addon and one SavedVariables file:

```text
<Elder Scrolls Online profile>\AddOns\ArrowToTheBuild
<Elder Scrolls Online profile>\SavedVariables\ArrowToTheBuild.lua
```

ATTB parses the SavedVariables file as restricted data and never executes it.

### What the addon does not do

The addon does **not**:

- automate combat
- spend Skill Points or Champion Points
- equip gear
- control the player
- send commands from the desktop app back into ESO
- upload character data to an ATTB server

### SavedVariables timing

ESO controls when addon SavedVariables are written to disk. The addon may already have newer information in memory while the physical Lua file is still unchanged.

Loading screens, logout, game exit, and other ESO save opportunities may update the file naturally. When you want the desktop app to refresh immediately, **`/reloadui` is the reliable user-controlled method**.

For installation, linking, refresh behavior, and troubleshooting, see [`ESO_ADDON_INTEGRATION.md`](docs/reference/ESO_ADDON_INTEGRATION.md).

Standalone addon source is maintained separately at [Arrow-to-the-Build-ESO-Addon](https://github.com/DeadxxSmile/Arrow-to-the-Build-ESO-Addon).

---

## Combat companions

ATTB includes all current ESO combat companions with two curated starter setups for each companion.

A companion target can include:

- role and playstyle
- weapon type
- armor weight
- weapon, armor, and jewelry traits
- equipment guidance
- five abilities in priority order
- Ultimate
- notes and research source

Companion targets can be selected per character in the Character Tracker or authored directly into Schema 4 builds in the Build Editor.

---

## Help & Tools workspace

Help & Tools is a full third workspace beside Character Tracker and Build Editor. Its sidebar separates Gear, Combat, Progression, Companions, and general Reference material so the useful answer is one click away instead of buried under one giant reference page.

A compact Character / Build / Help tab strip fills the top of the sidebar in every workspace, while Settings remains pinned on its own at the bottom.

The reference library covers:

- gear/set slot math, bar-specific sets, Monster Sets, Mythics, arena weapons, Perfected gear, and set sources
- player equipment traits and a trader-focused shopping read
- armor, weapon, and jewelry enchantments/glyphs
- combat stats, penetration context, Critical Damage limits, and sustain terminology
- Major/Minor buffs and debuffs plus damage-type status effects
- Light, Medium, and Heavy Armor roles and mixed-weight reasoning
- weapon-line roles, front/back bars, stat sticks, and bar swapping
- a step-by-step ESO-Hub/guild-trader shopping checklist
- all 13 Mundus Stones and Divines interaction
- Champion Point paths, jump points, passives, slottables, and the four-slot rule
- skill ranks, morphs, passives, temporary/final/optional status, Class Mastery, and Scribing terms
- Scribing Grimoires and Focus/Signature/Affix Scripts
- food, drinks, potions, poisons, and Medicinal Use
- common build-language glossary terms
- companion roles, cooldown priorities, taunts, and companion-only traits

These pages are intentionally build-focused rather than exhaustive wiki replacements: they explain the mechanic and then explain why it matters while following an ATTB target.

---

## Themes and interface

ATTB includes twenty built-in themes:

- **ATTB Default** - dark navy/charcoal with bronze and muted cyan accents
- **Deep Dark** - near-black with restrained green/cyan accents
- **Light** - comfortable off-white and blue-gray surfaces with stronger panel/navigation contrast
- **Old Scrolls** - ESO-site-inspired charcoal, black, and gold
- **SkyTrim** - Skyrim-menu-inspired monochrome black, white, and layered gray
- **Woodland** - muted hunter green, sage, tan, and cream built around `#3B6255`
- **Watermelon** - dark rind greens with muted watermelon coral, cream, and seed-dark surfaces
- **Rainbow Light** - soft neutral light surfaces with restrained rose, amber, green, blue, and violet accents
- **Rainbow Dark** - deep neutral surfaces with the same restrained spectrum for a colorful dark option
- **Deadx_xSmile** - near-black creator palette with electric `#ED2490` pink, `#2078E2` blue, cyan highlights, and restrained violet neon accents
- **Midnight Blurple** - charcoal-blue with vivid blurple, cyan, and violet highlights
- **Tokyo Dusk** - deep navy/indigo with crisp blue, cyan, violet, and amber accents
- **Velvet Plum** - aubergine with violet, mauve, mint, and soft peach accents
- **Emberbox** - warm charcoal-brown with burnt orange, mustard, muted aqua, and olive
- **Polar Night** - cool slate with icy cyan, glacier blue, pale gold, and lavender
- **OLED Aurora** - true black with electric cyan, teal, violet, and high-contrast states
- **Carbon Crimson** - graphite with crimson actions, steel blue, and warm amber
- **Paper Azure** - cool light surfaces with azure blue, teal, and neutral layering
- **Latte Rose** - warm cream/blush with rose, dusty lavender, coffee brown, and sage
- **Sage Fog** - medium sage-gray with forest, slate blue, and terracotta accents

Version 3 adds **Theme Schema 1**, so those built-in palettes and user-created palettes run through the same semantic color engine. Under **Settings -> General -> Theme**, you can create a custom theme from any existing theme, edit the major colors in Simple mode or the full semantic palette in Advanced mode, preview changes live, enter colors with the graphical picker or exact HEX/RGB values, reset inherited values, and save the result without editing CSS.

Custom themes are ordinary JSON files stored in ATTB's user theme folder. Settings can import/export them, open or reload that folder, and export `ATTB_THEME_TEMPLATE.json` for manual authoring and sharing. Imported themes are validated as declarative color data; arbitrary CSS and executable content are not part of the theme format. See [Theme Authoring](docs/reference/THEME_AUTHORING.md) for the schema and token reference.

Themes change palette and approved surface treatment while keeping the same typography and layout metrics, so switching themes does not move labels, alter text wrapping, or change control geometry.

---

## Install on Windows

### Published installer

1. Open the [latest release](https://github.com/DeadxxSmile/Arrow-to-the-Build/releases/latest).
2. Download `ATTB-Setup-<version>.exe` from the release assets.
3. Exit ESO before upgrading if the game is running.
4. Run the installer.
5. Launch ATTB.

Installing a newer version preserves the local database and applies any required database migrations at startup.

### Unsigned Windows warning

ATTB is free and open source and the installer is currently unsigned. Windows may display **Unknown Publisher**, SmartScreen, or Smart App Control warnings.

Only bypass a warning when the installer came from this repository or another source you trust.

No additional runtime needs to be installed for the packaged application.

---

## Build from source

### Requirements

- Windows 10 or Windows 11
- a current Node.js LTS release with npm
- internet access while installing dependencies and downloading optional ESO skill icons

### One-step Windows build

Clone or download the repository, then run:

```bat
BUILD-ATTB.bat
```

The build script:

1. installs the exact dependency versions from `package-lock.json`
2. downloads available ESO skill icons into the local build cache
3. runs the regression suite through Electron's embedded Node runtime
4. builds the Vite renderer
5. creates the NSIS Windows installer

The finished installer is written to:

```text
dist\ATTB-Setup-<version>.exe
```

On success, the build script prints the full path to the generated installer in `dist`.

### Development commands

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

Build only the renderer:

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

Development mode stores `attb.db` in the repository root. Development database and generated build folders are ignored by Git.

---

## Data, backups, and privacy

ATTB is local-first and has no account system.

The packaged app stores application data under:

```text
%LOCALAPPDATA%\ArrowToTheBuild
```

Important locations include:

- `attb.db` - characters, builds, settings, addon snapshots, links, overrides, and progress
- `Backups\` - automatic pre-migration database copies
- `ImageCache\` - optional cached images from trusted imported builds

Saved user builds default to:

```text
Documents\Arrow to the Build\Builds
```

The build folder can be changed from the app. ATTB copies managed builds before switching and protects externally modified JSON from silent overwrites.

Remote build images are disabled by default. If enabled, ATTB restricts downloads to HTTPS, public network addresses, real image formats, and a five-megabyte size limit.

Character backups are human-readable JSON and can be imported or exported from **Character Tracker -> Character Data -> Backups & Import**. Custom Basic Info screenshots are local visual preferences and are intentionally not embedded in backup JSON.

---

## Build JSON and authoring docs

ATTB uses the public **Schema 4** build format. Bundled builds, imported builds, visually authored builds, and manually edited files all use the same contract.

Valid Schema 3 files can be normalized during import. Schema 1 and 2 were pre-release formats and are intentionally unsupported.

Start inside the app with **Build Editor -> Build Setup Guide**. The same source documentation is available in the repository:

| Task | Document |
|---|---|
| Understand ATTB builds and JSON | [`BUILD_QUICK_START.md`](docs/reference/BUILD_QUICK_START.md) |
| Use the visual Build Editor | [`BUILD_EDITOR_GUIDE.md`](docs/reference/BUILD_EDITOR_GUIDE.md) |
| Hand-edit Schema 4 JSON | [`BUILD_JSON_GUIDE.md`](docs/reference/BUILD_JSON_GUIDE.md) |
| Give an AI a complete ATTB authoring manual | [`ATTB_AI_BUILD_JSON_AUTHORING_GUIDE.md`](docs/reference/ATTB_AI_BUILD_JSON_AUTHORING_GUIDE.md) |
| Troubleshoot validation and file sync | [`BUILD_VALIDATION_GUIDE.md`](docs/reference/BUILD_VALIDATION_GUIDE.md) |
| Copy a blank importable build | [`BUILD_TEMPLATE.json`](docs/reference/BUILD_TEMPLATE.json) |
| Read the compact Schema 4 contract | [`BUILD_FORMAT.md`](docs/reference/BUILD_FORMAT.md) |
| Understand stable line and skill IDs | [`SKILL_CATALOG.md`](docs/reference/SKILL_CATALOG.md) |
| Install and troubleshoot ESO synchronization | [`ESO_ADDON_INTEGRATION.md`](docs/reference/ESO_ADDON_INTEGRATION.md) |

Maintainer audits, testing notes, patch-update procedures, architecture notes, and release checklists live under [`docs/maintenance/`](docs/maintenance/) rather than being mixed into the user-facing reference material.

---

## Repository layout

```text
ATTB/
├── BUILD-ATTB.bat
├── LICENSE
├── README.md
├── docs/                  Website, user references, and maintainer notes
├── public/                Vite assets and generated skill-icon cache
├── resources/             Bundled builds, catalogs, artwork, and ESO addon
├── src/                   Electron main process, shared logic, and React renderer
├── tests/                 Regression suite
├── tools/                 Catalog, icon, and test tooling
├── package.json
└── vite.config.js
```

---

## Reporting issues

Report reproducible bugs through [GitHub Issues](https://github.com/DeadxxSmile/Arrow-to-the-Build/issues).

Useful information includes:

- ATTB version
- Windows version
- whether the issue occurs in development, packaged, or both
- exact steps to reproduce
- the first relevant console error or stack trace

Do not include passwords, authentication tokens, private build files, or unredacted personal file paths.

For security-sensitive issues, avoid posting exploit details or private data publicly; contact the repository owner through the GitHub profile first.

---

## Contributing

Contributions are welcome. Before submitting a pull request:

1. Keep the app offline-first and build definitions human-readable.
2. Use stable catalog IDs instead of free-form skill names.
3. Keep theme-facing colors inside the shared theme palette rather than hardcoding them into components.
4. Run `npm test` and `npm run build:renderer`.
5. Document new build sources and access requirements.
6. Do not add copyrighted artwork unless redistribution is permitted.

---

## Support

ATTB is free and open source.

If you want to support continued development, use [Buy Me a Coffee](https://buymeacoffee.com/deadx_xsmile). Other Deadx_xSmile channels and profiles are collected on [Linktree](https://linktr.ee/deadx_xsmile).

---

## License and game disclaimer

Copyright © 2026 DeadxxSmile.

ATTB is licensed under the **GNU General Public License v3.0 only**. See [`LICENSE`](LICENSE).

Arrow to the Build is an unofficial community project. It is not affiliated with, endorsed by, or sponsored by ZeniMax Media, Bethesda Softworks, or The Elder Scrolls Online. All game names, marks, and game artwork belong to their respective owners. Skill icons downloaded by the build helper remain third-party game assets and are not covered by ATTB's GPL license.
