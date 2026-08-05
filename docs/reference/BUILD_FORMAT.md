# ATTB build JSON format — schema version 3

ATTB build files are ordinary UTF-8 JSON. Schema 3 is the first public-facing format and is the only
build schema accepted by v0.5.x. The app remains generic: bundled and imported builds use the same
format, and variants can replace any supported build section.

## Required top-level structure

```json
{
  "schema_version": 3,
  "id": "unique-lowercase-build-id",
  "name": "Readable Build Name",
  "game_version": "Update 50",
  "defaults": {},
  "setup_help": {},
  "relevant_lines": [],
  "cp_plans": {},
  "unlock_order": [],
  "phases": [],
  "gear_stages": [],
  "consumables": {},
  "tips": [],
  "variants": []
}
```

IDs use `^[a-z0-9][a-z0-9_.-]*$`. Display names may use normal punctuation and spacing.

## Character defaults and setup help

`defaults` contains the build recommendation, not the character's actual profile. Race and alliance
are selected when a character is created and can be changed under Character Settings.

```json
"defaults": {
  "class": "Arcanist",
  "race": "Dark Elf",
  "alliance": "Ebonheart Pact",
  "attributes": { "magicka": 0, "health": 0, "stamina": 64 },
  "mundus": "The Thief",
  "front_weapon": "Dual Daggers",
  "back_weapon": "Inferno Staff",
  "leveling_armor": "5 Medium / 1 Light / 1 Heavy",
  "endgame_armor": "6 Medium / 1 Light",
  "leveling_trait": "Training",
  "gear_cap": "Level 50 / CP160"
},
"setup_help": {
  "race": {
    "summary": "Why the recommended race fits.",
    "recommended": "Dark Elf",
    "alternatives": ["Khajiit", "Orc"],
    "notes": ["Race is an optimization, not a requirement."]
  },
  "mundus": {
    "summary": "Why the Mundus is used.",
    "locations": ["Malabal Tor", "Alik'r Desert", "Eastmarch", "Cyrodiil"]
  }
}
```

## Skill lines and unlock order

Every `relevant_lines` id must exist in the bundled ESO catalog. Every unlock row requires a stable
`catalog_skill_id`. Display names do not control saved progress.

```json
{
  "id": "cephaliarch_flail",
  "name": "Cephaliarch's Flail",
  "catalog_skill_id": "herald__cephaliarch_s_flail",
  "line": "herald",
  "kind": "Morph",
  "required_rank": 20,
  "phase": "Mid",
  "status": "final",
  "priority": 170,
  "requires": ["abyssal_impact"],
  "notes": "Permanent Crux generator.",
  "image": "assets/arcanist-cephaliarch-s-flail-icon.webp"
}
```

Supported statuses are `final`, `temporary`, and `optional`. Morph requirements, passive rank counts,
and catalog line/type matches are validated.

## Progression phases, hotbars, and rotations

Each phase defines five front-bar slots, five back-bar slots, an optional ultimate on each bar, and a
structured sequence or priority system. Slots may reference known catalog skills and optional bundled
images. Missing images use ATTB's local fallback artwork.

```json
{
  "id": "15-30",
  "label": "Levels 15-30",
  "min_level": 15,
  "max_level": 29,
  "overview": "Establish the second bar and core combat loop.",
  "front_bar": {
    "weapon": "Dual Daggers",
    "slots": [
      { "name": "Cephaliarch's Flail", "catalog_skill_id": "herald__cephaliarch_s_flail" }
    ],
    "ultimate": { "name": "The Tide King's Gaze", "catalog_skill_id": "herald__the_tide_king_s_gaze" }
  },
  "back_bar": {
    "weapon": "Inferno Staff",
    "slots": [],
    "ultimate": null
  },
  "rotation": {
    "type": "priority",
    "title": "What to do next",
    "summary": "Keep damage-over-time effects active, then spend Crux.",
    "opener": [],
    "steps": [
      { "name": "Build three Crux" },
      { "name": "Pragmatic Fatecarver" }
    ],
    "execute": [],
    "notes": []
  }
}
```

`rotation.type` is `sequence` or `priority`. A bar may include `locked` text for pre-Level-15 phases.

## Equipment stages

Equipment is grouped by set, while every armor, jewelry, and weapon slot has its own stable piece id.
Dual-wield weapons are separate pieces. Progress is stored against the piece id, so array order can
change without moving checks to the wrong item.

```json
{
  "id": "starter",
  "name": "CP160 crafted starter",
  "min_level": 50,
  "max_level": 9999,
  "summary": "Accessible permanent starter gear.",
  "sets": [
    {
      "id": "orders_wrath",
      "name": "Order's Wrath",
      "role": "Primary set",
      "bonus": "Critical chance and critical damage.",
      "source": {
        "type": "Crafted",
        "location": "Steadfast Hammer and Saw",
        "zone": "High Isle",
        "access": "Tradable; another player can craft it",
        "requirement": "3 researched traits",
        "tradeable": "Yes",
        "difficulty": "Easy",
        "notes": "Ask a guild crafter if needed.",
        "alternative": "Another accessible damage set"
      },
      "pieces": [
        {
          "id": "starter_orders_shoulders",
          "slot": "Shoulders",
          "weight": "Medium",
          "trait": "Divines",
          "enchantment": "Max Stamina",
          "quality": "Purple"
        }
      ]
    }
  ]
}
```

## Champion Points and variants

Champion Point plans use the schema-3 `core`, `flex`, and `final_slots` model. Each constellation is
capped at 1,200 points. Optional flex groups are displayed but not automatically allocated.

Variants use object overrides. Arrays of identified objects merge by `id`; ordinary arrays replace the
base array. A complete alternate loadout may replace defaults, unlocks, phases, gear, consumables, CP,
and tips. Unavailable placeholders must include `unavailable_reason`.

## Validation and import/export

Use Help & Tools → Import / Export to validate, import, inspect, copy, or save schema-3 JSON. The page
can show either the stored base build or the effective build after the selected variant is applied.
Older pre-release build schemas are intentionally rejected by v0.5.x.
