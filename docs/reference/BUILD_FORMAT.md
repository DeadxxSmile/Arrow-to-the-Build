# ATTB Schema 4 Format Reference

Schema 4 is the stable public build contract for Arrow to the Build. It preserves the original progression model while adding enough structure for current ESO systems and future authoring tools.

## Compatibility policy

- Schema 4 is the format new builds should use.
- Valid Schema 3 builds are migrated to Schema 4 during import.
- ATTB exports normalized Schema 4.
- New optional fields can be added without invalidating older Schema 4 files.
- Tool-specific data belongs under `extensions`.
- Stable IDs are never display text and should not be renamed after release.

## Required root fields

| Field | Purpose |
|---|---|
| `schema_version` | Must be `4`. |
| `id` | Permanent build slug. |
| `name` | Display name. |
| `metadata` | Role, content, resource, bar count, and class style. |
| `class_configuration` | Base class, active class lines, and Class Mastery. |
| `defaults` | Recommended character setup and final attribute target. |
| `relevant_lines` | Skill lines shown and tracked by the build. |
| `cp_plans` | Craft, Warfare, and Fitness routes. |
| `unlock_order` | Ordered skills, morphs, passives, ultimates, and mastery choices. |
| `phases` | Level/CP bands with bars and rotations. |
| `gear_stages` | Piece-by-piece equipment progression. |

`relevant_lines`, `unlock_order`, `phases`, and `gear_stages` are required to be non-empty. The three active class lines must all appear in `relevant_lines`.

## Optional root fields

`short_name`, `author`, `game_version`, `verified_date`, `summary`, `notes`, `theme`, `images`, `requirements`, `transformations`, `scribed_skills`, `quickslots`, `companions`, `performance`, `sources`, `setup_help`, `concepts`, `consumables`, `tips`, `default_loadout_id`, `loadouts`, `variants`, `format_notes`, and `extensions`.

### Build notes

`notes` is optional long-form plain text for build mechanics, author commentary, planned changes, caveats, and other guidance that does not fit a structured section. ATTB stores it as a normal JSON string, preserves line breaks, and limits it to 20,000 characters. Raw HTML is not interpreted.

## Stable ID rules

Build, line, unlock, phase, gear-stage, set, piece, CP-node, CP-group, quickslot, companion, Scribed Skill, loadout, and variant IDs use:

```text
letters, numbers, dot, dash, underscore
```

Use lowercase snake_case for readability. IDs are used for persistence and merge behavior.

## Merge behavior

Loadout and variant `overrides` use these rules:

1. An omitted key inherits the base value.
2. `null` explicitly clears an optional section.
3. Plain values replace the base value.
4. Ordinary arrays replace the base array.
5. Arrays whose entries all have string `id` fields merge by `id`.
6. A keyed override row with `$remove: true` removes that row.
7. Overrides cannot replace `id`, `schema_version`, `loadouts`, or `default_loadout_id`.

Loadout overrides are applied before variant overrides.

## Class-line modes

| Mode | Meaning |
|---|---|
| `native` | A line belonging to the character's base class. |
| `subclassing` | A foreign line currently being trained. |
| `mastered` | A foreign line already mastered account-wide. |

A configuration contains exactly three active class lines, lists all three in `relevant_lines`, keeps at least one native line, and uses no more than one line from each foreign class.

## Skill references

Use `catalog_skill_id` for ordinary ESO skills and Grimoires. Use `scribed_skill_id` for a specific recipe declared in `scribed_skills`. Do not set both on the same row.

`unlock_order` rows may also define `requires`, `required_rank`, `priority`, `status`, `phase`, `notes`, `skill_point_cost`, and `loadout_ids`.

## Progression phases

Each phase includes:

- `min_level` and `max_level`;
- optional `min_cp`, `max_cp`, and conditions;
- front and back bars;
- zero to five normal slots per bar;
- an ultimate per bar when applicable;
- a sequence or priority rotation;
- optional loadout scoping;
- optional phase attribute targets;
- optional `recommended_gear_stage_ids` references;
- optional milestone reminders.

## Equipment

A stage contains sets. A set contains individual pieces. A piece can record slot, weight, weapon type, trait, enchantment, quality, active set count, bar, poison, perfected/mythic status, notes, and alternatives.

Sources can record type, location, zone, access, DLC/chapter, ESO Plus relevance, tradeability, difficulty, URL, collection source, and alternatives.

## Champion Points

Every build supplies `craft`, `warfare`, and `fitness` plans. A plan contains:

- ordered `core` nodes;
- ordered flex groups;
- optional flex groups;
- node connections through `requires`;
- jump-point thresholds;
- up to four unique slottable IDs in `final_slots`.

## Loadouts and variants

Use **loadouts** for complete named setups: beginner/final, solo/trial, trash/boss, tank/healer, one-bar/two-bar, or different class-line configurations.

Use **variants** for smaller situational changes inside a compatible loadout: easier rotation, PvP consumables, a defensive skill swap, or DLC/no-DLC alternatives.

## Scribing

A specific recipe contains a Grimoire, Focus Script, Signature Script, and Affix Script. The recipe can also record resource, cost, notes, and the Grimoire's catalog ID.

## Extension data

```json
{
  "extensions": {
    "your_github_name": {
      "custom_field": "value"
    }
  }
}
```

ATTB preserves namespaced extension data even when the current UI does not display it.
