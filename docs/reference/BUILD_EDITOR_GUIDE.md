# Visual Build Editor Guide

This guide explains the complete in-app authoring workflow. It assumes you are using the visual Build Editor rather than typing the Schema 4 JSON directly.

For a quick orientation, read **Start Here** first. For exact field names and merge rules, use **Manual JSON Authoring** and **Format & Skill IDs**.

## 1. Entering and leaving the Build Editor

Select **Build Creator** at the bottom of the Character Tracker sidebar. ATTB swaps the sidebar and top bar into the Build Editor workspace.

The app remembers the last page in each workspace. Returning to the Character Tracker restores the character page you were using, and returning to the Build Editor restores the open draft and editor page.

A character is not required to use the Build Editor.

## 2. Build Library

The Build Library contains:

- bundled ATTB builds;
- user-created builds;
- imported builds;
- forks;
- builds with recovery drafts.

### Bundled builds

Bundled builds are protected originals. Available actions are:

- **Fork Build** - create an editable copy;
- **Export JSON** - save a normal external copy.

There is no renderer or database action that saves changes over a bundled build.

### Editable builds

User-owned builds can be:

- resumed or edited;
- duplicated;
- exported;
- deleted when no character uses them;
- saved as numbered revisions.

A Recovery Draft badge means unfinished work exists separately from the latest permanent revision.

## 3. Creating a build

Open **Create New Build** and choose a starting method.

### Guided Build fields

#### Build name

The name seeds the display name, short name, and permanent build ID. The name and short name remain editable. The permanent ID is locked after creation.

#### Base class

The base class determines the initial three native class lines and class-specific starter scaffold.

#### Primary role

The primary role drives contextual suggestions and initial metadata. It does not prevent secondary roles or unusual setups.

Common values include Damage, Healer, Tank, Support, and Solo.

#### Primary resource

Choose Magicka, Stamina, Health-focused, or Hybrid. This seeds the Level 50 attribute target, weapon direction, and common race/Mundus guidance.

#### Suggested race, alliance, and Mundus

These are recommendations, not restrictions. The generated build can be changed immediately on Character Setup.

#### Progression coverage

- **Full leveling plan** creates early and later phases.
- **Endgame-focused** creates a smaller progression scaffold for authors who do not need a complete leveling path.

#### Class direction

- **Pure class** starts with all three native lines and can use Class Mastery.
- **Decide/add subclassing later** still starts valid and can be changed in Class Configuration.

#### Bar count

One-bar builds hide back-bar editing. Two-bar builds include weapon-swap progression and back-bar ultimate slots.

## 4. Drafts, autosave, undo, and Save Build

### Recovery draft

Every editable build has a recovery draft. It can be incomplete or invalid while you work.

The top bar reports the draft state, such as Recovery draft ready, Autosaving, Saved, or a sync warning.

### Autosave

Autosave writes the recovery copy to SQLite after the configured interval. Change the interval in **Build Editor Settings**.

Switching workspaces, changing builds, or closing a draft flushes pending edits when possible.

### Undo and redo

Undo and redo store recent editor states for the current session. They are separate from permanent revision history.

### Save Build

Save Build:

1. normalizes the Schema 4 object;
2. runs complete validation;
3. refuses invalid data;
4. creates the next immutable revision;
5. updates the permanent build used by the Character Tracker;
6. mirrors the valid build to the configured JSON folder.

## 5. Overview

Overview defines how the build is identified, discovered, and described.

### Identity

- Build name
- Short name
- Author
- Permanent build ID

The ID is a persistence key, not display text. Do not create a new ID merely because the name changes.

### Description and versioning

- Summary
- ESO game version
- Verified date
- Tags

Update the game version and verified date whenever the build is reviewed after a patch.

### Metadata

Structured metadata supports filtering and compatibility:

- roles;
- intended content;
- group sizes;
- resource;
- bar count;
- class style;
- playstyles;
- difficulty;
- platforms;
- language.

## 6. Character Setup

Character Setup describes the build target. It does not overwrite the profile of an existing tracked character.

### Role and resource

These choices update recommendations and metadata. Selecting a new recommendation does not forcibly rewrite every specialized field unless you choose **Apply Common Starting Setup**.

### Race and alliance

Race is a recommended choice. Alliance can reflect the race’s traditional alliance or a player’s preferred faction.

### Attribute target

The Level 50 target contains Magicka, Health, and Stamina. The total cannot exceed 64.

