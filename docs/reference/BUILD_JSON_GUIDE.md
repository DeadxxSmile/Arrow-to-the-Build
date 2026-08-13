# Manual Schema 4 JSON Authoring

This is the field-level guide for authors who want to **hand-make or directly edit ATTB build JSON**. The visual Build Editor and manual JSON use the same Schema 4 object, so a build can move between the two workflows without conversion.

Read **Start Here** for the basic app model and **Visual Build Editor Guide** for normal in-app authoring. Use this document when you need exact fields, subclassing, Scribing, loadout overrides, merge behavior, extensions, or direct text-editor control.

## Recommended manual workflow

1. Open **Build Editor → Import / Export**.
2. Export the blank template, or export/fork a complete working build.
3. Edit a separate copy in a JSON-aware text editor.
4. Preserve permanent IDs unless you are deliberately creating a distinct fork.
5. Keep the file valid JSON: no comments, trailing commas, or unquoted keys.
6. Import or validate the file through ATTB.
7. Fix every validation error.
8. Save the build to create an immutable revision and managed JSON mirror.
9. Test the build in the Character Tracker at several level and CP ranges.

ATTB normalizes valid Schema 3 files to Schema 4 during import, but all new files should use `schema_version: 4`.

# 1. Root structure


### Build Editor storage

Manual JSON and visually edited builds use the same Schema 4 object. A successful **Save Build** stores an immutable revision inside ATTB and mirrors the latest saved user build to `<build-id>.json` in the configured user build folder. Recovery drafts stay in SQLite because they may be intentionally incomplete or temporarily invalid. Bundled builds remain read-only and are never mirrored into the user folder.

The default folder is `Documents\Arrow to the Build\Builds`; it can be changed under Build Editor Settings. If a file was changed outside the app, ATTB keeps that version rather than overwriting it.

## Required fields

| Field | Type | Purpose |
|---|---|---|
| `schema_version` | integer | Must be `4`. |
| `id` | string | Permanent build identifier. |
| `name` | string | Full display name. |
| `metadata` | object | Searchable build type and compatibility information. |
| `class_configuration` | object | Base class, active class lines, and Class Mastery choices. |
| `defaults` | object | Recommended character setup. |
| `relevant_lines` | array | Skill lines tracked by the build. |
| `cp_plans` | object | Craft, Warfare, and Fitness paths. |
| `unlock_order` | array | Ordered purchases and recommendations. |
| `phases` | array | Progression bars and rotations. |
| `gear_stages` | array | Piece-by-piece equipment stages. |

The required progression arrays are not placeholders: `relevant_lines`, `unlock_order`, `phases`, and `gear_stages` must contain usable entries. Every active class line must also be listed in `relevant_lines`.

## Optional fields

| Field | Purpose |
|---|---|
| `short_name` | Compact display name. |
| `author` | Build author or team. |
| `game_version` | ESO update or patch target. |
| `verified_date` | Last manually checked date in `YYYY-MM-DD`. |
| `summary` | Short description. |
| `notes` | Optional long-form plain-text build notes shown in Basic Setup and edited in Build Editor. |
| `theme` | Build-page accent colors. |
| `images` | Hero and screenshot references. |
| `requirements` | DLC, chapter, quest, level, system, or item requirements. |
| `transformations` | None, Vampire, or Werewolf setup. |
| `scribed_skills` | Exact Grimoire and script recipes. |
| `quickslots` | Recommended quickslot wheel entries. |
| `companions` | Companion setup recommendations. |
| `performance` | Stats, duties, buffs, debuffs, and testing notes. |
| `sources` | Research and attribution. |
| `setup_help` | Human-readable explanations of default choices. |
| `concepts` | Build concepts shown on Basic Setup. |
| `consumables` | Food, drinks, potions, poisons, and alternatives. |
| `tips` | Numbered or grouped gameplay tips. |
| `default_loadout_id` | Loadout selected by default. |
| `loadouts` | Complete named setups. |
| `variants` | Smaller situational overrides. |
| `format_notes` | Notes for authors and maintainers. |
| `extensions` | Namespaced data for other tools and future systems. |

# 2. IDs and display text

Every persistent row should use a stable slug ID:

```json
{
  "id": "starter_cp160",
  "name": "Starter CP160 Gear"
}
```

Allowed ID characters are letters, numbers, dot, dash, and underscore. Lowercase snake_case is recommended.

Names can change. IDs should not. ATTB uses IDs for saved character progress, merge behavior, routes, equipment checks, and references.

