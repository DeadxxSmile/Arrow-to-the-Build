# Arrow to the Build v2.0.0 - The Build Comes Alive

**Arrow to the Build 2.0.0** is the major release that turns ATTB from a character progression checklist into a full **Character Tracker + Build Editor** for *The Elder Scrolls Online*.

The goal is still the same: a build guide should tell you more than what an endgame character looks like. ATTB follows the character you actually have, shows what matters next, and keeps the future target understandable from Level 1 through CP160 and beyond.

Version 2.0 adds a second half to that idea: ATTB can now observe your real ESO character locally, compare CURRENT state with the TARGET build, and even use that state as the starting point for a new editable build.

> **I Used To Be Meta Like You, Then I Took An Arrow To The Build**

## What is new in 2.0

### Two complete workspaces

ATTB now has two remembered workspaces:

- **Character Tracker** - follow a real character through levels, skills, passives, equipment, action bars, Champion Points, consumables, and build-specific guidance.
- **Build Editor** - create, import, fork, validate, revise, compare, and export complete Schema 4 builds without hand-editing JSON unless you want to.

The Build Editor includes guided creation, advanced editing, recovery drafts, autosave, undo/redo, immutable saved revisions, revision comparison, loadouts and variants, Build Notes, validation, quality suggestions, and automatic human-readable JSON mirrors for saved user builds.

Bundled builds remain read-only. Editing one creates a user-owned fork rather than silently modifying the shipped source.

### ESO Companion Addon 1.0.0

The desktop release bundles the stable **Arrow to the Build ESO Companion Addon 1.0.0**.

It is split into two silent components:

- `ArrowToTheBuild` - the durable, fuller multi-character archive.
- `ArrowToTheBuildBridge` - a deliberately compact current-character bridge with a 32 KiB internal budget.

The addon can export locally observed character information including:

- account/server/stable character identity
- class, race, alliance, level, attributes, and available points
- skill-line ranks
- purchased abilities, morphs, ultimates, and passive ranks
- front and back action bars
- equipped armor, jewelry, weapons, traits, enchants, and set information
- Champion Point totals, purchased stars, and slotted stars

The desktop app can install or repair both components automatically and watches both SavedVariables sources.

**No account, cloud service, network communication, combat automation, or gameplay modification is involved.** The addon exports data; ATTB decides how to display it.

Addon source and technical documentation:

https://github.com/DeadxxSmile/Arrow-to-the-Build-ESO-Addon

### CURRENT reality stays separate from TARGET planning

ESO synchronization never gets to silently rewrite the build you chose.

ATTB keeps three concepts separate:

1. the latest observed ESO state;
2. optional per-field local overrides;
3. the authored target build and its future recommendations.

That means a gear swap in ESO can update **Currently Equipped** without replacing the final gear roadmap. A changed action bar can update the observed bar without rewriting the authored rotation. A new skill purchase can mark current progress without inventing where it belonged historically.

Newly discovered ESO characters are also never silently added or merged. ATTB asks first.

### Create Build from Character

A synchronized character can become the starting point for a new editable Schema 4 build.

ATTB imports the CURRENT state it can prove-identity, attributes, owned skills/passives/morphs, action bars, equipment, and Champion data-without inventing future recommendations or fabricated leveling history.

Before the draft is created, you choose its permanent identity and planning direction.

### Adapt Build to Character

An existing build can also be adapted around a synchronized character.

ATTB preserves the original TARGET plan while overlaying current ownership and equipment. Bundled builds fork automatically. Imported progress is labeled truthfully as **Owned at Import**, **Catch Up**, or **Future** rather than pretending ATTB knows when an older purchase happened.

## The Mighty Seven - audited for Update 50

2.0 ships one flexible pure-class PvE progression baseline for every ESO class:

- Stamina Arcanist
- Magicka Dragonknight
- Stamina Necromancer
- Stamina Nightblade
- Magicka Sorcerer
- Magicka Templar
- Magicka Warden

Before release, all seven were manually re-audited as **ESO builds**, not merely valid JSON. The pass reviewed current mainstream Update 50 buildcraft and corrected passive priorities, weapon bars, Scribing recipes, Champion Points, gear-stage set counts, consumables, source metadata, and practical solo/group alternatives.

They remain **baseline progression builds**, not claims that one loadout is best for every trial, dungeon, arena, PvP campaign, or group composition. ATTB deliberately leaves room for crafting and personal progression instead of spending every available Skill Point merely because a passive exists.

## Character Tracker highlights

- character level, race, alliance, attributes, and separate Craft/Warfare/Fitness CP totals
- complete ESO skill-line catalog with ranks, abilities, morphs, ultimates, and multi-rank passives
- dynamic next-purchase guidance driven by prerequisites and actual progression
- build-related versus personal Skill Point accounting
- observed and authored action bars with skill icons
- structured rotations and priority systems
- leveling, starter, intermediate, and final gear stages
- piece-by-piece equipment completion and currently equipped ESO gear
- Champion Point paths, branches, investments, and final slottable bars
- consumables, warnings, tips, alternatives, and Build Notes
- character backup import/export
- per-field synchronized-data overrides with restoration to the latest live value

