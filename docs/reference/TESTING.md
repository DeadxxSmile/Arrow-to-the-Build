# ATTB Testing Guide

Use this checklist for the current 2.0 codebase. It replaces the historical per-milestone beta checklists.

## Automated checks

From the repository root:

```powershell
npm ci --include=dev
npm test
npm run build:renderer
```

For a complete Windows installer test:

```powershell
BUILD-ATTB.bat
```

## Development launch

```powershell
$env:ELECTRON_ENABLE_LOGGING="1"
$env:ELECTRON_ENABLE_STACK_DUMPING="1"
npm start 2>&1 | Tee-Object -FilePath ".\attb-dev.log"
```

## Workspace and persistence

- Switch between Character Tracker and Build Editor and confirm each remembers its last page.
- Confirm the no-character screen keeps the Character Tracker sidebar and still offers the Build Editor.
- Change theme, startup workspace, sidebar collapse state, and Build Editor settings; restart and confirm persistence.
- Confirm a development database migrates without losing characters, builds, drafts, revisions, or settings.

## Ownership, drafts, and revisions

- Fork a bundled build and confirm the original remains unchanged and read-only.
- Create and import user builds; confirm both are editable immediately.
- Edit a draft, close the app before autosave, reopen, and confirm recovery.
- Test Undo and Redo across multiple sections.
- Confirm an unsaved draft is not selectable for a character.
- Save revision 1, modify the build, save revision 2, restore revision 1 to the draft, and save revision 3.
- Compare revisions and compare a revision with the current draft.
- Confirm deleting a build used by a character is blocked.

## User-build JSON storage

- Save a user build and confirm its JSON appears in the configured folder.
- Change the storage folder and confirm saved files are copied before the setting changes.
- Delete a managed JSON file and use **Sync Saved Builds**.
- Modify a managed file outside ATTB and confirm the external version is preserved rather than silently overwritten.
- Make the folder unavailable and confirm the SQLite revision still saves while JSON sync reports pending.
- Confirm bundled builds and incomplete drafts are never written to the user folder.

## Visual authoring

- Create Guided Builds for several classes, roles, resources, one-bar, and two-bar setups.
- Create a Blank Advanced Build.
- Test Overview, Character Setup, and Class Configuration, including subclass restrictions and Class Mastery.
- Add active skills, morphs, ultimates, and passive ranks; verify base-skill prerequisites and unlock ordering.
- Add, duplicate, reorder, and delete leveling phases.
- Confirm front/back bars stack vertically and one-bar builds hide the back bar.
- Test rotation sequence and priority editing.
- Add gear stages, sets, sources, pieces, alternatives, mythics, and perfected items.
- Edit all three Champion Point trees and final four-slot bars.
- Create loadouts and variants, capture override sections, and verify compatibility scopes.

## Review & Save

- Confirm errors, warnings, and suggestions render separately.
- Use **Go to section** from each issue category.
- Open the draft preview and inspect setup, class lines, bars, gear, CP, loadouts, and variants.
- Compare two saved revisions and a saved revision with the current draft.
- Test an older game-version label and confirm compatibility review is shown.
- Confirm missing catalog skill or line IDs block marking the build current.
- Mark a reviewed build for the bundled update, validate, and save a revision note.
- Confirm errors block Save Build while warnings and suggestions do not.

## Character Tracker regression

- Create a character from a bundled build and from a saved user build.
- Test Basic Setup, Current Levels, skills/passives, equipment, hotbars/rotations, Champion Points, consumables, and Help & Tools.
- Switch loadouts and variants and verify the displayed build changes without losing character progress.
- Export and import a character backup.

## Packaging and website

- Build the NSIS installer and test install, launch, upgrade, and uninstall on Windows.
- Confirm packaged offline documentation, the blank build template, catalog, and bundled builds load. The public `BUILD_SCHEMA.json` remains source-only by design.
- Check website anchors, local images, social preview, repository links, support links, and release link.
- Confirm no databases, logs, `node_modules`, build output, or temporary files are included in the source archive.

## ESO addon integration

### First launch and folder setup

- Start with no addon settings. Confirm the optional setup dialog appears once.
- Confirm **Not Now** disables integration and does not re-open the dialog after restart.
- Confirm **Install Addon and Enable Sync** detects a redirected Windows Documents folder, including a drive such as `E:\Documents`.
- Test `live`, `liveeu`, and `pts` profile roots.
- With more than one profile present, confirm a profile containing the addon or SavedVariables is preferred over an empty profile.
- Confirm manual selection accepts the profile root, `AddOns`, `SavedVariables`, `AddOns\ArrowToTheBuild`, and `AddOns\ArrowToTheBuildBridge`.
- Confirm a random folder is rejected.
- Confirm Install / Repair places both bundled components at `<profile>\AddOns\ArrowToTheBuild` and `<profile>\AddOns\ArrowToTheBuildBridge` and does not delete either SavedVariables file.
- Confirm a newer separately installed addon is reported rather than described as an available downgrade.

