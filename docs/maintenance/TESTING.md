# ATTB Testing Guide

Use this checklist for the current **ATTB 3.1.0** codebase. It replaces the historical per-milestone and pre-v3 checklists.

## Automated test policy

ATTB keeps automated tests focused on contracts that can break data, behavior, packaging, or known regressions. The suite should not become a second implementation of the UI.

- Prefer behavioral tests over source-text inspection whenever the module can be exercised directly.
- Keep persistence, migration, parser, validation, build-logic, addon-integration, and security edge cases even when they increase the test count. Those protect user data or correctness.
- Use source-text tests only for narrow regressions that are difficult to exercise without a browser or live ESO client.
- Do not block a build on exact wording, decorative CSS measurements, marketing copy, screenshot inventory, or the absence of long-retired historical files.
- Avoid testing the same release contract in multiple files. Version, schema, and packaging ownership should each have one authoritative check.
- A regression test should explain the bug class it protects, not freeze unrelated implementation details.

The historical v2.1.3 test-suite audit reduced the suite from 335 to 278 tests while retaining the behavioral and data-safety coverage. ATTB 3.1.0 has since expanded the suite as new systems and regressions were added. See `TEST_SUITE_AUDIT_2_1_3.md` only for that historical cleanup record.

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

- Use the top Character / Build / Help icon switcher to move among all three workspaces and confirm each remembers its last content page.
- Upgrade from a profile that previously stored `/help` as the last Character route and confirm Character opens a real Character Tracker page instead of bouncing back to Help & Tools.
- Open Settings from each workspace, switch away, then return and confirm Settings did not replace that workspace's remembered content page.
- Confirm the no-character screen keeps the Character Tracker sidebar and still offers the Build Editor.
- Change several built-in themes, a custom theme, startup workspace, and Build Editor settings; restart and confirm persistence.
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
- Open Build Editor > Companions, add one of the sixteen curated presets, edit it into a custom setup, duplicate/delete it, and confirm validation/export/re-import preserve the data.

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
- Test Basic Setup, Current Levels, skills/passives, equipment, hotbars/rotations, Champion Points, Companions, and consumables. Then switch to the dedicated Help & Tools workspace and verify its grouped sidebar independently.
- On Companions, verify all eight current combat companions appear, each has two curated targets, and selecting a target persists on restart/backup import.
- In Suggested Next Picks, confirm only rows that are immediately purchasable appear. Regression-check Medium Armor Agility/Athletics and Light Armor Concentration against their catalog `unlock_ranks`, and confirm an unverified passive is conservatively held out before line maximum.
- Switch loadouts and variants and verify the displayed build changes without losing character progress.
- Export and import a character backup from **Character Tracker → Character Data → Backups & Import**.

## Packaging and website

- Build the NSIS installer and test install, launch, upgrade, and uninstall on Windows.
- Confirm packaged offline documentation, the AI authoring guide, blank build template, player skill catalog, companion preset catalog, and bundled builds load. The public `BUILD_SCHEMA.json` remains source-only by design.
- Check website anchors, local images, social preview, repository links, support links, and release link.
- Confirm no databases, logs, `node_modules`, build output, or temporary files are included in the source archive.

## ESO addon integration

### First launch and folder setup

- Start with no addon settings. Confirm the optional setup dialog appears once.
- Confirm **Not Now** disables integration and does not re-open the dialog after restart.
- Confirm **Install Addon and Enable Sync** detects redirected Windows Documents folders and supports `live`, `liveeu`, and `pts`.
- With more than one profile present, confirm a profile containing `ArrowToTheBuild` or `ArrowToTheBuild.lua` is preferred over an empty profile.
- Confirm manual selection accepts the profile root, `AddOns`, `SavedVariables`, and `AddOns\ArrowToTheBuild`.
- Confirm a random folder is rejected.
- Confirm Install / Repair places **only** `<profile>\AddOns\ArrowToTheBuild` and never deletes `ArrowToTheBuild.lua`.
- Confirm a newer separately installed addon is reported and preserved rather than downgraded.

### Upgrade from addon 1.0.0

