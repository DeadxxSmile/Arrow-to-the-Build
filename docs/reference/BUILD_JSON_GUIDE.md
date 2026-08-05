# Creating an ATTB build JSON

This guide explains how to author a build for **Arrow to the Build (ATTB)** using **build schema 3**.
Bundled builds and builds imported by a user use the same JSON format. The visual Build Creator is
planned for a later release; until then, JSON is the complete authoring format.

Start with these files:

- [`BUILD_TEMPLATE.json`](BUILD_TEMPLATE.json), a valid, importable starter build
- [`BUILD_SCHEMA.json`](BUILD_SCHEMA.json), the machine-readable schema
- [`../../resources/data/eso-skill-catalog.json`](../../resources/data/eso-skill-catalog.json), valid skill-line and skill IDs
- [`../../resources/builds/`](../../resources/builds/), the seven complete bundled examples

The starter template uses real **Arcanist** catalog IDs so it can be imported as-is. When creating a
build for another class, replace its `relevant_lines`, `unlock_order` catalog IDs, and phase skill
references with entries from the bundled catalog.

---

## 1. Recommended authoring workflow

1. Copy `BUILD_TEMPLATE.json` and give the copy a meaningful filename.
2. Change the top-level metadata: `id`, `name`, `short_name`, `summary`, `author`, game version, and date.
3. Set the recommended profile under `defaults`.
4. Select real skill-line IDs from `eso-skill-catalog.json` and add them to `relevant_lines`.
5. Build an ordered `unlock_order` using real `catalog_skill_id` values.
6. Define level/progression `phases`, including both hotbars and a rotation.
7. Define piece-by-piece `gear_stages`.
8. Add Champion Point paths, consumables, tips, and variants.
9. Open ATTB and use **Help & Tools → Import / Export → Validate Build JSON**.
10. Correct every reported validation error before sharing or bundling the file.

For a bundled build, place the finished JSON in `resources/builds/` and document research sources in
`BUNDLED_BUILD_SOURCES.md`. Imported community builds can live anywhere on the user's computer.

---

## 2. JSON rules

ATTB build files are ordinary UTF-8 JSON.

- JSON does **not** support comments.
- Property names and string values require double quotes.
- Do not leave a trailing comma after the final item in an object or array.
- The importer rejects files larger than 8 MB.
- Schema 3 is the only public build format accepted by the current importer.
- Schema 1 and 2 were pre-release formats and are intentionally unsupported.

### Stable slug IDs

Build, line, phase, gear, set, piece, variant, CP group, CP node, and unlock row IDs use this pattern:

```text
^[a-z0-9][a-z0-9_.-]*$
```

Good IDs:

```text
stamina_arcanist_solo_duo
15-30
cp160_starter
orders-wrath
starter_ring_1
```

Bad IDs:

```text
My Build
/skills/example
https://example.com
```

Once a build has been shared, do not casually change IDs. Saved characters track unlocks, equipment,
and variants by those stable IDs.

---

## 3. Top-level object

A practical build normally contains the following sections:

