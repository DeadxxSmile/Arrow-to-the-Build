# ESO Addon Integration

Arrow to the Build can install and read its ESO companion integration. It is split into two silent local addon components: **ArrowToTheBuild**, which keeps the durable multi-character archive, and **ArrowToTheBuildBridge**, which keeps a tiny current-character payload for faster desktop synchronization. Neither component shows combat advice, makes gameplay decisions, spends points, or communicates over the network.

> **I Used To Be Meta Like You, Then I Took An Arrow To The Build**

## What is synchronized

After the addon has seen a character, it records a compact snapshot containing:

- ESO account, megaserver, stable character ID, character name, class, race, and alliance
- level, Champion level, spent attributes, available attribute points, and available Skill Points
- discovered skill lines and ranks
- purchased active skills, morphs, passives, and ultimates
- front and back action bars
- equipped armor, jewelry, weapons, traits, enchantments, and item sets
- invested and slotted Champion Points
- addon, API, snapshot-schema, capture-reason, and timestamp metadata

The main addon writes the complete multi-character archive to:

```text
<Elder Scrolls Online profile>\SavedVariables\ArrowToTheBuild.lua
```

The separate sync bridge writes only the currently active character to:

```text
<Elder Scrolls Online profile>\SavedVariables\ArrowToTheBuildBridge.lua
```

ATTB never executes either file. The main process uses a restricted parser that accepts only the expected SavedVariables assignment containing Lua table data, strings, numbers, booleans, and `nil`.

### Why there are two SavedVariables files

ESO controls when addon SavedVariables are flushed to disk. ATTB can capture a gameplay change immediately in addon memory, but the desktop cannot see it until ESO writes the SavedVariables file. Large or slow-to-serialize addon files can be deferred until a loading screen, `/reloadui`, logout, or exit. The bridge therefore packs only the active character into a bounded payload so it can use normal gameplay save opportunities without waiting for the complete multi-character archive. **`/reloadui` is the reliable user-controlled way to force a fresh snapshot when immediate desktop refresh matters.**

The durable archive does not request normal-play save priority; only the small bridge competes for the priority save opportunity. The bridge skips a priority request during player deactivation because logout/reload is already a natural SavedVariables flush point; this avoids carrying a freshly consumed priority throttle into the next login. The first-enable screen presents this limitation before synchronization is enabled and links to the ZOS save-timing discussion at `https://www.esoui.com/forums/showthread.php?t=8957` plus the ESOUI SavedVariables explanation at `https://wiki.esoui.com/Storing_data_and_accessing_files`.

Bridge schema 2 uses a **32 KiB internal soft budget**, leaving substantial headroom below ESO's roughly 50 KiB normal-play size ceiling. Repeating skill, action-bar, equipment, and Champion Point records are flattened into tab-separated rows and newline-separated row blobs instead of hundreds of nested Lua tables. Skill and Champion data is ID-first; identity display names remain for discovery, while arbitrary equipment/set names remain because they cannot always be resolved from the desktop catalog. Every publish replaces the previous bridge root rather than appending a history, so the file has a natural size ceiling.

If the conservative serialization estimate approaches the internal budget, the bridge follows a deterministic reduction order: enchantment text, equipment/set display names, then detailed Champion Point rows, equipment, and skills only as progressively more severe last resorts. Identity and core numeric progression are never discarded. The payload records `estimatedBytes`, `budgetBytes`, `budgetStatus`, `reducedFields`, `droppedSections`, and `truncated`. When a section is omitted, the desktop preserves that section from the latest complete snapshot and labels the sync as partial until the durable archive reaches disk.

## First-launch setup

On the first launch that includes addon integration, ATTB asks whether to enable automatic character synchronization.