# 3. Metadata

`metadata` describes where the build belongs without using a closed enum that would become obsolete when ESO adds content.

```json
{
  "metadata": {
    "roles": ["damage", "solo"],
    "content": ["overland", "dungeons", "arenas", "trials"],
    "group_sizes": ["solo", "duo", "4-player", "12-player"],
    "resource": "stamina",
    "bar_count": 2,
    "class_style": "pure_class",
    "playstyles": ["flexible-pve", "beam"],
    "difficulty": ["normal", "veteran"],
    "platforms": ["PC", "Xbox", "PlayStation"],
    "language": "en",
    "tags": ["arcanist", "starter", "group-pve"]
  }
}
```

Required metadata fields are `roles`, `content`, `resource`, `bar_count`, and `class_style`.

`bar_count` is `1` or `2`. A one-bar build can still include a locked or explanatory back bar in phases, but the metadata tells future filtering and the visual editor what the intended final setup is.

# 4. Class configuration, subclassing, and Class Mastery

## Pure class

```json
{
  "class_configuration": {
    "base_class": "Arcanist",
    "active_class_lines": [
      { "line_id": "curative", "source_class": "Arcanist", "mode": "native", "notes": [] },
      { "line_id": "herald", "source_class": "Arcanist", "mode": "native", "notes": [] },
      { "line_id": "soldier", "source_class": "Arcanist", "mode": "native", "notes": [] }
    ],
    "class_mastery": {
      "enabled": true,
      "points_available": 2,
      "choices": [
        "arcanist_mastery__unbound_potential",
        "arcanist_mastery__ink_scribe_s_verve"
      ],
      "notes": []
    },
    "notes": []
  }
}
```

## Subclass or mastered foreign line

```json
{
  "class_configuration": {
    "base_class": "Dragonknight",
    "active_class_lines": [
      { "line_id": "ardent_flame", "source_class": "Dragonknight", "mode": "native", "notes": [] },
      { "line_id": "earthen_heart", "source_class": "Dragonknight", "mode": "native", "notes": [] },
      { "line_id": "animal_companions", "source_class": "Warden", "mode": "mastered", "notes": [] }
    ],
    "class_mastery": {
      "enabled": false,
      "points_available": 2,
      "choices": [],
      "notes": ["Class Mastery is disabled while a foreign class line is equipped."]
    },
    "notes": []
  }
}
```

Rules enforced by ATTB:

- exactly three active class lines;
- every active class line also listed in `relevant_lines`;
- at least one native line from the base class;
- no more than one active line from each foreign class;
- `native` only for the base class;
- foreign rows use `subclassing` or `mastered`;
- Class Mastery cannot be enabled with a foreign line active;
- mastery choice IDs must belong to the base class's mastery line;
- selected mastery choices cannot exceed `points_available`.

Foreign class abilities and passives cost two ordinary Skill Points. Set `skill_point_cost: 2` on every corresponding `unlock_order` row.

# 5. Requirements and transformations

## Requirements

```json
{
  "requirements": [
    {
      "id": "scribing_access",
      "name": "Scribing unlocked",
      "type": "system",
      "required": false,
      "access": "Complete the Scribing introduction or use the non-Scribing alternative.",
      "url": "https://help.elderscrollsonline.com/app/answers/detail/a_id/65808/",
      "notes": []
    }
  ]
}
```

Requirements can describe chapters, DLC, quests, level gates, systems, items, group support, or platform limitations. The strings are intentionally open-ended.

## Transformations

```json
{
  "transformations": {
    "curse": "vampire",
    "vampire_stage": 3,
    "notes": ["Maintain Stage 3 for the defensive passive."]
  }
}
```

`curse` is `none`, `vampire`, or `werewolf`. Werewolf builds can use `werewolf_morph` and notes.

# 6. Default character setup

```json
{
  "defaults": {
    "class": "Templar",
    "race": "High Elf",
    "alliance": "Aldmeri Dominion",
    "eso_plus": false,
    "attributes": {
      "magicka": 64,
      "health": 0,
      "stamina": 0
    },
    "mundus": "The Thief",
    "front_weapon": "Dual Daggers",
    "back_weapon": "Inferno Staff",
    "leveling_armor": "5 Light / 1 Medium / 1 Heavy",
    "endgame_armor": "Build-specific final weights",
    "leveling_trait": "Training",
    "gear_cap": "Level 50 / CP160",
    "role": "Flexible PvE damage",
    "resource": "Magicka",
    "curse": "none"
  }
}
```