Use the stepper controls for custom distributions or apply the common target suggested for the selected role/resource.

### Mundus, weapons, and armor

Record the intended final direction and useful leveling notes. Weapon labels can include timing, such as “Inferno Staff at Level 15.”

### Access and transformations

Record ESO Plus assumptions, DLC requirements, and Vampire/Werewolf direction when relevant.

## 7. Class Configuration

A build always has one base class and exactly three active class lines.

### Active-line rules

ATTB enforces:

- exactly three unique active lines;
- at least one line native to the base class;
- no more than one line from a particular foreign class;
- native, subclassing, or mastered state as appropriate;
- every active line appearing in the build’s relevant-line list.

### Changing the base class

Changing the base class requires confirmation because it rebuilds class-specific starter skills, phase references, bars, and rotation links. Review the entire build after rebasing.

### Class Mastery

Class Mastery recommendations are available only for a pure-class setup with all three native lines. The current catalog supports up to two recommendations.

## 8. Skills & Passives

### Skill-line browser

Filter skill lines by category or search within a selected line. The bundled catalog provides stable line and skill IDs, types, ranks, and morph relationships.

### Adding skills

Add an active, ultimate, morph, or passive to the Unlock Plan. For passives with multiple purchasable ranks, choose the recommended rank.

Adding a morph automatically ensures its base ability exists as a prerequisite when needed.

### Purchase status

Use status to explain intent:

- Final
- Temporary leveling
- Optional alternative

### Phase and notes

The phase field indicates when the purchase becomes relevant. Notes can explain rank requirements, respec timing, or loadout-specific use.

### Unlock order

Reorder rows to create a practical purchase sequence. This order drives progression guidance in the Character Tracker.

### Removing lines

The active class lines are managed through Class Configuration. Removing another relevant line also cleans its bar and rotation references.

## 9. Leveling Plan

The Leveling Plan is the progression heart of ATTB.

### Phase management

Authors can:

- add an empty phase;
- copy the last phase;
- duplicate a phase in place;
- reorder phases;
- delete a phase while keeping at least one.

Copying the previous phase is usually the best workflow because later phases normally evolve from earlier bars and rotations.

### Phase identity and range

Set a stable phase ID, display name, level range, optional CP range, overview, and conditions.

Avoid overlapping ranges unless the phases are intentionally scoped to different loadouts.

### Attributes, gear stages, and milestones

A phase can override the recommended attributes, reference one or more gear stages, and list reminders such as unlocking weapon swap, joining a guild, or beginning a new line.

### Hotbars

Each bar has:

- weapon label;
- optional availability/lock note;
- five normal ability slots;
- a separate ultimate slot.

Only active skills already in the Unlock Plan can be selected.

Two-bar layouts stack the front and back bars vertically for readability. One-bar builds hide the back bar.

### Rotation styles

- **Fixed sequence** describes a repeatable order.
- **Priority system** describes conditions and refresh priorities.

Each rotation can contain opening steps, main steps, execute changes, and additional notes. A step may reference a selected skill or remain a text-only instruction.

### Phase review

ATTB flags common problems such as:

- back-bar use before Level 15;
- missing ultimates;
- bar skills not present in the Unlock Plan;
- changes between copied phases.

## 10. Equipment

### Gear stages

Create stages for meaningful progression points, not every individual level. Common examples:

- Leveling/Training
- Pre-CP160
- Crafted CP160 Starter
- Dungeon or Overland Upgrade
- Trial/Arena Target
- Final Setup

### Sets and standalone groups

A stage can contain named sets or standalone item groups. Each group can include source and access information.

### Pieces

Record:

- slot;
- armor weight or weapon type;
- trait;
- enchantment;
- quality;
- poison or special effect;
- perfected and mythic status;
- alternatives and notes.

Stable piece IDs allow loadouts and variants to replace specific entries cleanly.

### Deleting stages

Deleting a gear stage cleans phase references to that stage.

## 11. Champion Points

Every build contains Craft, Warfare, and Fitness plans.

### Core path

Use the ordered core list for the build’s primary route.

### Flex groups

Recommended and optional groups organize alternative stars without pretending every account must spend points identically.

### Node fields

Each node can record:

- stable ID and display name;
- maximum points;
- jump-point thresholds;
- prerequisite IDs;
- slottable status;
- explanation.

### Final Champion Bar

Each constellation can recommend up to four unique stars. A final slot must refer to a node marked slottable.