- **Install Addon and Enable Sync** searches the Windows Documents known folder for `live`, `liveeu`, or `pts`, copies both bundled tested addon components into `AddOns\ArrowToTheBuild` and `AddOns\ArrowToTheBuildBridge`, and starts watching the corresponding SavedVariables location.
- **I Already Installed It** connects to an existing installation or an existing SavedVariables file.
- **Choose Folder Manually** accepts the ESO profile root, its `AddOns` folder, its `SavedVariables` folder, or either ATTB addon folder.
- **Not Now** disables the feature without asking again at every launch. It can be enabled later under **Settings → General Settings**.

One ESO profile root is active at a time. The database records which profile supplied each snapshot so switching between NA, EU, and PTS does not mix discovery lists.

## Installation and repair

The desktop installer carries tested copies of both components under:

```text
resources\addon\ArrowToTheBuild
resources\addon\ArrowToTheBuildBridge
```

The app copies them to:

```text
<profile>\AddOns\ArrowToTheBuild
<profile>\AddOns\ArrowToTheBuildBridge
```

The operation does not touch either SavedVariables file. **Install / Repair Addon** stages and replaces each component independently. A separately installed newer component is reported and preserved, so the bundled copy never intentionally downgrades a newer manual or Minion installation.

Minion and manual installation remain valid. Both components should be enabled for the smallest practical ESO-controlled sync payload; the main addon can still maintain the durable archive without the bridge.

## Character discovery and linking

A character becomes discoverable after the addon has captured it and ESO has written SavedVariables. ATTB identifies the character with:

```text
ESO account + megaserver + stable ESO character ID
```

Names are display data, not identity keys. Character renames therefore update the linked profile rather than creating a duplicate.

When a new snapshot appears, ATTB asks whether to add and sync the character. The user can either **create a new editable build from the current ESO state** or attach a saved compatible-class build as the target. New-build creation collects the build name, short name, permanent build ID, role, resource, progression scope, bar count, and class direction before the draft is created, so the immutable build ID is never chosen behind the user's back. Bundled builds and user builds with a permanent saved revision remain eligible as existing targets; unrelated draft-only builds are not offered as targets.

When an unlinked manual ATTB character has the same name and class, ATTB offers two explicit choices:

- link the ESO character to the existing ATTB profile; or
- create a separate synced character.

No probable match is merged automatically.

## Ownership boundaries

The addon controls observed game state:

- identity
- level and attributes
- available points
- skill-line ranks and purchased skills
- Champion Point totals and observed stars
- current action bars
- currently equipped gear

The desktop app continues to own:

- selected build, loadout, and variant
- authored build content
- build recommendations and unlock order
- gear-acquisition checklists
- notes
- drafts, revisions, and user build JSON files

Syncing never edits ESO and never rewrites a build definition.

## Override mode

ATTB stores three layers for synced values:

1. the latest read-only ESO snapshot;
2. optional per-field user overrides; and
3. the effective value displayed by the Character Tracker.

When an override exists, the ESO value remains preserved. The small **↶** button beside a field deletes only that override and immediately restores the latest live value.

Overrideable progression currently includes:

- overall level
- Magicka, Health, and Stamina allocations
- available attribute and Skill Points
- Craft, Warfare, and Fitness CP totals
- skill-line ranks
- purchased active skills, morphs, passives, and their ranks
- additional tracked skill lines

Identity fields are never overrideable: account, server, stable character ID, name, class, race, and alliance remain sourced from ESO.

Disabling **Allow synced-data overrides** requires confirmation. Confirmation deletes every override across every linked character and reapplies the latest addon snapshot immediately.

Observed action bars, equipped gear, detailed Champion stars, and Champion Bar slots are displayed as live reference panels. Build hotbars, recommended equipment, and CP plans remain separate authored guidance.

## File watching

The Electron main process watches the SavedVariables directory, not the complete AddOns tree. It watches both `ArrowToTheBuild.lua` and `ArrowToTheBuildBridge.lua`, polls at a low frequency, and reads again when the app regains focus, covering common Windows watcher edge cases.