The attribute total cannot exceed 64. These are build targets, not saved character progress.

Use `setup_help` when a choice needs explanation:

```json
{
  "setup_help": {
    "race": {
      "summary": "Dark Elf is a flexible damage option.",
      "recommended": ["Dark Elf"],
      "alternatives": ["High Elf", "Khajiit"],
      "locations": [],
      "notes": []
    }
  }
}
```

# 7. Skill lines and the catalog

## Relevant lines

```json
{
  "relevant_lines": [
    { "id": "aedric_spear", "name": "Aedric Spear", "group": "Class", "max": 50 },
    { "id": "dual_wield", "name": "Dual Wield", "group": "Weapon", "max": 50 },
    { "id": "light_armor", "name": "Light Armor", "group": "Armor", "max": 50 }
  ]
}
```

Every `unlock_order.line` must appear here. The line ID must exist in the bundled catalog.

## Unlock rows

```json
{
  "unlock_order": [
    {
      "id": "puncturing_strikes",
      "name": "Puncturing Strikes",
      "catalog_skill_id": "aedric_spear__puncturing_strikes",
      "section": "Active",
      "line": "aedric_spear",
      "required_rank": 1,
      "kind": "Active",
      "phase": "Leveling",
      "status": "temporary",
      "retire_when": { "type": "character_level", "level": 30 },
      "priority": 10,
      "notes": "Use until the intended morph and final rotation are ready.",
      "requires": [],
      "skill_point_cost": 1
    }
  ]
}
```

### Important unlock fields

| Field | Meaning |
|---|---|
| `id` | Stable row ID. |
| `catalog_skill_id` | Ordinary catalog skill, morph, passive, ultimate, or Grimoire. |
| `scribed_skill_id` | Exact recipe defined under `scribed_skills`. |
| `line` | Catalog line ID. |
| `required_rank` | Skill-line rank gate. |
| `kind` | Display category such as Active, Morph, Passive, Ultimate, Scribing, or Class Mastery. |
| `status` | Author label such as temporary, leveling, final, optional, or tracking. |
| `retire_when` | Optional cutoff for `temporary` rows. Supported types: `character_level`, `skill_line_rank`, or `unlock_completed`. |
| `priority` | Lower numbers are recommended earlier. |
| `requires` | Other unlock-row IDs that must come first. |
| `skill_point_cost` | Ordinary Skill Points consumed; foreign class purchases use `2`. |
| `loadout_ids` | Optional list limiting the row to named loadouts. |

Set either `catalog_skill_id` or `scribed_skill_id`, not both.

Morph rows should require their base ability. ATTB also prevents two alternate morphs from both being marked final.

Temporary rows may omit `retire_when`, which leaves retirement entirely to the player. When a cutoff is authored, Character Tracker stops recommending the row after the condition is met. A player can still retire a temporary row early or explicitly keep it active for that character without changing synced ESO ownership data.

# 8. Scribed Skills

Use an ordinary Grimoire catalog ID when the guide only recommends the Grimoire in general. Use `scribed_skills` when the exact scripts matter.

```json
{
  "scribed_skills": [
    {
      "id": "magical_soul_breach",
      "name": "Magical Soul",
      "grimoire": "Wield Soul",
      "grimoire_catalog_skill_id": "scribing__wield_soul",
      "focus_script": "Magical Damage",
      "signature_script": "Damage Over Time",
      "affix_script": "Breach",
      "resource": "Magicka",
      "cost": "Defined by the Focus Script",
      "notes": ["Use the exact names shown in the current ESO Scribing interface."]
    }
  ],
  "unlock_order": [
    {
      "id": "magical_soul_breach_unlock",
      "name": "Magical Soul",
      "scribed_skill_id": "magical_soul_breach",
      "section": "Scribing",
      "line": "scribing",
      "required_rank": 0,
      "kind": "Scribing",
      "phase": "Final",
      "status": "final",
      "priority": 300,
      "notes": "Craft at the Scribing Altar.",
      "requires": []
    }
  ]
}
```

A recipe requires `id`, `name`, `grimoire`, `focus_script`, `signature_script`, and `affix_script`.

# 9. Progression phases, bars, and rotations

A phase is a complete recommendation for a level or CP band.

