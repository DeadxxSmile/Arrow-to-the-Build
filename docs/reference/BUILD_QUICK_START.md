# Start Here: Builds, JSON, and the ATTB Build Editor

Every build in Arrow to the Build is a **Schema 4 JSON** file. Bundled builds, builds you make in the visual editor, community files you import, and files you edit by hand all use the same structure. This reference is current for **ATTB 3.1.0**.

You do **not** need to know JSON to create a build in ATTB. The Build Editor writes and validates the JSON for you. The JSON format matters because it keeps builds portable, human-readable, easy to back up, and usable outside the app.

## The three workspaces of ATTB

ATTB has three workspaces, and it remembers where you were in each:

- **Character Tracker** - follow a build on a real character and record progression.
- **Build Editor** - create, fork, import, update, validate, save, and export builds.
- **Help & Tools** - look up Gear, Combat, Progression, Companion, and general build-reference topics without leaving the app.

The three-tab workspace switcher at the top of the sidebar moves between Character, Build, and Help. Each workspace remembers the last real page you used there, while Settings stays pinned separately at the bottom of the sidebar.

## What one build contains

A complete build can include:

- class, active class lines, subclassing, and Class Mastery;
- race, alliance, attributes, Mundus, weapons, armor direction, and transformations;
- skills, morphs, passives, ultimates, and their recommended purchase order;
- build phases with front and back bars, rotations, milestones, and attribute targets; a new-character build can cover 1-50 while an existing-character build can start at Level 50 or CP160+;
- equipment stages with individual pieces, traits, enchantments, sources, and alternatives;
- Craft, Warfare, and Fitness Champion Point plans;
- complete named loadouts and smaller situational variants;
- consumables, quickslots, structured companion setups, requirements, performance notes, and research sources.

The Character Tracker reads this information and turns it into a character-specific progression plan.

### If your build uses Scribing

ATTB 3.1.0 stores an exact Scribed Skill recipe when the final ability depends on a specific Grimoire + Focus + Signature + Affix combination. The in-app **Help & Tools -> Progression -> Scribing** page walks from first unlock through acquiring the required ingredients, spending Luminous Ink, crafting the skill, and putting it on the build bar.

## Build starting point: `progression_scope`

Schema 4 includes an **optional, backwards-compatible** object that tells the app what kind of progression the build is meant to cover:

```json
"progression_scope": {
  "starting_point": "cp160_plus",
  "leveling_content_required": false,
  "description": "Designed for an existing CP160+ character changing into this build."
}
```

`starting_point` supports:

- `new_character`: traditional ATTB progression from early leveling toward the final build;
- `level_50`: an existing Level 50 character that may still need a CP160 transition;
- `cp160_plus`: an established CP160+ character being rebuilt, respecced, or finished out.

When `progression_scope` is missing, ATTB preserves older Schema 4 behavior and treats the build as `new_character` with `leveling_content_required: true`. Existing Schema 4 files therefore remain valid.

A non-leveling build still needs at least one useful phase and one gear stage because ATTB needs somewhere to describe its bars/rotation and equipment target. It simply does **not** need fake Levels 1-15, 15-30, or disposable leveling gear solely to satisfy authoring suggestions.

## The four ways to begin

Open **Build Editor → Create New Build**.

### Guided Build

This is the recommended starting point. Choose the important foundation:

1. Build name and base class.
2. Primary role and resource.
3. Suggested race, alliance, and Mundus.
4. Who the build is for: a new character, an existing Level 50 character, or an existing CP160+ character.
5. Pure class or a build that may add subclassing later.
6. One-bar or two-bar setup.

ATTB creates a valid class-specific scaffold with real catalog IDs, starter skills, an attainable ultimate, build phases, bars, rotation structure, equipment, Champion Points, and a default loadout. The scaffold changes with the chosen starting point instead of fabricating 1-50 content for a build meant only for an established character.

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
- roles, content, difficulty, platforms, language, and tags;
- the build starting point and whether traditional leveling content is required.

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

### 5. Leveling Plan / Build Phases

Create the build’s phase timeline. For a normal `new_character` build this is the 1-50 progression plan. For `level_50` or `cp160_plus`, ATTB treats early leveling content as optional and the page becomes a place to author only the transition/target phases the build actually needs. Each phase can contain:

- level and CP range;
- phase overview and milestones;
- attribute target and recommended gear stages;
- front and back bars with explicit ultimate slots;
- a fixed sequence or priority rotation.

Copying a phase is usually faster than rebuilding the next level range from nothing.

### 6. Equipment

Create progression stages such as Training Gear, CP160 Starter, Dungeon Upgrade, and Final Setup. Add sets, individual pieces, traits, enchantments, quality, source details, and alternatives.

### 7. Champion Points

Edit the Craft, Warfare, and Fitness **strategy** plans. Pick canonical stars, set the first-pass investment and eventual target, organize recommended/optional branches, and choose up to four final slottables. ATTB 3.1.0 supplies true max values, stages, passive/slottable state, prerequisite routing, and constellation-map placement from the canonical CP catalog; addon 1.1.3+ can override that fallback with ESO's live graph.

### 8. Companions

ATTB 3.1.0 includes every current combat companion in a dedicated directory plus two starter setups per companion. In the Build Editor you can add a preset, reset an edited setup back to its preset, or author a custom companion target.

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

Change it under **Settings → Build Editor**.

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
