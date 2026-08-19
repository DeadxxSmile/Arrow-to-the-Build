# ATTB Schema 4 Format Reference

Schema 4 is the stable public build contract for Arrow to the Build. This reference is current for **ATTB 3.0.0**. It preserves the original progression model while adding enough structure for current ESO systems and future authoring tools.

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

`progression_scope`, `short_name`, `author`, `game_version`, `verified_date`, `summary`, `notes`, `theme`, `images`, `requirements`, `transformations`, `scribed_skills`, `quickslots`, `companions`, `performance`, `sources`, `setup_help`, `concepts`, `consumables`, `tips`, `default_loadout_id`, `loadouts`, `variants`, `format_notes`, and `extensions`.

## Progression scope

`progression_scope` is optional and additive in Schema 4:

```json
{
  "progression_scope": {
    "starting_point": "cp160_plus",
    "leveling_content_required": false,
    "description": "Existing CP160+ character rebuild."
  }
}
```

`starting_point` is one of `new_character`, `level_50`, or `cp160_plus`. Missing scope data resolves to the legacy default `new_character` + `leveling_content_required: true`, so older Schema 4 files do not need migration.

The scope changes what ATTB expects, not what authors are allowed to include. All builds still keep at least one useful `phase` and `gear_stage`; Level 50 / CP160+ builds simply do not need artificial early-level phases or leveling gear.

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

`unlock_order` rows may also define `requires`, `required_rank`, `priority`, `status`, `phase`, `notes`, `skill_point_cost`, `loadout_ids`, and optional temporary-unlock retirement rules under `retire_when`.

For `status: "temporary"`, `retire_when` may use one of three backward-compatible Schema 4 conditions:

- `{ "type": "character_level", "level": 30 }`
- `{ "type": "skill_line_rank", "line": "herald", "rank": 20 }`
- `{ "type": "unlock_completed", "unlock_id": "replacement_skill" }`

Once a cutoff is met, the Character Tracker retires that temporary step from recommendations. Retirement is character-specific: the player may retire it early or keep it active without changing the ESO snapshot itself.

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

## Companion setups

`companions` remains an optional Schema 4 root array. ATTB 3.0.0 documents these additive companion fields:

- `id` - stable setup ID;
- `companion_id` - stable ID from `resources/data/eso-companions.json`;
- `companion_name` - readable companion name;
- `name`, `role`, and optional `summary`;
- `weapon`, `armor_weight`, and companion trait recommendations;
- up to five priority-ordered normal `skills`;
- a separate `ultimate`;
- `equipment` and `notes` string arrays;
- optional `preset_id` and `source_url`.

Companion ability names are not player catalog skill IDs. Do not place them in `relevant_lines`, `unlock_order`, player phase bars, or player rotations.

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

Scribing is a free base-game system in the current ATTB 3.0.0 / ESO Update 50 baseline. A character can begin the Scribing introduction at Level 30 or with access to the Champion System. The finished active skill is built from exactly four authored pieces:

- one Grimoire, which defines the base skill and parent skill line;
- one Focus Script, which defines the main function and usually the skill name, resource type, and cost;
- one Signature Script, which adds a secondary mechanic or interaction;
- one Affix Script, which adds the final buff or debuff layer.

A specific Schema 4 recipe records those pieces under `scribed_skills` and can also record resource, cost, notes, and the Grimoire's catalog ID. Build bars, rotations, and unlock rows reference the finished recipe with `scribed_skill_id`. A generic Grimoire reference is only sufficient when the exact Script combination genuinely does not matter.

The Scribing **Class Mastery Signature Script** is distinct from the separate Update 50 Class Mastery choice system stored in `class_configuration.class_mastery`; authors should never interchange the two because their names happen to overlap.

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