```json
{
  "phases": [
    {
      "id": "levels-15-29",
      "label": "Levels 15-29",
      "min_level": 15,
      "max_level": 29,
      "overview": "Introduce the second bar and begin training both weapon lines.",
      "conditions": [],
      "front_bar": {
        "id": "front",
        "label": "Front bar",
        "weapon": "Dual Daggers",
        "slots": [
          { "name": "Skill One", "catalog_skill_id": "line__skill_one", "temporary": true, "note": "Leveling slot." }
        ],
        "ultimate": {
          "name": "Class Ultimate",
          "catalog_skill_id": "class_line__class_ultimate",
          "temporary": true,
          "note": "Slot when the class line reaches rank 12."
        }
      },
      "back_bar": {
        "id": "back",
        "label": "Back bar",
        "weapon": "Inferno Staff",
        "slots": [],
        "ultimate": {
          "name": "Second Ultimate",
          "catalog_skill_id": "other_line__second_ultimate"
        }
      },
      "rotation": {
        "type": "priority",
        "title": "Leveling priority",
        "summary": "Maintain effects, then use the spammable.",
        "opener": [],
        "steps": [],
        "execute": [],
        "notes": []
      }
    }
  ]
}
```

Normal slots max at five. An ultimate is separate. Use `locked` on the entire back bar before Level 15.

A phase can also use `min_cp`, `max_cp`, `conditions`, and `loadout_ids`. Schema 4 additionally supports optional phase-specific planning fields:

- `attributes`: the Magicka, Health, and Stamina allocation target for that phase;
- `recommended_gear_stage_ids`: references to one or more entries in `gear_stages`;
- `milestones`: short goals such as unlocking weapon swap, joining a guild, completing a quest, or beginning a new skill line.

These fields are optional and backward-compatible. The current tracker can safely preserve them while the visual Build Editor turns them into guided progression controls.

### Skill references in bars

A bar or rotation skill reference can contain:

- `name`;
- `catalog_skill_id` or `scribed_skill_id`;
- `image`;
- `note`;
- `temporary`;
- `placeholder`;
- `locked`;
- `loadout_ids`.

# 10. Equipment stages

Equipment is grouped as stages so the user can progress from current-level drops to starter CP160 gear and a final setup.

```json
{
  "gear_stages": [
    {
      "id": "final",
      "name": "Final Flexible PvE Gear",
      "min_level": 50,
      "max_level": 9999,
      "summary": "Final general-purpose setup.",
      "roles": ["damage", "solo"],
      "content": ["dungeons", "arenas", "trials"],
      "sets": [
        {
          "id": "main_set",
          "name": "Example Set",
          "role": "Five-piece set",
          "bonus": "Why the set is used",
          "source": {
            "type": "Dungeon",
            "location": "Example Dungeon",
            "zone": "Example Zone",
            "access": "Base game or specified DLC",
            "requirement": "Any difficulty",
            "tradeable": false,
            "difficulty": "Normal",
            "notes": [],
            "alternative": "Example Alternative",
            "dlc": "Example DLC",
            "eso_plus": true
          },
          "pieces": [
            {
              "id": "main_set_head",
              "slot": "Head",
              "weight": "Medium",
              "trait": "Divines",
              "enchantment": "Max Stamina",
              "quality": "Legendary",
              "set_slots": 1,
              "note": "",
              "bar": "both",
              "perfected": false,
              "mythic": false,
              "alternatives": []
            }
          ],
          "alternatives": [],
          "loadout_ids": ["flexible-pve"]
        }
      ]
    }
  ]
}
```

Every set needs a source object and at least one piece. Every piece needs a unique ID and slot.

Useful piece fields include `weight`, `weapon_type`, `trait`, `enchantment`, `quality`, `set_slots`, `poison`, `bar`, `perfected`, `mythic`, `active_set_count`, `note`, and `alternatives`.

# 11. Consumables and quickslots

```json
{
  "consumables": {
    "foods": [
      { "name": "Example Food", "use": "Default food", "source": "Crafted or guild traders" }
    ],
    "potions": [
      { "name": "Essence of Spell Power", "use": "Use on cooldown when appropriate", "source": "Alchemy" }
    ],
    "poisons": [],
    "pvp_alternatives": [],
    "quickslots": []
  },
  "quickslots": [
    {
      "id": "combat_potion",
      "name": "Combat Potion",
      "type": "potion",
      "item": "Essence of Spell Power",
      "use": "Primary combat quickslot",
      "notes": []
    }
  ]
}
```

The root `quickslots` array describes the recommended wheel. `consumables.quickslots` remains available for build-specific display or compatibility.

# 12. Champion Point plans

Every build needs all three trees.