- Create the old `<profile>\AddOns\ArrowToTheBuildBridge` folder with the exact ATTB 1.0.0 Sync Bridge manifest and create both old addon SavedVariables files. The cleanup originated in v2.1.3. On the first ATTB 3.1.0 launch, confirm it removes the verified bridge folder, removes the managed main addon folder, deletes both old SavedVariables files, and immediately reinstalls the bundled single addon.
- After the cleanup marker is stored, create a fresh `ArrowToTheBuild.lua` and restart ATTB. Confirm the one-time cleanup does not run again and the fresh save remains intact.
- Put an unrelated manifest in a folder named `ArrowToTheBuildBridge`; confirm ATTB refuses to delete it.
- Confirm the main `ArrowToTheBuild.lua` archive and existing desktop character links survive the upgrade.

### SavedVariables parsing and watching

- Use a real full-archive SavedVariables file containing at least two characters.
- Confirm the app reads all archive records and does not execute or evaluate Lua.
- Confirm malformed content, a wrong root variable, trailing executable statements, unsupported schemas, and files over 8 MB produce controlled errors.
- Confirm Read Latest Snapshot reads the single archive immediately.
- Confirm normal ESO writes to `ArrowToTheBuild.lua` are noticed by the folder watcher.
- Confirm the 15-second polling fallback does not repeatedly apply an unchanged revision.
- Start ATTB before the SavedVariables directory exists, then let ESO create it; confirm polling attaches the watcher and imports data.
- Switch between profile roots and confirm discovery/status counts show only the active profile.

### ESO-controlled save timing

- Fresh-install the current bundled `ArrowToTheBuild` addon (1.1.3 in the 3.1.0 release), enable it in ESO, and log into one character.
- Confirm ESO creates `<profile>\SavedVariables\ArrowToTheBuild.lua` after a save opportunity or `/reloadui`.
- Confirm Settings reports one addon path and one SavedVariables path; there must be no live bridge budget/status UI.
- Change level/progression, equipment, action bars, attributes, and Champion Points. Confirm the in-memory addon revision advances through the relevant event capture.
- Run `/reloadui` and confirm the desktop sees the updated complete snapshot.
- Treat ordinary background/loading/logout/exit saves as ESO-controlled opportunities, not as a guaranteed fixed cadence.
- Confirm `/attbexport` refreshes the in-memory snapshot and clearly tells the user to use `/reloadui` for immediate desktop disk refresh.
- Confirm `/attbstatus` reports the archive/memory revisions, latest capture, pending sections, and the `/reloadui` reminder without bridge/priority/budget diagnostics.

### Champion Point catalog, routing, and map regression (3.1.0)

- Open a character/build with Champion Points and confirm **Do this next** identifies the first incomplete prerequisite or target rather than simply maxing each authored row in order.
- Confirm a Bloody Renewal-only Fitness target expands through **Sprinter 10/20 -> Hasty 8/16 -> Hero's Vigor 10/20 -> Bloody Renewal** and does not demand the connector stars be maxed first.
- Confirm a Craft route targeting Inspiration Boost after Gilded Fingers inserts **Fortune's Favor 10/50** as the route-opening milestone.
- Hover the map icon on a CP bubble and confirm the compact constellation popover appears; click to pin it, press Escape/click outside to close it, and confirm the highlighted star/path match the bubble.
- Open the full constellation map in Craft, Warfare, and Fitness. Confirm target, required-route, invested, and next-action states remain visually distinct and the map stays usable at reduced window sizes.
- With addon 1.1.3+, `/reloadui`, then confirm the desktop snapshot contains all Champion stars (including zero-point stars), exact max points, jump points, slottable type, root/link data, and coordinates; CURRENT invested points must overlay the TARGET route without rewriting it.
- Temporarily test an older Schema 4 build carrying stale `max_points`, `slottable`, and `jump_points`; import normalization should preserve its intended strategy while canonical catalog facts win.
- In Build Editor, confirm passive stars cannot be selected for the final Champion Bar and verified staged stars offer only real effect thresholds for first-pass/eventual targets.
- Author a CP star in the wrong tree, an unknown star, a passive final slot, and a between-stage target; Review & Save must reject each case with a useful CP-specific validation error.

### Addon source-quality regression

- Confirm the shipped addon contains no generic `pcall` API wrapper, `_G[functionName]` probing, `SafeCall`, `SafeRegisterEvent`, or guessed API-name fallback list.
- Confirm documented Update 50 / API 101050 functions and event constants are called directly.
- Confirm old speculative events/functions are absent: `EVENT_CHAMPION_POINTS_CHANGED`, `EVENT_ATTRIBUTE_POINTS_CHANGED`, `EVENT_SKILL_LINE_LEVELED_UP`, `EVENT_SKILL_ABILITY_PROGRESSIONS_UPDATED`, `IsChampionSkillSlottable`, `GetAvailableAttributePoints`, and `GetNumAvailableAttributePoints`.
- Confirm raw skill-XP events do not trigger full skill rescans. Rank/purchase/result events must still update purchased/rank state.
- Confirm player activation/deactivation force a complete capture so `/reloadui` cannot be blocked by the normal event-capture cooldown.

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