Deleting or making a node non-slottable automatically removes invalid final-slot references.

## 12. Companions

The Companion editor is a first-class Schema 4 authoring page in ATTB 2.1. It shows every companion in the bundled companion catalog with two researched starter identities and lets you copy either setup into the current build.

Adding a preset copies ordinary JSON into the build. It is then fully editable and does not require the preset library to exist at runtime. You can also create a custom companion setup.

For each setup you can edit:

- companion and role;
- permanent setup ID and display name;
- summary, weapon, armor weight, and companion traits;
- five priority-ordered normal skills;
- separate ultimate;
- equipment notes and gameplay notes;
- optional preset/source metadata.

Companion skills stay plain text and are never inserted into the player skill catalog, Relevant Lines, Unlock Plan, or player progression bars.

## 13. Loadouts & Variants

### Loadouts

Use a loadout for a complete named configuration such as Solo, Group DPS, Boss, Trash, Tank, Healer, One-Bar, or No-DLC.

A loadout can define roles, content, conditions, availability, summary, and captured overrides.

### Variants

Use a variant for a smaller situational change. Variants can be restricted to compatible loadouts.

### Capturing overrides

Select the sections that differ from the base build, then capture the current values. The editor creates Schema 4 override data without requiring manual merge JSON.

Remove a captured section when the setup should inherit the base value again.

### Application order

```text
Base Build → Selected Loadout → Selected Variant
```

## 14. Review & Save

Review & Save is the final authoring workspace. It does more than list schema errors.

### Errors, warnings, and suggestions

- **Errors** are blocking Schema 4 or runtime-validation failures. Save Build refuses them.
- **Warnings** identify likely mistakes, stale game-version metadata, missing ultimates, early back-bar use, incomplete final attributes, or catalog references that need review.
- **Suggestions** are optional quality improvements such as stronger summaries, sources, gear progression, tips, variants, or complete Champion Bars.

Every issue includes **Go to section**, which opens the editor page most likely to contain the fix.

### Preview Build

Preview renders the current recovery draft without creating a character. It summarizes setup, active class lines, the first and final progression bars, final equipment, Champion Bars, loadouts, and variants.

### Game-update compatibility

ATTB compares the build's `game_version`, `verified_date`, skill-line IDs, and skill references with the exact catalog bundled in the app. Missing IDs are reported and block marking the build current.

ATTB can verify structure and references, but it cannot decide whether combat balance changes make a setup strategically optimal. Review patch notes, skills, equipment, CP, and sources before using **Mark Reviewed**.

### Revision comparison

Compare any saved revision with another revision or the current recovery draft. Changes are grouped by top-level Schema 4 section and shown with added, removed, and changed values.

### Discard Recovery Changes

When a permanent revision exists, this replaces the recovery draft with the latest saved build. It does not delete revision history.

### Revision note and Save Build

Use the optional note to summarize meaningful changes, especially game-version updates, skill swaps, or gear alternatives. Every successful Save Build receives the next revision number and updates the managed JSON mirror.

Restoring an older revision loads it into the recovery draft; it does not erase newer revisions. Saving the restored draft creates a new revision.

## 15. Import, export, and file storage

### Import/Export page

The Build Editor can:

- export the blank Schema 4 template;
- export any build as readable JSON;
- import a completed JSON build.

### Managed user-build folder

The latest valid saved copy of each user-owned build is mirrored to the configured folder. The default is:

```text
Documents\Arrow to the Build\Builds
```

ATTB keeps drafts and history in SQLite. If the folder is missing or read-only, the internal revision remains safe and file sync is reported as pending.

### External edits

If a build file changes outside the app, ATTB keeps that version rather than overwriting it. You then review or import the external copy yourself.

## 16. Build Editor Settings

Current settings include:

- default author name;
- recovery autosave interval;
- contextual recommendations and tooltips;
- default Basic or Advanced mode behavior;
- game-version compatibility warnings;
- user-build storage folder.

## 17. A practical authoring order

For a new build, this sequence minimizes rework:

1. Create the guided scaffold.
2. Finish Overview and Character Setup.
3. Lock the class configuration.
4. Build the Unlock Plan.
5. Build leveling phases and hotbars.
6. Add gear progression.
7. Add all three CP plans.
8. Add loadouts and variants.
9. Validate and Save Build.
10. Create a test character at several levels and inspect the tracker.
11. Return to the editor, adjust, and save a new revision.
