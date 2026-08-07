# Validation & Troubleshooting

This page covers the most common Build Editor, JSON, draft, revision, and file-sync problems.

## Recovery autosave and permanent saves

A recovery draft can be incomplete or invalid. This is intentional: ATTB should protect work while you are halfway through changing class lines, skills, gear, or references.

**Save Build** is stricter. It creates a permanent revision only after the complete Schema 4 object passes validation.

If Save Build refuses a draft, the recovery copy remains safe.

## “Not checked yet”

This only means validation has not been run during the current editor session. Select **Validate Build** or **Save Build**.


## Review categories

Review & Save separates findings into three levels:

- **Errors** block Save Build.
- **Warnings** do not block saving, but usually deserve a deliberate review.
- **Suggestions** are optional authoring improvements.

Use **Go to section** to open the relevant editor page. Game-update compatibility and catalog-reference checks appear on the same Review page.

## Common validation problems

### Missing required sections

Schema 4 requires usable `metadata`, `class_configuration`, `defaults`, `relevant_lines`, `cp_plans`, `unlock_order`, `phases`, and `gear_stages`.

A blank array may be structurally valid JSON but is not a complete ATTB build.

### Duplicate or invalid IDs

Persistent IDs must be unique in their scope and use only letters, numbers, dot, dash, and underscore.

Prefer lowercase snake_case. Do not use display names as IDs.

### Active class lines are invalid

Check that:

- exactly three unique lines are selected;
- at least one belongs to the base class;
- no foreign class supplies two lines;
- each active line is present in Relevant Lines;
- Class Mastery is disabled when subclassing.

Use **Reset to Pure Class** when a complex edit becomes tangled.

### Unknown catalog skill ID

The `catalog_skill_id` must exist in the bundled game catalog and belong to the line named by the unlock row.

Use **Format & Skill IDs** or the Skills & Passives browser to locate the current ID.

### Morph or prerequisite problems

A morph should point to its real base ability. The visual editor adds the base row when possible, but manual JSON can still create broken relationships.

### Bar skill missing from the Unlock Plan

Every bar ability and ultimate should exist in `unlock_order`. Add it in Skills & Passives before selecting it in Leveling Plan.

### Missing ultimate

Each active bar should have an explicit ultimate when the build expects one at that phase. An intentionally unavailable ultimate should be explained in the phase rather than silently omitted from late progression.

### Back bar before Level 15

Weapon swap unlocks at character Level 15. Early phases should omit or visibly lock the back bar.

### Attribute total exceeds 64

The Level 50 target and phase targets cannot allocate more than 64 total points across Magicka, Health, and Stamina.

### Invalid CP final slot

A final Champion Bar ID must:

- exist in the same tree’s plan;
- be unique in the final bar;
- explicitly set `slottable: true`;
- fit within the four-slot limit.

### Broken gear-stage reference

A phase’s `recommended_gear_stage_ids` must refer to existing gear-stage IDs. The visual editor cleans these references when a stage is deleted; manual edits must do so explicitly.

### Broken loadout or variant scope

A default loadout and every compatible-loadout reference must point to an existing loadout ID. Loadout and variant IDs must be unique.

## Import errors

### The file is not valid JSON

JSON does not allow comments, trailing commas, or unquoted keys. Use a JSON-aware editor and check the line/column in the import message.

### Schema version is unsupported

New files should use `schema_version: 4`. Valid Schema 3 files are migrated during import. Schema 1 and 2 were pre-release formats and are unsupported.

### Bundled ID is protected

A community file cannot replace a bundled ATTB build. Change the build’s permanent `id` and display `name`, or fork the bundled build inside the Build Library.

### An editable build with the same ID already exists

Decide whether the file is an update to the existing build or a distinct fork. Distinct builds require distinct permanent IDs.

## Draft and revision recovery

### The app closed before Save Build

Open the Build Editor. The last active recovery draft should reopen automatically.

### Restore an older revision

Open **Review & Save**, select **Restore to Draft**, review the restored version, and choose Save Build to create a new revision. Newer history is not deleted.

### Discard Recovery Changes

This replaces the draft with the latest permanent revision. Use it only when you intentionally want to abandon unsaved work.

## User-build folder and sync issues

### JSON sync pending

The internal revision was saved, but ATTB could not update the visible JSON file. Common causes:

- the selected folder is unavailable;
- an external drive is disconnected;
- the folder is read-only;
- cloud-sync software temporarily locked the file;
- the file was modified outside ATTB.

The SQLite revision remains safe. Restore access and select **Sync Saved Builds** in Build Editor Settings.

### File modified outside ATTB

ATTB preserves external changes rather than silently overwriting them. Review the file and intentionally import/reload it, or replace it with the current ATTB version.

### Changing the build folder

ATTB copies saved builds to the new folder before switching. If any copy fails, the current folder remains active.

### A deleted build file returned

Selecting Sync Saved Builds recreates the latest permanent JSON mirror from SQLite. Draft-only builds are not written until Save Build succeeds.

## A page could not be drawn

The Error Boundary protects the rest of the app and leaves data untouched. Record:

- the exact error shown;
- the active build and page;
- whether the build was guided, forked, imported, or manually edited;
- the development log when available.

Try another editor page or reopen the build. Do not delete the database or recovery files before exporting diagnostics.

## Safe bug-report information

Useful information includes:

- ATTB version;
- ESO game version stored in the build;
- steps to reproduce;
- console/log output;
- a sanitized build JSON when the problem is build-specific.

Do not post private paths, character backup details, or unrelated personal data publicly.
