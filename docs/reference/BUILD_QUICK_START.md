# Start Here: Builds, JSON, and the ATTB Build Editor

Arrow to the Build uses **Schema 4 JSON** as the shared language for every build. The bundled builds, builds made in the visual editor, imported community files, and files edited by hand all use the same underlying structure.

You do **not** need to know JSON to create a build in ATTB. The Build Editor writes and validates the JSON for you. The JSON format matters because it keeps builds portable, human-readable, easy to back up, and usable outside the app.

## The two sides of ATTB

ATTB contains two remembered workspaces:

- **Character Tracker** - follow a build on a real character and record progression.
- **Build Editor** - create, fork, import, update, validate, save, and export builds.

Select **Build Creator** in the Character Tracker sidebar to enter the Build Editor. Select **Character Tracker** in the Build Editor sidebar to return.

## What one build contains

A complete build can include:

- class, active class lines, subclassing, and Class Mastery;
- race, alliance, attributes, Mundus, weapons, armor direction, and transformations;
- skills, morphs, passives, ultimates, and their recommended purchase order;
- leveling phases with front and back bars, rotations, milestones, and attribute targets;
- equipment stages with individual pieces, traits, enchantments, sources, and alternatives;
- Craft, Warfare, and Fitness Champion Point plans;
- complete named loadouts and smaller situational variants;
- consumables, quickslots, structured companion setups, requirements, performance notes, and research sources.

The Character Tracker reads this information and turns it into a character-specific progression plan.

## The four ways to begin

Open **Build Editor → Create New Build**.

### Guided Build

This is the recommended starting point. Choose the important foundation:

1. Build name and base class.
2. Primary role and resource.
3. Suggested race, alliance, and Mundus.
4. Full leveling plan or endgame-focused structure.
5. Pure class or a build that may add subclassing later.
6. One-bar or two-bar setup.

ATTB creates a valid class-specific scaffold with real catalog IDs, starter skills, an attainable ultimate, leveling phases, bars, rotation structure, equipment, Champion Points, and a default loadout.

Everything remains editable after creation.

### Blank Advanced Build

Creates the complete Schema 4 starter template with example content. Choose this when you already understand the format or want to replace every recommendation yourself.

### Fork Existing Build

Creates an editable copy of a bundled or user-owned build.

Bundled ATTB builds are permanently read-only. Forking gives the copy:

- a new permanent build ID;
- independent draft and revision history;
- recorded ancestry;
- normal editing and export controls.

This is often the fastest way to make a polished build because the source already has complete progression, gear, CP, and rotations.

### Import JSON

Validates a community or manually authored Schema 4 file, adds it to the editable Build Library, and opens its recovery draft.

All non-bundled imports are editable immediately.

## Your first guided build

After creating a Guided Build, work down the Build Editor sidebar.

### 1. Overview

Set the public identity and purpose:

- name, short name, author, and permanent ID;
- summary and game version;
- verification date;
- roles, content, difficulty, platforms, language, and tags.

The permanent ID is generated when the build is created and remains locked so characters, drafts, revisions, and exported files keep a stable reference.

### 2. Character Setup

Define the recommended character foundation:

- role and primary resource;
- race and alliance;
- 64-point Level 50 attribute target;
- Mundus, weapons, armor direction, and leveling trait;
- ESO Plus assumptions and transformations.

Guidance describes common starting patterns, not mandatory rules. Unusual builds are allowed.

### 3. Class Configuration

Choose the three active class lines. ATTB enforces the major configuration rules:

- exactly three active lines;
- at least one native line;
- no duplicate lines;
- no foreign class supplying two active lines;
- Class Mastery only when all three lines are native.

Changing the base class intentionally rebuilds class-specific starter references.

### 4. Skills & Passives

Browse the bundled skill catalog, add abilities and passives, choose morphs, set ranks, and arrange the recommended unlock order.

A skill must be in the Unlock Plan before it can be selected on a leveling hotbar.

### 5. Leveling Plan

Create the build’s progression timeline. Each phase can contain:

- level and CP range;
- phase overview and milestones;
- attribute target and recommended gear stages;
- front and back bars with explicit ultimate slots;
- a fixed sequence or priority rotation.