### SavedVariables parsing and watching

- Use a real alpha.4.2/alpha.5 full-archive SavedVariables file containing at least two characters.
- Confirm the app reads both archive records and does not execute or evaluate Lua.
- Confirm `ArrowToTheBuildBridge.lua` is parsed independently and expands into the normal desktop snapshot contract.
- Confirm malformed content, a wrong root variable, trailing executable statements, unsupported schemas, and files over 8 MB produce controlled errors.
- Confirm a manual Sync Now reads immediately.
- Confirm normal ESO writes to either the archive or bridge are noticed by the folder watcher.
- Confirm the focus and 15-second polling fallbacks do not repeatedly apply an unchanged revision.
- Start ATTB before the SavedVariables directory exists, then let ESO create it; confirm polling attaches the watcher and imports data.
- Switch between profile roots and confirm discovery/status counts show only the active profile.

### ESO-controlled sync bridge

- Fresh-install both addon components, enable both in ESO, and log into one character.
- Confirm ESO eventually creates `<profile>\SavedVariables\ArrowToTheBuildBridge.lua`.
- Confirm Settings reports the bridge version, file path, file size, and **ESO-controlled sync bridge ready** while the file remains below the displayed normal-play threshold.
- Without logging out or using `/reloadui`, change equipment, earn a level/skill-line rank, spend a Skill Point, or change an action bar. Keep playing through ordinary save opportunities and confirm the bridge revision/file timestamp eventually advances and the desktop character updates.
- Record the observed delay. Do not treat sub-second updates as a requirement; ESO controls disk flush timing.
- Confirm a loading screen, `/reloadui`, logout, or exit still produces a reliable later save opportunity.
- Confirm an older archive snapshot cannot replace a newer bridge snapshot for the same character.
- Disable or remove only the bridge and confirm the full archive still imports, while Settings clearly reports that the small sync bridge is unavailable.

### Character discovery and linking

- Confirm a new addon character produces the **New ESO character found** popup.
- Confirm the character is not added until the user explicitly chooses either **Create a new build from this character** or a saved compatible-class target build.
- Confirm the build picker prefers compatible-class builds.
- Bypass the renderer and confirm the main process rejects a different-class build.
- Create a manual character with the same name and class. Confirm the popup offers explicit link or separate-character choices.
- Create a same-name character for a different class. Confirm it is not suggested as a probable match.
- Link an existing character and confirm its selected build, loadout, variant, notes, and gear checklist remain.
- Dismiss a discovery and confirm it stays hidden for the session; use rediscovery to make it available again.
- Rename the ESO character and confirm the stable-ID link updates the existing ATTB name rather than creating a duplicate.

### Live values and overrides

- Confirm linked identity fields are disabled and continue to follow ESO.
- With override mode off, confirm edits to level, attributes, unspent points, CP totals, skill-line ranks, purchases, and tracked lines are blocked at both UI and IPC layers.
- Enable override mode and change each supported field.
- Confirm live ESO values remain visible beside overridden values.
- Confirm each **↶** action restores only its field.
- Override a live purchased skill to zero and confirm its completion state also clears.
- Add and hide a tracked skill line under override mode; confirm the active override list can restore a hidden line.
- Import a newer addon snapshot while overrides exist. Confirm live values update underneath while effective overridden values remain.
- Disable override mode, accept the destructive confirmation, and confirm all characters immediately match their latest addon snapshots.

### Observed reference panels

- Equipment shows the actual equipped item names, slots, sets, traits, enchantments, types, and requirements without altering the build’s gear-acquisition checklist.
- Rotations shows the actual primary and backup ESO action bars without replacing authored build hotbars.
- Champion Points shows detailed invested stars and all twelve Champion Bar positions without replacing the build CP plan.

### Packaging

- Confirm every file under `resources\addon\ArrowToTheBuild` ships in the installer.
- Install on a clean Windows account and confirm the app can copy addon files out of its packaged resources.
- Upgrade from a pre-addon-integration v2 beta database (migration level 007) and confirm migration 008 preserves all characters, builds, drafts, revisions, settings, and build JSON paths.
- Uninstall/reinstall and confirm ESO addon files and ATTB local app data follow the documented persistence behavior.


