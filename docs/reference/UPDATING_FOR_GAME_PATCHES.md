# Updating ATTB for ESO game patches

ATTB is built so a new ESO update does not require touching React or Electron. Almost everything a
patch changes lives in two data layers:

1. The **skill catalog** (`resources/data/eso-skill-catalog.json`), generated from
   `tools/generate_skill_catalog.py`. This is the game's classes, skill lines, skills, morphs, and
   passives.
2. The **bundled builds** (`resources/builds/*.json`), which reference the catalog by stable id and
   supply the recommendation order, phases, gear, and CP plans.

The app matches builds to the catalog by `catalog_skill_id`, never by display name, so renames in a
patch do not break saved characters or community build files. That is the property this whole design
protects, so the rules below exist mostly to keep it true.

Bundled builds are maintained directly as schema-3 JSON. The old Mighty Seven bootstrap generator and
one-time schema upgrader were removed before the public release because they produced obsolete
pre-release formats. `tools/generate_skill_catalog.py` is the only live Python regeneration tool.

## The golden rule about ids

A catalog id looks like `herald__fatecarver`: `{line_id}__{slugged_skill_name}`. Once an id ships, it
is a permanent contract with every build file and every saved character that references it.

- **Renaming a skill's display text:** safe. Keep the id, change the `name`. Use the
  `display_name_overrides` map in the generator so the id stays stable while the label updates.
- **Changing an id:** breaking. Every build row and every saved character pointing at the old id stops
  resolving. Only do this with a deliberate migration (see "Removing or renaming an id" below).

## Bump the version metadata every time

In `tools/generate_skill_catalog.py`, update these three fields near the bottom before regenerating:

```python
'catalog_version':'0.4.0-u50',   # bump, e.g. 0.5.0-u51
'game_version':'Update 51',      # the ESO update this reflects
'verified_date':'2026-08-05',    # the date you checked it
```

`catalog_version` is free-form but the `x.y.z-uNN` shape (catalog revision plus ESO update) has worked
well: the `-uNN` suffix tells a human which patch it targets, and the leading semver lets you ship a
catalog fix between game updates.

## Scenario: a skill was renamed (no mechanical change)

1. Add or update an entry in `display_name_overrides` in the generator, keyed by the existing id.
2. `python tools/generate_skill_catalog.py`
3. `npm test`

The id is unchanged, so nothing else needs to move.

## Scenario: a new passive, active, or morph was added to an existing line

1. In the generator, add the skill to that line's `add_line(...)` block. Use `family(base, m1, m2)`
   for an ability with two morphs, or `passives([...])` for passives.
2. `python tools/generate_skill_catalog.py`. The generator asserts that every morph points back at its
   base and every base lists its morphs, so a mistake fails loudly here.
3. Optionally reference the new id from a bundled build's `unlock_order` if the build should recommend
   it. New catalog entries do not have to appear in any build.
4. `npm test`

## Scenario: a whole new class was added

1. Add the class's skill lines in the generator with `add_line(id, name, 'Class', [...], cls='NewClass')`,
   including its Class Mastery line if it has one.
2. Add `'NewClass'` wherever the app enumerates classes if you want class-aware behavior. Grep for an
   existing class name (for example `Arcanist`) to find these spots; today the main one is the build
   switch logic in `src/main/ipc/characterHandlers.js`, which keeps class lines only when the build's
   class matches.
3. Regenerate the catalog and run `npm test`.
4. Author a bundled build for the class under `resources/builds/` if you want it in the launch set, or
   leave the catalog entries available for community builds. A build is required for the class to show
   up as a bundled option; the catalog alone just makes the skills trackable.

## Scenario: a skill was removed from the game

Do **not** silently delete the catalog entry. A build or a saved character may still reference it, and
`resolveUnlockRow` will surface a clear "does not exist in the bundled catalog" error, which is the
right outcome but a jarring one if it is a surprise.

Preferred order:

1. Remove the id from any bundled build's `unlock_order`, phases, and CP `final_slots` first.
2. Then remove the skill from the generator and regenerate.
3. Bump `catalog_version`.

Community build files that still reference the removed id will fail validation on import with a
readable message telling the author which id is gone. That is intended.

## Scenario: CP nodes or paths changed

CP plans live entirely in each build's `cp_plans`, not in the catalog, so a CP rework is a build-data
edit, not a code change. For each affected build in `resources/builds/`:

- `core` is the required path, filled first. `flex` groups are optional branches filled in order.
- `max_points` per node caps at the 1,200 per-constellation limit; the validator enforces this.
- `jump_points` are stage thresholds and must not exceed the node's own `max_points`.
- `final_slots` may only list slottable stars that exist in the plan.

Edit the JSON directly, then `npm test`. The build validator checks node ids, duplicate nodes, stage
thresholds, the tree cap, and slottable-only final slots, so most mistakes fail the suite.

## Scenario: node-level number changes (max points, ranks, thresholds)

- Per-skill `max_points` (passive ranks) live in the catalog: edit the generator and regenerate.
- Per-CP-node `max_points`, `jump_points`, and `slottable` live in the build: edit the build JSON.

## Removing or renaming an id (the breaking case)

If you truly must change an id, treat it as a migration:

1. Change it in the generator and in every bundled build that references it.
2. Regenerate and run the suite; failures point at every remaining reference.
3. Because ids are also stored on saved characters (in `completed` and `skill_allocations`), decide
   whether to ship a data migration. The current app has no automatic id-rename migration, so without
   one, an affected saved character keeps the old id in its data and that entry simply stops resolving.
   For a launch-era rename with no real user data this is fine; after real adoption, add a migration
   under `src/main/database/migrations/` that rewrites the old id to the new one in the character JSON.

## The checklist for any patch

1. Update `catalog_version`, `game_version`, `verified_date` in the generator.
2. Make the catalog edits (renames via `display_name_overrides`, additions via `add_line`).
3. `python tools/generate_skill_catalog.py` and confirm it prints the expected line/skill counts.
4. Update bundled builds for new recommendations, CP changes, or removed skills.
5. Update each edited build's own `game_version` and `verified_date`.
6. `npm test` and `npm run build:renderer`.
7. Bump the app version in `package.json` if you are cutting a release.

If the suite is green after this, the catalog and builds are internally consistent, every morph links
correctly, every build still validates against the catalog, and nothing references a missing id.