Copying a phase is usually faster than rebuilding the next level range from nothing.

### 6. Equipment

Create progression stages such as Training Gear, CP160 Starter, Dungeon Upgrade, and Final Setup. Add sets, individual pieces, traits, enchantments, quality, source details, and alternatives.

### 7. Champion Points

Edit the Craft, Warfare, and Fitness plans. Add ordered core stars, recommended or optional branches, and up to four final slottables per constellation.

### 8. Companions

ATTB 2.1 includes every current combat companion in a dedicated directory plus two starter setups per companion. In the Build Editor you can add a preset, reset an edited setup back to its preset, or author a custom companion target.

Companion skills are stored separately from player skill IDs and Unlock Plan data.

### 9. Loadouts & Variants

Use **loadouts** for complete named configurations such as Solo, Group DPS, Boss, One-Bar, or No-DLC.

Use **variants** for smaller changes such as a defensive skill swap, alternate consumable, or PvP adjustment.

ATTB applies them in this order:

```text
Base Build → Loadout → Variant
```

### 10. Review & Save

Run validation and review the three result categories:

- fix all blocking errors;
- inspect warnings for likely mistakes or stale game-version information;
- use suggestions to improve clarity and completeness where useful.

Open **Preview Build**, compare revisions when updating an existing build, review compatibility with the bundled ESO catalog, optionally enter a revision note, and select **Save Build**.

## Autosave is not Save Build

ATTB uses two different kinds of saving:

- **Recovery autosave** protects unfinished work, including temporarily invalid drafts.
- **Save Build** validates the complete build, creates an immutable numbered revision, and updates the version available to the Character Tracker.

Undo and redo are editor-session tools. Saved revisions remain available after the session ends.

## Where user builds are stored

The database stores drafts, revisions, ancestry, and character references. Every successfully saved non-bundled build is also mirrored to a readable JSON file.

The default folder is:

```text
Documents\Arrow to the Build\Builds
```

Change it under **Settings → Build Editor Settings**.

Drafts are intentionally not written as ordinary build files because an unfinished draft may not be valid or shareable yet.

## Built-in and user-owned builds

| Build type | Editable? | Normal actions |
|---|---:|---|
| Bundled ATTB build | No | View, Fork, Export |
| Forked build | Yes | Edit, Duplicate, Export, Delete, Save revisions |
| Imported build | Yes | Edit, Duplicate, Export, Delete, Save revisions |
| Newly created build | Yes | Edit, Duplicate, Export, Delete, Save revisions |

A build currently used by a character cannot be deleted until that character is moved to another build or removed.

## JSON without hand-editing

The visual editor always edits a normal Schema 4 object. There is no hidden proprietary format between the editor and exported JSON.

That means you can:

1. Create a build visually.
2. Save it.
3. Open the generated JSON in the selected build folder.
4. Make an advanced manual edit.
5. Import or reload the file after validation.

Do not change stable IDs casually. Display names can change; IDs are used for persistence and references.

## Which guide should you read next?

- **Visual Build Editor Guide** - every page and normal workflow in the app.
- **Manual JSON Authoring** - hand-writing or directly editing Schema 4.
- **Format & Skill IDs** - compact technical contract and searchable catalog identifiers.
- **Validation & Troubleshooting** - recovery drafts, import errors, sync conflicts, and common fixes.
- **ESO Systems Audit** - why Schema 4 represents the current game systems.
- **Patch Maintenance** - updating catalogs and builds when ESO changes.

## First-build checklist

Before sharing a build:

- [ ] The identity and game version are current.
- [ ] Exactly three valid class lines are configured.
- [ ] Every bar skill appears in the Unlock Plan.
- [ ] Appropriate phases have front and back ultimates.
- [ ] Level 15 and weapon-swap behavior are explained.
- [ ] Gear stages point to real pieces and useful alternatives.
- [ ] All three CP trees have usable routes and final slots.
- [ ] Loadouts and variants have unique stable IDs.
- [ ] Validation passes.
- [ ] Save Build creates a permanent revision and JSON mirror.
- [ ] The build is tested in the Character Tracker at several level and CP ranges.
