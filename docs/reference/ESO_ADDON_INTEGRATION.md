# ESO Addon Integration

Arrow to the Build can read character state from its optional ESO addon. The integration is deliberately one-way and local:

```text
ESO character
    -> ArrowToTheBuild addon
    -> ArrowToTheBuild.lua SavedVariables
    -> ATTB desktop Character Tracker
```

The addon does not receive commands from the desktop app, automate gameplay, spend points, equip items, or contact a remote service.

## Current components

ATTB 2.1.6 bundles one ESO addon:

```text
ArrowToTheBuild 1.1.0
ESO API: 101050
SavedVariables: ArrowToTheBuildSavedVariables
SavedVariables file: ArrowToTheBuild.lua
SavedVariables schema: 1
Character snapshot schema: 2
```

The former `ArrowToTheBuildBridge` component was retired in 1.1.0. It added a second schema, packed payload, size budgeting, priority-save state, a second file watcher, and reconciliation logic without providing a dependable refresh path beyond ESO's own SavedVariables timing.

## Installation

The desktop app carries the addon under:

```text
resources\addon\ArrowToTheBuild
```

Install / Repair copies it to the selected ESO profile:

```text
<profile>\AddOns\ArrowToTheBuild
```

ATTB recognizes the normal `live`, `liveeu`, and `pts` profile folders. A manually installed or Minion-installed copy is also supported.

v2.1.3 performs a one-time clean migration from the retired dual-addon layout. On first launch, ATTB scans the configured profile and normally detected ESO profiles. If it finds either the verified old bridge manifest or a recognizable old bridge SavedVariables file, it removes the verified bridge addon, removes the managed `ArrowToTheBuild` addon, deletes both old addon SavedVariables files, and installs the bundled single exporter fresh.

The cleanup only claims files it can identify as ATTB data. An unrelated folder named `ArrowToTheBuildBridge` is not deleted. A migration marker prevents the cleanup from repeating on later launches, and a newly generated `ArrowToTheBuild.lua` is therefore preserved. If a custom ESO profile is configured later, the same legacy-artifact check runs for that profile before synchronization starts.

## What the addon captures

The current snapshot contains the observed ESO state that Character Tracker needs:

- account, megaserver, stable character ID, name, class, race, and alliance;
- character level, Champion Point totals, attributes, available attribute points, and available Skill Points;
- skill-line ranks and purchased actives, morphs, passives, and ultimates;
- current action bars and active weapon pair;
- equipped gear, item IDs, traits, sets, and enchantments;
- Champion Point disciplines, purchased stars, and slotted Champion Bar nodes.

This is **CURRENT** state. Builds remain **TARGET** plans owned by the desktop app. Syncing cannot rewrite a build definition.

## SavedVariables timing

The addon updates its in-memory SavedVariables table when relevant ESO events occur. ESO decides when that table is serialized to disk. The desktop cannot force ESO to write the file and the addon cannot directly communicate with the desktop application.

When the desktop needs a fresh snapshot immediately, use:

```text
/reloadui
```

Loading screens, logout, exit, and other ESO-controlled save opportunities may also result in a newer disk file, but ATTB does not promise their timing.

The first-run dialog and Settings page both state this limitation. The desktop watches:

```text
<profile>\SavedVariables\ArrowToTheBuild.lua
```

and also polls at a low frequency to cover ordinary Windows file-watcher edge cases. It waits for the file to stabilize before parsing and skips unchanged revisions.

## ESO API policy

Addon 1.1.0 targets Update 50 / API 101050 and uses known ESO APIs and event constants directly.

The addon intentionally does **not** wrap documented APIs in generic `pcall` helpers, probe `_G` for guessed function names, or register events from strings. If a supported ESO API changes, that should become a visible development error instead of silently turning real character data into a fallback value.

Guards remain only where the game data itself can legitimately be absent or optional.

## Refresh strategy

The addon does not rescan the complete character on every gameplay event.

- level and attribute events refresh identity/progression;
- Skill Point, skill-rank, skill-line, ability-rank, and ability-result events refresh skills;
- action-bar and weapon-pair events refresh action bars;
- worn-inventory changes refresh equipment;
- Champion Point purchase and bar changes refresh Champion data;
- player activation/deactivation schedules a full snapshot around transitions.

Automatic event captures are debounced and rate-limited. Raw skill-XP ticks are deliberately not used as full-rescan triggers because ATTB cares about purchased/rank state rather than every XP increment.

A forced full capture still occurs before a player deactivation and after activation, so `/reloadui` receives an up-to-date complete snapshot even when a recent event capture was cooling down.

## Desktop parsing and safety

ATTB parses SavedVariables with its restricted Lua-table parser. It does not execute the Lua file with `eval`, `load`, a shell, or a Lua interpreter.

The parser accepts the table syntax ESO writes and rejects executable Lua, unsupported roots, malformed data, prototype-polluting keys, and oversized files.

A supported archive currently requires:

```text
schemaVersion = 1
```

Each character snapshot is normalized into the desktop's internal snapshot contract before it can update a linked Character Tracker profile.

## Character discovery and linking

Characters are keyed by:

```text
ESO account + megaserver + stable ESO character ID
```

Names are display data rather than identity keys, so a rename does not create a second character.

New snapshots are never silently added to Character Tracker. The user can:

- create a new synced ATTB character and choose/create its target build;
- link the snapshot to a compatible existing manual ATTB character;
- dismiss the snapshot and link it later from Settings.

Class mismatches are rejected at both UI and IPC boundaries.

## Overrides

Synced identity fields stay read-only. Optional override mode can temporarily replace selected progression fields in the desktop without changing the underlying ESO snapshot.

Disabling override mode deletes those overrides and immediately restores the last observed ESO values.

## Addon commands

The addon provides:

```text
/attbexport
/attbstatus
/attbcharacters
```

`/attbexport` refreshes the current in-memory snapshot. Use `/reloadui` afterward when the desktop needs it written to disk immediately.

`/attbstatus` reports the addon/API/world, the archive state loaded from disk, the current in-memory revision, latest capture reason/age, pending refresh sections, and the `/reloadui` reminder.

`/attbcharacters` lists the snapshots currently held in the multi-character archive.

## Failure behavior

- Missing addon folder: Settings offers Install / Repair.
- Addon installed but no SavedVariables file: log into ESO and run `/reloadui` once.
- Unsupported archive schema: sync stops with an explicit error.
- Malformed/executable Lua: rejected before data reaches Character Tracker.
- Newer manually installed addon: preserved by default rather than downgraded.
- Retired bridge folder: removed only when positively identified as ATTB's old bridge.
- Sync disabled: the last imported desktop state and selected build remain intact.
- Unlinked character: current effective values become manual and the snapshot remains available for later relinking.

## Development disclosure

The project uses AI-assisted development. Addon changes are expected to be reviewed against the current ESO API, covered by regression tests, and kept maintainable rather than accepted simply because generated code runs. The addon source README carries the same disclosure and the unofficial-project disclaimer.