```json
{
  "cp_plans": {
    "warfare": {
      "label": "Warfare",
      "color": "blue",
      "minimum_points": 0,
      "core": [
        {
          "id": "precision",
          "name": "Precision",
          "max_points": 20,
          "slottable": false,
          "jump_points": [10, 20],
          "note": "Required connection.",
          "requires": [],
          "cluster": "damage",
          "position": { "x": 0, "y": 0 }
        },
        {
          "id": "piercing",
          "name": "Piercing",
          "max_points": 20,
          "slottable": false,
          "jump_points": [10, 20],
          "requires": ["precision"],
          "cluster": "damage",
          "position": { "x": 1, "y": 0 }
        }
      ],
      "flex": [
        {
          "id": "direct_damage",
          "label": "Direct damage",
          "purpose": "General damage",
          "optional": false,
          "note": "Fill after the required path.",
          "nodes": [
            {
              "id": "master_at_arms",
              "name": "Master-at-Arms",
              "max_points": 50,
              "slottable": true,
              "jump_points": [10, 20, 30, 40, 50],
              "requires": ["piercing"]
            }
          ]
        }
      ],
      "final_slots": ["master_at_arms"],
      "notes": []
    }
  }
}
```

The full object must also contain valid `craft` and `fitness` plans.

Validation rules:

- node IDs are unique inside a tree;
- `max_points` is a positive whole number;
- jump points are positive and do not exceed the node max;
- `requires` points to real nodes and cannot form cycles;
- flex groups have unique IDs, readable labels, and at least one node;
- final slots contain no more than four unique IDs;
- final-slot IDs exist and identify slottable nodes.

Allocation behavior:

1. core nodes fill in array order;
2. non-optional flex groups fill in array order;
3. optional groups remain visible but receive no automatic recommendation;
4. points beyond documented nodes are shown as unassigned/free;
5. `requires` is used for path validation and visual connections.

# 13. Companions and performance notes

ATTB 2.1 has a dedicated companion directory in the Character Tracker and a Companion page in the Build Editor. Schema 4 remains the public format; richer companion fields are additive inside the existing root `companions` array.

Use the bundled `resources/data/eso-companions.json` as the current roster/preset source. Companion ability names are plain text and **must not** be added to the player `relevant_lines` or `unlock_order`.

```json
{
  "companions": [
    {
      "id": "isobel_shield_saint",
      "companion_id": "isobel",
      "companion_name": "Isobel Veloise",
      "name": "Isobel - Shield Saint",
      "role": "tank",
      "summary": "Tank-oriented companion target.",
      "weapon": "One Hand and Shield",
      "armor_weight": "Heavy",
      "weapon_trait": "Bolstered",
      "armor_trait": "Bolstered",
      "jewelry_trait": "Quickened",
      "skills": [
        "Priority skill 1",
        "Priority skill 2",
        "Priority skill 3",
        "Priority skill 4",
        "Priority skill 5"
      ],
      "ultimate": "Companion ultimate",
      "equipment": ["Heavy companion gear using the recommended trait."],
      "notes": ["Companion skills execute by priority/cooldown, not as a player rotation."],
      "preset_id": "isobel_shield_saint",
      "source_url": "https://example.invalid/research-source"
    }
  ],
  "performance": {
    "stat_targets": {
      "health": "Use enough for the content and comfort level"
    },
    "target_dps": "No fixed parse target; this is a progression build.",
    "test_environment": "Solo and ordinary group PvE",
    "rotation_complexity": "moderate",
    "responsibilities": ["Maintain core buffs and damage-over-time effects."],
    "buffs": ["List important self or group buffs"],
    "debuffs": ["List important target debuffs"]
  }
}
```

The sample companion skill/trait/source text above is structural only. A real build should use the current ATTB preset data or researched current companion buildcraft. Normal companion bars contain no more than five normal abilities; `ultimate` is separate.

The Character Tracker can remember a selected preset target per character. That per-character choice is tracking data; it does not silently rewrite the portable build JSON.

# 14. Complete loadouts

A loadout is a named complete setup. It can override any build section except identity and the loadout list itself.