```json
{
  "schema_version": 3,
  "id": "unique-build-id",
  "name": "Readable Build Name",
  "short_name": "Short Name",
  "summary": "What the build is and who it is for.",
  "author": "Author or community handle",
  "game_version": "Update 50",
  "verified_date": "2026-08-05",
  "format_notes": [],
  "theme": {},
  "images": {},
  "defaults": {},
  "setup_help": {},
  "concepts": [],
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

### Required by validation

| Field | Type | Purpose |
|---|---|---|
| `schema_version` | number | Must be exactly `3`. |
| `id` | slug string | Stable build identifier. |
| `name` | string | Full display name. |
| `defaults` | object | Must include `class`; normally includes attributes and setup defaults. |
| `relevant_lines` | array | Skill lines used or tracked by the build. |
| `cp_plans` | object | Champion Point plans. It may be empty while drafting. |
| `unlock_order` | array | Ordered recommended purchases with catalog IDs. |
| `phases` | array | At least one progression band with both hotbars and a rotation. Drives the Skill Bars and Rotations page. |
| `gear_stages` | array | Gear progression. Every stage must contain at least one set with pieces. |

### Strongly recommended metadata

| Field | Purpose |
|---|---|
| `short_name` | Compact name used in character summaries. |
| `summary` | One- or two-sentence identity of the build. |
| `author` | Attribution for the build author or source community. |
| `game_version` | ESO update for which the build was checked. |
| `verified_date` | ISO date (`YYYY-MM-DD`) of the last review. |
| `format_notes` | Authoring or maintenance notes. The app does not treat these as progression steps. |
| `theme` | Optional accent colors for the build presentation. |
| `images.hero` | Optional hero artwork reference. |

---

## 4. Recommended character defaults

`defaults` describes the **build recommendation**, not the player's immutable profile. When a character
is created, ATTB stores the race and alliance the player actually chose separately.

```json
"defaults": {
  "class": "Arcanist",
  "race": "Dark Elf",
  "alliance": "Ebonheart Pact",
  "eso_plus": false,
  "attributes": {
    "magicka": 0,
    "health": 0,
    "stamina": 64
  },
  "mundus": "The Thief",
  "front_weapon": "Dual Daggers",
  "back_weapon": "Inferno Staff at Level 15",
  "leveling_armor": "5 Medium / 1 Light / 1 Heavy",
  "endgame_armor": "6 Medium / 1 Light",
  "leveling_trait": "Training",
  "gear_cap": "Level 50 / CP160"
}
```

Rules for `attributes`:

- Allowed keys are `magicka`, `health`, and `stamina`.
- Values must be whole numbers of zero or more.
- The total cannot exceed 64.
- ATTB does not automatically rewrite a character's recorded split when the level or variant changes.

`eso_plus` is a recommendation/access hint. The user's actual ESO Plus setting is account-wide in ATTB.

---

## 5. Setup help and build concepts

`setup_help` powers the information buttons on Basic Setup. Each key corresponds to a setup card.
The renderer accepts normal descriptive fields; the bundled builds commonly use `summary`,
`recommended`, `alternatives`, `locations`, and `notes`.

```json
"setup_help": {
  "race": {
    "summary": "Why the recommended race fits.",
    "recommended": "Dark Elf",
    "alternatives": ["Khajiit", "Orc"],
    "notes": ["Race is an optimization, not a requirement."]
  },
  "mundus": {
    "summary": "Why the build uses this Mundus.",
    "locations": ["Malabal Tor", "Alik'r Desert", "Eastmarch", "Cyrodiil"]
  }
}
```

Useful setup-help keys are:

```text
class
race
alliance
mundus
front_weapon
back_weapon
leveling_armor
endgame_armor
leveling_trait
gear_cap
```

`concepts` provides short explanatory cards for the build's core ideas:

```json
"concepts": [
  {
    "title": "Crux loop",
    "text": "Generate three Crux, then spend them on Fatecarver."
  }
]
```

---

## 6. Skill lines and the bundled catalog

ATTB does not accept arbitrary skill-line names for build logic. Every `relevant_lines[].id` must match
a line in `resources/data/eso-skill-catalog.json`.

```json
"relevant_lines": [
  {
    "id": "herald",
    "name": "Herald of the Tome",
    "max": 50,
    "group": "Class"
  },
  {
    "id": "dual_wield",
    "name": "Dual Wield",
    "max": 50,
    "group": "Weapon"
  }
]
```

The line `name`, `max`, and `group` are presentation fields. The stable catalog `id` controls matching.
Typical groups include Class, Weapon, Armor, World, Guild, Alliance War, Racial, Craft, and System.

To find IDs:

1. Open `resources/data/eso-skill-catalog.json`.
2. Find the line by its display name.
3. Copy its `id` into `relevant_lines`.
4. Copy skill `id` values into `catalog_skill_id` fields.

The catalog also records base-to-morph relationships, maximum passive ranks, unlock ranks, and whether
an entry is an Ultimate, Active, Morph, Passive, Scribing skill, Class Mastery, or tracking-only entry.

---

## 7. Ordered skill and passive recommendations

`unlock_order` is the build's recommendation queue. Each row needs a unique build-row `id` and a real
`catalog_skill_id`.

```json
{
  "id": "pragmatic_fatecarver",
  "name": "Pragmatic Fatecarver",
  "catalog_skill_id": "herald__pragmatic_fatecarver",
  "section": "Morph",
  "line": "herald",
  "required_rank": 4,
  "kind": "Morph",
  "phase": "Early",
  "status": "final",
  "priority": 41,
  "notes": "Take the defensive Fatecarver morph.",
  "morph_from": "Fatecarver",
  "image": null,
  "requires": ["fatecarver"]
}
```

### Important fields

| Field | Meaning |
|---|---|
| `id` | Stable ID for this recommendation row. |
| `name` | Display label. It may contain rank suffixes such as `Fated Fortune II`. |
| `catalog_skill_id` | Stable skill ID from the catalog. Required in schema 3. |
| `line` | Catalog line ID. It must also appear in `relevant_lines`. |
| `required_rank` | Whole line rank of zero or more. |
| `kind` | Usually `Ultimate`, `Active`, `Morph`, or `Passive`; it must agree with the catalog type. |
| `status` | `final`, `temporary`, or `optional`. |
| `priority` | Lower numbers are recommended earlier. Missing priorities are tolerated but explicit values are clearer. |
| `phase` | Human-readable author label such as Leveling, Early, Mid, Late, or Final. |
| `requires` | Array of other **unlock row IDs**, not catalog IDs. |
| `notes` | Guidance shown with the recommendation. |
| `image` | Optional image reference. Catalog-linked skills can use ATTB's local icon cache without this field. |

### Base skill and morph requirements

A morph row should require the base-skill row:

```json
[
  {
    "id": "fatecarver",
    "catalog_skill_id": "herald__fatecarver",
    "name": "Fatecarver",
    "line": "herald",
    "kind": "Active",
    "status": "final",
    "required_rank": 4,
    "requires": []
  },
  {
    "id": "pragmatic_fatecarver",
    "catalog_skill_id": "herald__pragmatic_fatecarver",
    "name": "Pragmatic Fatecarver",
    "line": "herald",
    "kind": "Morph",
    "status": "final",
    "required_rank": 4,
    "requires": ["fatecarver"]
  }
]
```

ATTB validates that a morph's required row really maps to its catalog base ability. Two alternate morphs
of the same base ability cannot both be marked `final`.

### Passive ranks

Repeat a passive's catalog ID once per purchasable rank, using unique row IDs and display labels:

```json
[
  {
    "id": "fated_fortune_1",
    "name": "Fated Fortune I",
    "catalog_skill_id": "herald__fated_fortune",
    "line": "herald",
    "kind": "Passive",
    "status": "final",
    "required_rank": 8
  },
  {
    "id": "fated_fortune_2",
    "name": "Fated Fortune II",
    "catalog_skill_id": "herald__fated_fortune",
    "line": "herald",
    "kind": "Passive",
    "status": "final",
    "required_rank": 18
  }
]
```

ATTB derives the earlier passive-rank requirement and rejects more ranks than the catalog allows.

### Dependency rules

- Every `requires` ID must exist in the same build.
- Circular requirement chains are rejected.
- A recommendation's `line` must be declared in `relevant_lines`.
- Display text may change without breaking progress as long as the stable IDs remain unchanged.

---

## 8. Progression phases, hotbars, and rotations

Each phase describes a level/progression band. Character levels use 1 through 50; `max_level` may extend
to 9999 so the final phase can represent Champion Point progression.

```json
{
  "id": "15-plus",
  "label": "Level 15+",
  "min_level": 15,
  "max_level": 9999,
  "overview": "Add the second bar and establish the final loop.",
  "front_bar": {},
  "back_bar": {},
  "rotation": {}
}
```

Rules:

- Phase IDs must be unique slugs.
- `min_level` must be a whole number from 1 to 50.
- `max_level` must be a whole number from `min_level` through 9999.
- Every phase needs `front_bar`, `back_bar`, and `rotation` objects.

### Hotbars

A bar contains no more than five ordinary slots and one optional ultimate.

```json
"front_bar": {
  "weapon": "Dual Daggers",
  "slots": [
    {
      "name": "Runeblades",
      "catalog_skill_id": "herald__runeblades",
      "temporary": true,
      "note": "Replace later."
    }
  ],
  "ultimate": {
    "name": "The Languid Eye",
    "catalog_skill_id": "herald__the_languid_eye"
  }
}
```

Supported skill-reference fields include:

| Field | Meaning |
|---|---|
| `name` | Required display name. |
| `catalog_skill_id` | Optional but strongly recommended. It supplies validation and the local catalog icon. |
| `image` | Optional explicit build image or remote HTTPS image. |
| `note` | Additional slot guidance. |
| `temporary` | Displays the temporary badge. |
| `locked` | Displays why a slot or bar is unavailable. |

Before character level 15, the back bar can be empty and carry a lock message:

```json
"back_bar": {
  "weapon": "Inferno Staff at Level 15",
  "locked": "Unlocks at character level 15",
  "slots": [],
  "ultimate": null
}
```

### Rotations

`rotation.type` must be `sequence` or `priority`.

Use `sequence` when a repeatable order is genuinely useful. Use `priority` when different durations,
resources, procs, or encounter conditions make a rigid loop misleading.

```json
"rotation": {
  "type": "priority",
  "title": "Main priority",
  "summary": "Keep long effects active, then spend the build resource.",
  "opener": [
    { "name": "Apply long-duration effects" }
  ],
  "steps": [
    {
      "name": "Build three Crux",
      "catalog_skill_id": "herald__runeblades"
    },
    {
      "name": "Pragmatic Fatecarver",
      "catalog_skill_id": "herald__pragmatic_fatecarver"
    }
  ],
  "execute": [
    { "name": "Replace the normal spammable with the execute below its threshold" }
  ],
  "notes": [
    "Explain light-attack weaving, bar swapping, sustain, or common mistakes here."
  ]
}
```

`steps` is required. `opener`, `execute`, and `notes` are optional arrays.

---

## 9. Gear stages, sets, sources, and pieces

`gear_stages` defines the leveling-to-final roadmap. Each stage must contain at least one set object,
and every set must contain a non-empty piece array.

```json
{
  "id": "cp160-starter",
  "name": "CP160 crafted starter",
  "min_level": 50,
  "max_level": 9999,
  "summary": "Accessible permanent starter gear.",
  "sets": []
}
```

### Set object

```json
{
  "id": "orders_wrath",
  "name": "Order's Wrath",
  "role": "Primary five-piece set",
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
  "pieces": []
}
```

Validation requires `source.type` and `source.location`. The remaining source fields are optional but
make the Equipment page substantially more useful.

### Piece object

```json
{
  "id": "starter_orders_shoulders",
  "slot": "Shoulders",
  "weight": "Medium",
  "trait": "Divines",
  "enchantment": "Max Stamina",
  "quality": "Purple"
}
```

Weapon example:

```json
{
  "id": "starter_front_weapon_1",
  "slot": "Front Weapon 1",
  "weapon_type": "Dagger",
  "trait": "Charged",
  "enchantment": "Poison Damage",
  "quality": "Gold"
}
```

Common slot labels:

```text
Head
Shoulders
Chest
Hands
Waist
Legs
Feet
Necklace
Ring 1
Ring 2
Front Weapon
Front Weapon 1
Front Weapon 2
Back Weapon
Back Weapon 1
Back Weapon 2
```

Use separate piece IDs for both dual-wield weapons and both rings. Progress is stored by piece ID, not
array position.

---

## 10. Champion Point plans

`cp_plans` is an object keyed by constellation name, normally `warfare`, `fitness`, and `craft`.
ATTB caps each constellation at 1,200 points.

```json
"cp_plans": {
  "warfare": {
    "label": "Warfare",
    "color": "blue",
    "core": [],
    "flex": [],
    "final_slots": []
  }
}
```

### Core path

Core nodes are allocated first and in array order.

```json
"core": [
  {
    "id": "precision",
    "name": "Precision",
    "max_points": 20,
    "slottable": false,
    "jump_points": [10, 20],
    "note": "Required path or passive node."
  }
]
```

### Flex groups

After the core path, points flow through non-optional flex groups in order. Optional groups are shown as
alternatives but are not silently allocated.

```json
"flex": [
  {
    "id": "damage",
    "label": "Damage",
    "purpose": "damage",
    "nodes": [
      {
        "id": "master_at_arms",
        "name": "Master-at-Arms",
        "max_points": 50,
        "slottable": true,
        "jump_points": [25, 50]
      }
    ]
  },
  {
    "id": "alternate_damage",
    "label": "Alternate damage",
    "purpose": "alternate damage",
    "optional": true,
    "nodes": [
      {
        "id": "thaumaturge",
        "name": "Thaumaturge",
        "max_points": 50,
        "slottable": true,
        "jump_points": [25, 50]
      }
    ]
  }
]
```

Every flex group must contain at least one node.

### Node rules

- Node IDs must be unique within the constellation.
- `max_points` must be a positive whole number no greater than 1,200.
- `jump_points` must be positive thresholds no greater than the node's own maximum.
- `slottable`, when present, must be `true` or `false`.
- The total core path cannot exceed 1,200 points.
- Every `final_slots` ID must exist in the same plan and must not point to a node explicitly marked non-slottable.

---

## 11. Consumables and tips

`consumables` is an optional object. The current UI understands foods, potions, and PvP alternatives.
Each entry is ordinary display data.

```json
"consumables": {
  "foods": [
    {
      "name": "Dubious Camoran Throne",
      "use": "Budget Stamina sustain",
      "source": "Provisioning / guild traders"
    }
  ],
  "potions": [
    {
      "name": "Tri-stat potion",
      "use": "General solo emergency potion"
    }
  ],
  "pvp_alternatives": []
}
```

`tips` is an array of practical build-specific strings:

```json
"tips": [
  "Join Fighters Guild, Mages Guild, and Undaunted early.",
  "Call out any taunt or group-dangerous skill explicitly.",
  "Document mythics that block ally healing."
]
```

Prefer actionable warnings over generic advice.

---

## 12. Build variants

Variants apply object overrides to the base build. The first available variant becomes the default.

```json
"variants": [
  {
    "id": "solo-duo",
    "name": "Solo / Duo PvE",
    "summary": "The base build exactly as written.",
    "available": true,
    "overrides": null
  }
]
```

### Override behavior

- `undefined`/omitted property: keep the base value.
- `null`: explicitly clear an optional section.
- Ordinary objects: merge recursively.
- Ordinary arrays: replace the base array.
- Arrays where every entry is an object with an `id`: merge by ID.
- `{"id":"entry", "$remove":true}` removes that identified array entry.
- A new identified object is appended.
- Variants cannot override the build `id` or the `variants` array itself.

Example small override:

```json
{
  "id": "cyrodiil",
  "name": "Cyrodiil Alternative",
  "available": true,
  "summary": "PvP consumables and reminders.",
  "overrides": {
    "summary": "The same core build adapted for Cyrodiil.",
    "tips": [
      "Carry immovability and detection potions.",
      "Replace a pure PvE damage-over-time slot with a defensive skill."
    ]
  }
}
```

Unavailable placeholder:

```json
{
  "id": "future-group-dps",
  "name": "Future Group DPS",
  "available": false,
  "unavailable_reason": "The complete bars, gear, CP, and consumables are not authored yet.",
  "overrides": null
}
```

An unavailable variant must include `unavailable_reason`.

ATTB validates the effective merged build for every available non-empty override, so a bad skill,
invalid CP path, or malformed gear stage inside a variant is rejected before a character can select it.

---

## 13. Images and skill icons

### Catalog skill icons

When a hotbar, rotation step, recommendation, or line entry has a known `catalog_skill_id`, ATTB can use
the local skill-icon cache created by:

```powershell
npm run fetch:icons
```

This is the preferred approach. Omit `image` unless the build needs different artwork.

### Bundled build images

Bundled JSON may reference images under `resources/builds/`, normally with a path such as:

```json
"image": "assets/arcanist-pragmatic-fatecarver-icon.webp"
```

Paths cannot escape the bundled builds directory, and only PNG, JPG/JPEG, WebP, and GIF files are accepted.

### Imported build images

Imported builds can use:

- Known catalog skill IDs and the local icon cache
- `data:image/...` URLs
- Remote **HTTPS** image URLs when the user enables trusted remote images

Remote downloads are disabled by default, limited to real image formats and 5 MB, blocked for local or
private network addresses, and cached under the ATTB user-data directory.

A relative local path in a separately imported JSON is not automatically resolved beside that JSON file.

Only include artwork that you have permission to redistribute. Third-party game assets are not covered
by ATTB's GPL license.

---

## 14. Validate, import, reload, and export

Inside ATTB:

1. Open **Help & Tools**.
2. Select **Import / Export**.
3. Validate the JSON data before importing.
4. Import the file as a new build.
5. Create a test character and visit every page.
6. Use **Reload Current Build from JSON** while iterating, keeping the same build `id`.
7. Export the stored base or effective variant JSON to confirm the final result.

Common validation failures include:

- Wrong `schema_version`
- Missing or unsafe IDs
- Duplicate line, unlock, phase, stage, set, piece, variant, CP group, or CP node IDs
- Skill line not present in the bundled catalog
- Missing or wrong-line `catalog_skill_id`
- Morph row that does not require its real base ability
- Too many passive ranks
- Missing dependency or circular `requires` chain
- More than five hotbar slots
- Unknown hotbar/rotation catalog skill
- Missing gear `source.type`, `source.location`, piece ID, or slot
- CP node with invalid points or `final_slots` pointing at a missing/non-slottable node
- Available variant whose effective build is invalid

The error list is designed to name the broken section and ID whenever possible.

---

## 15. Bundling a build with ATTB

To ship a build with the application:

1. Place the JSON file in `resources/builds/`.
2. Place permitted build-specific images in `resources/builds/assets/`.
3. Add research and attribution notes to `BUNDLED_BUILD_SOURCES.md`.
4. Run the skill-icon fetcher if the build introduces catalog skills not already cached.
5. Run the complete test suite:

```powershell
npm test
```

6. Build the production renderer:

```powershell
npm run build:renderer
```

The packaging tests verify that every bundled JSON and referenced local image is present in the installer.

---

## 16. Final author checklist

Before sharing a build, confirm:

- [ ] `schema_version` is 3.
- [ ] Every stable ID is a slug and unique in its section.
- [ ] The build has the correct class, game version, verification date, and author attribution.
- [ ] Attributes total no more than 64.
- [ ] Every relevant skill line exists in the bundled catalog.
- [ ] Every unlock row has the correct `catalog_skill_id`, line, type, rank, status, and priority.
- [ ] Morph rows require their real base ability.
- [ ] Passive rank counts do not exceed the catalog maximum.
- [ ] Progression phases cover the intended leveling/endgame range without misleading bar slots.
- [ ] Every phase contains front bar, back bar, and rotation data.
- [ ] Gear stages track armor, jewelry, and weapons as individual pieces.
- [ ] Gear source/access information is specific enough to act on.
- [ ] CP core paths and final slots are reachable and correctly marked slottable.
- [ ] Variants contain complete, validated overrides rather than names alone.
- [ ] Tips call out taunts, mythic restrictions, DLC access, and other common traps.
- [ ] Images are permitted, safe, and optional rather than required for the build to function.
- [ ] The file validates and has been opened on every ATTB page with a fresh test character.

For complete working examples, compare the Mighty Seven files under `resources/builds/`.