### ESO-controlled sync bridge budget and reconciliation

For the 2.0.0 release / addon 1.0.0:

- Start from a clean app-data directory and no ATTB addon folders; verify first-run setup installs both `ArrowToTheBuild` and `ArrowToTheBuildBridge` 1.0.0.
- Confirm `/attbstatus` reports bridge schema/budget diagnostics and the bridge estimate stays below its 32 KiB internal budget.
- Test a low-level character and a heavily developed level-50/CP character. The complete current-character bridge must pass the 32 KiB conservative internal estimate without truncation; the desktop should also report an actual disk file comfortably below ESO's normal-play ceiling once ESO writes it.
- After a clean `/reloadui` baseline, make one attribute/passive/equipment change during the priority cooldown. Confirm the in-memory bridge advances immediately, reports a dirty/deferred state, schedules one retry, and does not require another gameplay event to become eligible for a later priority request.
- Make several additional changes while that retry is pending. Confirm there is still one retry and the bridge contains the newest complete current state rather than a queue of deltas.
- Confirm `player-activated` publishes a fresh bridge snapshot without requesting priority, while `player-deactivated` captures before the transition and relies on the natural ESO save.
- Manually edit an action-bar slot and confirm the bridge revision advances through the strengthened hotbar event coverage.
- Change level/progression, equipment, action bars, and Champion Points without logging out. Record the gameplay-change time, bridge-file modified time, and desktop-observed time. Do not assume or advertise a fixed ESO autosave cadence.
- Run the timing test once with only the two ATTB addon components enabled, then again with the normal full addon loadout. Record the difference so SavedVariables queue contention can be distinguished from ATTB behavior.
- Confirm normal gameplay priority requests are limited to `ArrowToTheBuildBridge`; the durable `ArrowToTheBuild` archive should wait for loading-screen/reload/logout/exit persistence and carries `DisableSavedVariablesAutoSaving: 1`.
- If `budgetStatus` becomes `near` or `truncated`, verify Settings displays the state. A truncated bridge must not erase the last complete equipment/skills/Champion detail stored from the archive.
- Verify a later but older archive write cannot replace a fresher bridge snapshot, but can enrich that newer ID-first snapshot with skill/CP/equipment display metadata.
- Verify bridge schema 1 from beta.9 is still readable so an in-place beta upgrade does not strand an existing bridge file.

### Create or adapt a build from a synced character

- Link a character with a complete addon snapshot and choose **Create Build from Character**. Confirm ATTB opens a new editable Schema 4 draft in Build Editor and does not create a saved revision until **Save Build** is used.
- Confirm class, race, alliance, current attributes, owned skills/passives/morphs, action bars, current equipment, and Champion data are populated where the snapshot supports them. Unknown future recommendations must remain intentionally unasserted.
- Confirm the imported progression phase is labeled `Imported Character State - Level <current level>` and never fabricates the historical level at which an already-owned skill was acquired.
- Choose **Adapt Build to Character** with a bundled build. Confirm a fork is created, the bundled source remains unchanged, current equipment is inserted only as a CURRENT import stage, and all original TARGET gear/phases/defaults remain intact.
- Confirm target unlock rows are marked **Owned at Import**, **Catch Up**, or **Future** from the live character state.
- Save/reopen/export the generated draft and confirm it behaves exactly like any other user build after the first saved revision.
- With a synced character, verify Skills & Passives Overview uses the same live catalog allocations as the individual line pages and cannot manually toggle synced rows while override mode is disabled.


### Frozen workflow checks

- During first ESO-character discovery, choose **Create a new build from this character** and verify the setup dialog appears before any permanent build ID is created.
- Change the proposed build name and permanent ID, complete import, and verify the new synced character uses that editable build and Build Editor opens its recovery draft.
- Confirm **Edit character profile** opens Settings directly on **Character Settings**.
- Confirm Character Settings no longer duplicates Level, CP, available point, or attribute-allocation controls from Current Levels.
- Confirm ESO Plus appears under General Settings.
- Confirm the first addon-enable screen requires acknowledgement of ESO SavedVariables timing and provides the ZOS/ESOUI documentation links.
- Confirm observed action bars show skill icons instead of match-method diagnostic pills.
- Confirm Champion Point detail uses earned/spent/unspent language rather than calling all earned points available.
- Add multiline Build Notes in Build Editor, save/export/reopen/fork/adapt the build, and verify the notes survive and display at the bottom of Basic Setup.