```json
{
  "default_loadout_id": "flexible-pve",
  "loadouts": [
    {
      "id": "flexible-pve",
      "name": "Flexible PvE",
      "summary": "General solo and group setup.",
      "roles": ["damage", "solo"],
      "content": ["overland", "dungeons", "arenas", "trials"],
      "available": true,
      "conditions": [],
      "overrides": {}
    },
    {
      "id": "one-bar",
      "name": "One-Bar Alternative",
      "summary": "Simplified setup using one final bar.",
      "roles": ["damage", "solo"],
      "content": ["overland", "dungeons"],
      "available": true,
      "conditions": ["Oakensoul or another one-bar plan"],
      "overrides": {
        "metadata": {
          "bar_count": 1,
          "playstyles": ["one-bar", "simplified"]
        },
        "phases": []
      }
    }
  ]
}
```

When `loadouts` is non-empty, `default_loadout_id` is required and must point to an available loadout.

ATTB validates every available loadout as a complete effective build. An override that clears required phases, breaks a skill ID, or produces incomplete gear is rejected during import.

# 15. Variants

Variants are smaller changes applied after the loadout.

```json
{
  "variants": [
    {
      "id": "flexible-pve",
      "name": "Flexible PvE (base)",
      "summary": "No changes.",
      "available": true,
      "loadout_ids": ["flexible-pve"],
      "overrides": {}
    },
    {
      "id": "defensive",
      "name": "Defensive Alternative",
      "summary": "Swaps one skill and food for harder solo content.",
      "available": true,
      "loadout_ids": ["flexible-pve"],
      "overrides": {
        "consumables": {
          "foods": [
            { "name": "Defensive Food", "use": "Hard solo content", "source": "Crafted" }
          ]
        }
      }
    }
  ]
}
```

An unavailable variant or loadout must include `unavailable_reason`.

# 16. Override merge rules

ATTB uses deterministic merges:

- omitted key: inherit;
- `null`: clear optional value;
- scalar/object field: replace or deep-merge;
- ordinary array: replace;
- array where every entry has a string `id`: merge by ID;
- `$remove: true`: remove a keyed row.

Example keyed merge:

```json
{
  "overrides": {
    "gear_stages": [
      {
        "id": "final",
        "sets": [
          { "id": "old_set", "$remove": true },
          { "id": "new_set", "name": "New Set", "source": {}, "pieces": [] }
        ]
      }
    ]
  }
}
```

The effective result must still validate. A partial new set with an empty source or no pieces will be rejected.

# 17. Images and remote safety

Local build images belong under the build resources folder and use image extensions such as PNG, JPG, WEBP, or GIF.

Remote images:

- must use HTTPS;
- remain disabled until the user enables trusted remote images;
- cannot target loopback, private, local, or reserved network addresses;
- are size-limited;
- must have a supported image MIME type matching the downloaded file bytes;
- are stored in a local cache;
- are treated as optional decoration, never required build data.

Do not place SVG, HTML, scripts, authentication tokens, personal paths, or private URLs in build image fields.

# 18. Sources and attribution

```json
{
  "sources": [
    {
      "title": "Official patch notes",
      "url": "https://forums.elderscrollsonline.com/",
      "author": "ZeniMax Online Studios",
      "accessed": "2026-08-06",
      "notes": "Used to verify current system behavior."
    }
  ]
}
```

Document where unusual mechanics, equipment, and access requirements came from. Do not copy copyrighted guides verbatim.

# 19. Extensions

Use `extensions` for data ATTB does not yet understand:

```json
{
  "extensions": {
    "deadxxsmile.example": {
      "future_feature": {
        "enabled": true
      }
    }
  }
}
```

Use a namespace you control. ATTB preserves extension data when importing and exporting.

# 20. Validation and error recovery

ATTB validates:

- schema version and root structure;
- ID shape and duplicates;
- class-line and Class Mastery rules;
- foreign class Skill Point costs;
- Scribing recipes;
- catalog skill IDs and line IDs;
- prerequisites and cycles;
- morph conflicts and passive rank counts;
- phase ranges, bars, ultimates, and rotations;
- gear source and piece completeness;
- CP limits, connections, cycles, and final slots;
- loadout and variant references;
- every available effective loadout and variant;
- image safety.

Validation is atomic. An invalid import does not partially replace a working build.

# 21. Public compatibility guidance

After publishing a build:

- keep its build ID;
- keep existing row IDs whenever the same concept remains;
- add optional fields rather than deleting saved concepts;
- use loadouts or variants for alternatives;
- update `game_version` and `verified_date` after testing;
- keep sources and requirements honest;
- test fresh character creation and an imported character backup;
- test early, middle, and final phases;
- test low and high Champion Point totals;
- export the final build from ATTB and re-import it before release.

The visual Build Editor will generate Schema 4. Manual JSON and generated JSON will use the same validator and remain interchangeable.
