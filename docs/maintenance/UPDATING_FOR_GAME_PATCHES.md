# Updating ATTB for ESO game patches

> **Current app release:** ATTB 3.1.1. Use this workflow for post-v3 game-patch maintenance.

ATTB is built so a new ESO update does not require touching React or Electron. Almost everything a
patch changes lives in three data layers:

1. The **skill catalog** (`resources/data/eso-skill-catalog.json`), generated from
   `tools/generate_skill_catalog.py`. This is the game's classes, skill lines, skills, morphs, passives,
   and audited per-point passive unlock gates.
2. The **companion catalog** (`resources/data/eso-companions.json`), which records the current combat-companion
   roster and ATTB's curated companion preset library.
3. The **bundled builds** (`resources/builds/*.json`), which reference the player catalog by stable id and
   supply metadata, class configuration, recommendation order, progression phases, loadouts, gear, Champion Point plans, and optional companion targets.

The app matches builds to the catalog by `catalog_skill_id`, never by display name, so renames in a
patch do not break saved characters or community build files. That is the property this whole design
protects, so the rules below exist mostly to keep it true.

Bundled builds are maintained directly as Schema 4 JSON. The old Mighty Seven bootstrap generator and
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
'catalog_version':'0.5.1-u50-rank-gates',  # bump again for the next data revision
'game_version':'Update 50',                # the ESO update this reflects
'verified_date':'2026-08-09',              # the date you checked it
```

`catalog_version` is free-form but the `x.y.z-uNN` shape (catalog revision plus ESO update) has worked
well: the `-uNN` suffix tells a human which patch it targets, and the leading semver lets you ship a
catalog fix between game updates.

## Scenario: a skill was renamed (no mechanical change)

1. Add or update an entry in `display_name_overrides` in the generator, keyed by the existing id.
2. `python tools/generate_skill_catalog.py`
3. `npm test`

The id is unchanged, so nothing else needs to move.

## Scenario: a passive unlock rank changed

Multi-rank passives need **per-point** skill-line gates, not one shared number. For audited passives, update the `set_unlock_ranks(...)` data in `tools/generate_skill_catalog.py`, regenerate the catalog, and add/update a regression test.

Example: a two-rank passive with points available at line ranks 38 and 46 should emit:

```json
"unlock_ranks": [38, 46]
```

Do not “fix” this only by changing one bundled build's `required_rank`; other builds may carry a different stale value. The catalog gate is the shared safety floor used by Suggested Next Picks. If a passive has not been verified yet, the immediate queue intentionally falls back conservatively to the skill-line maximum.

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
2. Set each new Class line's `class` value consistently and use the same class name under the build's `defaults.class`. ATTB derives class-aware build switching from that data; there is no separate hard-coded class list to update.
3. Regenerate the catalog and run `npm test`.
4. Author a bundled build for the class under `resources/builds/` if you want it in the bundled selector, or leave the catalog entries available for community builds. The catalog alone makes the skills trackable; a build JSON supplies the playable progression guide.

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


## Scenario: companions changed

The combat-companion roster and curated presets live in `resources/data/eso-companions.json`. When ESO adds or materially changes a companion:

1. Verify the companion name, class, race, current abilities, and sensible roles against current sources.
2. Add/update exactly the curated presets ATTB intends to ship. Keep companion abilities as plain companion skill names; never create player `catalog_skill_id` values for them.
3. Update `verified_date`, source URLs, Build Editor/Character Tracker documentation if the system behavior changed, and companion regression tests.
4. If Schema 4 needs a new optional companion field, extend it additively; do not bump the whole public schema for ordinary preset data.
5. Run `npm test` and `npm run build:renderer`.

## Scenario: CP nodes or paths changed

ATTB 3.1.1 keeps Champion Point facts in two app-owned canonical files: `resources/data/eso-cp-catalog.json` for rules/topology and `resources/data/eso-cp-layout.json` for exact constellation placement and cluster membership. CP facts no longer live independently inside every build, and the map does not depend on addon synchronization. A game-patch CP audit should update these canonical files first, then review affected build **strategy**.

Audit `eso-cp-catalog.json` for:

- ESO skill ID and canonical name;
- constellation (`craft`, `warfare`, `fitness`);
- true `max_points`;
- stage/jump thresholds and the first route-opening milestone;
- passive/slottable state;
- root/cluster-root status;
- graph links and verified prerequisite paths.

Audit `eso-cp-layout.json` for:

- one row for every canonical Champion star;
- exact Update-specific constellation X/Y coordinates;
- matching ESO skill IDs and tree ownership;
- nested-cluster membership and cluster-root flags.

Addon 1.1.3+ exports all Champion stars with live max values, stages, slottable state, links, roots, and coordinates. Use a fresh ESO snapshot to **verify** the bundled catalog/layout and detect drift after a game patch. If the live graph differs, investigate and deliberately update the app-owned canonical data; never make correct map rendering contingent on a character having synchronized first.

For affected builds in `resources/builds/`:

- `core` and non-optional flex nodes are authored priorities; optional groups remain alternatives;
- `first_pass_points` says how far to invest before continuing;
- `target_points` says the eventual intended investment;
- omit duplicated `name`, `max_points`, `jump_points`, `slottable`, tree, and map-position facts;
- `final_slots` may only list canonical slottable authored targets.

Run `node tests/cpCatalog.test.mjs`, `node tests/cp.test.mjs`, the full suite, and a renderer build. The CP tests should prove that every bundled target exists, every bundled final slot is really slottable, and every recommended offline route is verified.

## Scenario: node-level number changes (max points, stages, or slottable state)

- Player-skill passive `max_points` still live in the skill catalog/generator.
- Champion Point `max_points`, stage thresholds, slottable state, tree identity, graph links, and map coordinates live in `eso-cp-catalog.json`.
- Build `first_pass_points` / `target_points` are strategy and should be changed only when the recommended route itself changes.

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

1. Update `catalog_version`, `game_version`, `verified_date` in the generator when player-skill data changed; update the companion catalog metadata when companion data changed.
2. Make the catalog edits (renames via `display_name_overrides`, additions via `add_line`, passive point gates via `set_unlock_ranks`).
3. `python tools/generate_skill_catalog.py` and confirm it prints the expected line/skill counts.
4. Update `resources/data/eso-companions.json` when the roster/presets changed, then update bundled builds for new recommendations, CP changes, removed skills, or companion targets.
5. Review Schema 4 systems affected by the patch: metadata, `progression_scope`, class lines, Class Mastery, Scribing, loadouts, phases, gear, CP, transformations, requirements, and sources. Do not add fake 1-50 content to builds explicitly scoped for existing Level 50 / CP160+ characters.
6. Update each edited build's own `game_version` and `verified_date`.
7. Update `docs/maintenance/ESO_BUILD_SYSTEM_AUDIT.md` when the patch adds a new character or build system.
8. `npm test` and `npm run build:renderer`.
9. Bump the app version in `package.json` if you are cutting a release.

If the suite is green after this, the catalog and builds are internally consistent, every morph links
correctly, every build still validates against the catalog, and nothing references a missing id.

## Use Review & Save for each build

After updating the catalog and patch-sensitive build data:

1. Open the build in the Build Editor.
2. Open **Review & Save**.
3. Resolve all blocking errors and missing catalog references.
4. Review warnings involving class lines, skills, early/final hotbars, gear, Champion Points, and verification metadata.
5. Use the draft preview to inspect the first and final progression setups.
6. Compare the current draft with the last saved revision.
7. Add a revision note summarizing the patch changes.
8. Choose **Mark Reviewed** only after the strategic review is complete.
9. Save the next permanent revision and confirm the managed JSON mirror updates.

The compatibility panel checks identifiers and metadata. It cannot determine whether numerical balance changes make a skill, set, rotation, race, or Champion star optimal.