## Build Editor highlights

- Build Library for bundled, imported, and user-owned builds
- guided build creation
- editable Schema 4 Overview and Build Notes
- Character Setup and Class Configuration
- pure-class and subclass-aware authoring support
- skills, passives, morphs, Scribing, and ordered progression authoring
- phase hotbars and rotations
- equipment stages and acquisition information
- Champion Point planning
- loadouts and variants
- recovery drafts and autosave
- undo/redo
- validation, warnings, suggestions, preview, and Review & Save
- immutable revisions and revision comparison
- automatic readable JSON mirrors for permanently saved user builds

## Schema 4

Schema 4 is the stable public build format used by bundled, imported, manually authored, and visually authored builds.

Valid Schema 3 imports are normalized to Schema 4. Schema 1 and 2 were pre-release formats and are intentionally unsupported.

The repository and app include a Quick Start, full visual-editor guide, manual JSON guide, format reference, skill/catalog reference, validation guide, game-system coverage audit, patch-maintenance guide, and blank importable template.

## SavedVariables timing: important

ESO controls when addon SavedVariables are serialized to the physical Lua files on disk.

The ATTB addon can update its in-memory snapshot immediately, and the small bridge can request a best-effort priority save, but **the addon cannot force ESO to write to disk immediately**. Heavy addon load can also affect when a save opportunity completes.

Natural refresh opportunities include:

- loading screens
- logout
- exiting ESO
- other client save opportunities

When you want a reliable user-controlled refresh **right now**, run:

```text
/reloadui
```

ATTB intentionally does **not** promise an instant or fixed-minute synchronization cadence.

## Release hardening

The final 2.0.0 dependency pass upgrades `react-router-dom` from 6.30.4 to **7.18.2** using an npm-generated lockfile, clearing the React Router advisory tracked during the release freeze. The retired v6 future flags were removed because their behaviors are native defaults in React Router v7.

The final release candidate must still pass the complete Windows-native SQLite suite, production renderer build, all-route boot smoke test, installer build, and installed-app upgrade smoke test before publication.

## Installation

Download and run:

```text
ATTB-Setup-2.0.0.exe
```

ATTB is currently an unsigned Windows application. Windows may display **Unknown Publisher**, Microsoft Defender SmartScreen, or Smart App Control warnings. Review the source and only bypass warnings for files you trust.

You can also build the installer directly from source with:

```text
BUILD-ATTB.bat
```

The script installs the locked npm dependencies, refreshes available skill icons, runs the complete test suite through Electron's embedded Node runtime, builds the renderer, and creates the NSIS installer.

## Upgrading

Installing 2.0.0 over an existing ATTB installation preserves the local application data directory and runs required SQLite migrations on startup.

The final release was designed to preserve:

- characters and selected builds
- character progression and notes
- user builds
- recovery drafts and immutable revisions
- settings
- addon snapshots and character links
- synchronized-data overrides
- configured user-build JSON paths

Exporting a character backup before a major upgrade is still sensible.

If an older ATTB addon is already installed, use **Settings → General Settings → Install / Repair Addon** to replace both addon components with the bundled 1.0.0 release.

## Local data and privacy

ATTB is offline-first.

- No ATTB account is required.
- No telemetry or analytics are included.
- Character data is stored locally in SQLite.
- The ESO addon writes only normal local SavedVariables.
- The addon does not communicate with the network.
- ATTB parses SavedVariables as restricted data and never executes the Lua file.
- Remote build images are disabled by default and restricted when enabled.

## Thanks

2.0 grew substantially beyond the original progression tracker. Real ESO testing, repeated clean installs, deliberately broken fixtures, buildcraft reviews, and a frankly unreasonable number of screenshots helped turn it into something much closer to the tool the project originally wanted to be.

If you find a reproducible problem, please open an issue with the ATTB version, Windows version, exact reproduction steps, and the first relevant error message. Do not post private character backups, authentication data, or unredacted personal paths.

## Links

- Project website: https://deadxxsmile.github.io/Arrow-to-the-Build/
- Desktop source: https://github.com/DeadxxSmile/Arrow-to-the-Build
- ESO addon source: https://github.com/DeadxxSmile/Arrow-to-the-Build-ESO-Addon
- Issues: https://github.com/DeadxxSmile/Arrow-to-the-Build/issues
- Support: https://buymeacoffee.com/deadx_xsmile

## Disclaimer

Arrow to the Build is an unofficial community project. It is not affiliated with, endorsed by, or sponsored by ZeniMax Media, Bethesda Softworks, or *The Elder Scrolls Online*. All game names, marks, artwork, and skill icons belong to their respective owners.