- Equipment shows actual equipped item names, slots, sets, traits, enchantments, types, and requirements without altering the build gear checklist.
- Rotations shows the actual primary and backup ESO action bars without replacing authored build hotbars.
- Champion Points shows detailed invested stars and all twelve Champion Bar positions without replacing the build CP plan.

### Packaging

- Confirm every file under `resources\addon\ArrowToTheBuild` ships in the installer external resources.
- Confirm no `resources\addon\ArrowToTheBuildBridge` source exists in the release tree.
- Install on a clean Windows account and confirm the app can copy addon files out of its packaged resources.
- Upgrade from a database at migration level 007/008 and confirm all characters, builds, drafts, revisions, settings, snapshots/links, overrides, companion data, and build JSON paths survive.

### Schema 4 progression scope

- Import an older Schema 4 build with no `progression_scope`; confirm it remains valid and behaves as `new_character` with `leveling_content_required: true`.
- Create guided builds for **New character**, **Existing Level 50**, and **Existing CP160+**. Confirm their generated phases and equipment scaffolds match the selected starting point.
- For a Level 50 / CP160+ build, confirm Review & Save does not suggest adding separate Level 1-49 leveling gear simply because those stages are absent.
- For a new-character build, confirm normal leveling-stage guidance and validation remain unchanged.
- Create Build from Character at Level 49, Level 50/CP159, and Level 50/CP160; confirm ATTB infers `new_character`, `level_50`, and `cp160_plus` respectively.
- Adapt an existing build to a CP160+ character and confirm the fork keeps authored TARGET content while changing the build intent to CP160+ rather than inventing historical leveling progress.
- Edit **Build Editor -> Overview -> Progression intent** and confirm starting point, leveling-required state, and description survive autosave, Save Build, export/import, revision restore, and reload.

### Create or adapt a build from a synced character

- Link a character with a complete addon snapshot and choose **Create Build from Character**. Confirm ATTB opens a new editable Schema 4 draft in Build Editor and does not create a saved revision until **Save Build** is used.
- Confirm class, race, alliance, current attributes, owned skills/passives/morphs, action bars, current equipment, and Champion data are populated where the snapshot supports them. Unknown future recommendations must remain intentionally unasserted.
- Confirm the imported progression phase is labeled `Imported Character State - Level <current level>` and never fabricates the historical level at which an already-owned skill was acquired. Confirm the build progression scope is inferred from current Level/CP.
- Choose **Adapt Build to Character** with a bundled build. Confirm a fork is created, the bundled source remains unchanged, current equipment is inserted only as a CURRENT import stage, and all original TARGET gear/phases/defaults remain intact.
- Confirm target unlock rows are marked **Owned at Import**, **Catch Up**, or **Future** from the live character state.
- Save/reopen/export the generated draft and confirm it behaves exactly like any other user build after the first saved revision.
- With a synced character, verify Skills & Passives Overview uses the same live catalog allocations as the individual line pages and cannot manually toggle synced rows while override mode is disabled.


### Frozen workflow checks

- During first ESO-character discovery, choose **Create a new build from this character** and verify the setup dialog appears before any permanent build ID is created.
- Change the proposed build name and permanent ID, complete import, and verify the new synced character uses that editable build and Build Editor opens its recovery draft.
- Confirm **Edit character profile** opens Settings directly on **Character**.
- Confirm the Character tab no longer duplicates Level, CP, available point, or attribute-allocation controls from Current Levels.
- Confirm ESO Plus appears under General.
- Confirm the first addon-enable screen requires acknowledgement of ESO SavedVariables timing and provides the ZOS/ESOUI documentation links.
- Confirm observed action bars show skill icons instead of match-method diagnostic pills.
- Confirm Champion Point detail uses earned/spent/unspent language rather than calling all earned points available.
- Add multiline Build Notes in Build Editor, save/export/reopen/fork/adapt the build, and verify the notes survive and display at the bottom of Basic Setup.