Before parsing, ATTB waits until file size and modification time stabilize. Repeated watcher and polling events for unchanged revisions are ignored. The archive and bridge keep independent revision markers. If ESO creates the SavedVariables directory after ATTB starts, the polling fallback attaches the native watcher when the directory appears.

When both sources contain the same character, the desktop database accepts only snapshots at least as new as the one already stored. An older full-archive write therefore cannot overwrite a newer bridge snapshot. Archive and bridge revisions are tracked independently. Bridge schema 2 is normalized into the same character contract as the archive. The durable archive can enrich a fresher ID-first bridge snapshot with skill-line, ability, Champion Point, equipment-type, trait, and other display metadata without replacing the bridge's newer numeric state. Intentionally omitted bridge sections are reconciled against the latest complete stored/archive snapshot before applying live state.

## Settings and status

**Settings → General Settings → Automatic character synchronization** includes:

- enable or disable synchronization
- enable or disable override mode
- selected ESO profile root
- main addon and sync-bridge installation locations and versions
- full archive and sync-bridge SavedVariables paths, detection status, and bridge file size
- Install / Repair Addon
- Choose ESO Folder
- Sync Now
- Import Data From Addon
- open AddOns or SavedVariables folders
- open the addon GitHub repository

A linked character’s **Character Settings** panel shows account, server, ESO ID, last snapshot time, addon version, active overrides, and whether its source profile is currently active.

## Failure behavior

- Missing main-addon and bridge folders are shown independently from their SavedVariables files.
- A missing SavedVariables file means ESO has not written that source yet; it is not treated as corrupted data.
- A missing bridge does not destroy full-archive synchronization; it only removes the small sync-bridge path.
- Unsupported SavedVariables schemas are rejected with an explicit error.
- Malformed or executable Lua is rejected without evaluating it.
- A character cannot be linked to a build for a different class through either the UI or the IPC boundary.
- Turning sync off preserves the last imported state, the character, its selected build, and its notes.
- Unlinking makes the current effective values manual and dismisses that snapshot until it is rediscovered.

### 1.0.0 normal-play save behavior

- The durable `ArrowToTheBuild` archive is intentionally excluded from normal-play SavedVariables autosaving. It remains the fuller source and is expected to persist at natural ESO save points such as loading screens, `/reloadui`, logout, and exit.
- The small `ArrowToTheBuildBridge` remains eligible for normal-play autosaving and priority-save requests.
- A meaningful gameplay capture that lands inside the local priority-request cooldown replaces the bridge with the newest state and schedules exactly one deferred retry for the next eligible request time. Later changes coalesce into that same pending retry.
- `player-activated` still refreshes the current snapshot after a loading screen but does not request priority. `player-deactivated` captures the pre-transition state and relies on ESO's natural save rather than spending a priority request.
- Action-bar refresh listens for individual slot changes, all-hotbar updates, hotbar-slot updates, and weapon-pair changes.
- `/attbstatus` reports whether bridge state is dirty, whether a priority retry is deferred, and how long remains before that retry becomes eligible.

These rules improve the chance that a heavily-modded ESO installation gets the small bridge to disk promptly without claiming that the addon can force an immediate write. ESO remains the authority over actual disk persistence.

## Bundled addon version

This app release bundles:

```text
ArrowToTheBuild 1.0.0
  SavedVariables: ArrowToTheBuild.lua
  SavedVariables schema 1
  Compact character snapshot schema 2

ArrowToTheBuildBridge 1.0.0
  SavedVariables: ArrowToTheBuildBridge.lua
  Bridge SavedVariables schema 2
  Internal soft budget: 32 KiB
```

The addon has its own source repository and release cadence: [Arrow-to-the-Build-ESO-Addon](https://github.com/DeadxxSmile/Arrow-to-the-Build-ESO-Addon). Desktop compatibility is based on the two explicit SavedVariables contracts rather than executing addon code.
