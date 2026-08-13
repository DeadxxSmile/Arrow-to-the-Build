# ATTB AI Build JSON Authoring Guide

**Purpose:** Give this file to **any capable AI assistant - including one that has never seen ATTB before** - whenever you want a complete *The Elder Scrolls Online* build created as importable JSON for **Arrow to the Build (ATTB)**.

**Audience:** AI assistants and humans authoring ATTB builds. No prior ATTB knowledge should be assumed.

**Guide revision:** 2.1 - updated for ATTB 2.1 companion authoring, preset data, and stricter actionable-progression guidance.

**Current baseline when this guide was revised:** ATTB 2.1.8, public Build Schema 4. Player-skill IDs still follow the game version named by the current bundled `eso-skill-catalog.json`; companion presets use the separately maintained current companion catalog.

**Document goal:** By the time an unfamiliar AI finishes the **START HERE** section, it should understand what ATTB is, how a build file relates to a character, what Schema 4 is trying to represent, which questions it must ask, where exact IDs come from, how sections cross-reference each other, and what must be validated before a JSON file is delivered.

> **Important:** This guide is an authoring workflow, not a frozen copy of the schema. Before generating a build, verify the current ATTB repository/template/catalog. If the app schema or catalog has changed, the current canonical ATTB source wins over anything hard-coded in this guide.

---


# START HERE - ATTB primer for an AI that has never used it

If you already know ATTB, still read this section once. It defines the mental model expected by the rest of this guide.

## What Arrow to the Build is

**Arrow to the Build (ATTB)** is an offline-first Windows companion application for *The Elder Scrolls Online*. It turns a traditional build guide into structured, machine-readable progression data.

ATTB has two important concepts:

1. **Character Tracker**
   - Represents a real ESO character and the character's observed/current state.
   - Can contain character level, attributes, Champion Points, skill-line ranks, purchased skills/morphs/passives, action bars, equipped gear, and other tracked progress.
   - Character data may be entered manually, imported from backup JSON, or synchronized from the optional ATTB ESO addon.

2. **Build Editor / Build Definition**
   - Represents the **TARGET** plan the player wants to follow.
   - The build says what should eventually be unlocked, what to use at different levels, which gear stages to chase, how CP should be allocated, which bars/rotation to use, and what alternatives are acceptable.
   - Build definitions are ordinary human-readable JSON files.

### The most important distinction

**CURRENT character state is not the same thing as TARGET build state.**

A character may currently own the wrong morph, have old gear, be missing passives, have too few skill points, or be only Level 22. The build JSON describes the intended plan, while ATTB compares that plan to the current character.

Do not "correct" a target build merely because an attached character backup does not own the target yet.

---

## What an ATTB build file is

An ATTB build JSON is not just a list of endgame skills.

A complete build can describe:

- identity and metadata;
- class configuration;
- race/resource/attributes/Mundus recommendations;
- relevant skill lines;
- **ordered skill, morph, passive, and ultimate purchases**;
- progression phases with action bars;
- rotations or priority systems;
- gear progression from leveling to final;
- all three Champion Point trees;
- requirements and access limitations;
- consumables;
- Scribing recipes;
- loadouts and variants;
- structured companion setup recommendations, including ATTB 2.1 companion preset identities;
- performance/responsibility notes;
- human-readable build notes.

For ATTB 2.1, new builds still use the stable **Schema 4** public build format.

Think of Schema 4 as a structured build guide plus a dependency graph. Many fields reference IDs defined elsewhere in the same build or in ATTB's bundled ESO skill catalog. A file can therefore be valid JSON and still be a bad or warning-filled ATTB build if those references do not line up.

---

## What ATTB is NOT asking you to do

Do not treat an ATTB build as:

- a raw export of every skill in ESO;
- a list of every passive the character could ever buy;
- a one-page endgame parse setup with no progression;
- an exact copy of the character's current state;
- free-form prose disguised as JSON;
- a place to invent skill IDs;
- a generic MMO talent tree with no ESO-specific acquisition rules;
- a license to use every new ESO system merely because the schema supports it.

The purpose is to create a **usable progression plan for a specific player goal**.

---

# ATTB mental model in one diagram

```text
ESO / current character
        │
        │ observed CURRENT state
        ▼
┌─────────────────────┐
│  Character Tracker  │
└─────────────────────┘
        │
        │ compares against
        ▼
┌─────────────────────┐
│   TARGET Build JSON │
│     Schema 4        │
└─────────────────────┘
        │
        ├── defaults / setup
        ├── relevant_lines
        ├── unlock_order
        ├── phases + bars + rotations
        ├── gear_stages
        ├── cp_plans
        ├── companion / consumables / notes
        └── loadouts / variants
```

ATTB uses the TARGET build to answer questions such as:

- What should I unlock next?
- Which skill-line rank matters next?
- Which morph am I aiming for?
- Which passives are worth the Skill Points for this build?
- What should my bars look like at my current level?
- What gear stage should I be working toward?
- How should I spend the CP I currently have?
- What is different between my actual character and the target?

That is why incomplete cross-references are harmful: they break the progression logic even if the JSON itself parses.

---

# Essential glossary

| Term | Meaning |
|---|---|
| **Schema 4** | Current public ATTB build-file contract for the baseline covered by this guide. |
| **Build `id`** | Permanent identifier for the build itself. Stable across normal revisions. |
| **Display `name`** | Human-readable build name. Can change without changing identity. |
| **Catalog** | ATTB's canonical player-skill list: ESO skill lines, skills, morphs, passives, ultimates, and stable IDs. ATTB 2.1 also ships a separate companion preset catalog. |
| **`catalog_skill_id`** | Stable ATTB ID for an ordinary ESO player skill/passive/ultimate/Grimoire. Never guess it. |
| **Unlock row ID** | `unlock_order[].id`, a build-local persistent row ID. This is what `requires[]` references. |
| **Relevant line** | A skill line that this build tracks and uses. |
| **Unlock Plan / `unlock_order`** | Ordered purchases and prerequisites for skills, morphs, passives, ultimates, etc. |
| **Phase** | A level/CP band describing usable bars, rotation, milestones, and optionally attributes/gear. |
| **Gear stage** | A progression step such as Leveling, CP160 Starter, Intermediate, Final. |
| **CURRENT** | What the actual character owns/uses now. |
| **TARGET** | What the build recommends. |
| **Loadout** | A substantially different complete setup inside one build. |
| **Variant** | A smaller situational change applied to a loadout/base build. |
| **Reference Closure** | The requirement that every cross-reference points to something that actually exists. |
| **Error** | ATTB validation problem that blocks saving/importing as a complete build. |
| **Warning** | Non-blocking issue that usually indicates something the author should deliberately fix/review. |
| **Suggestion** | Optional authoring improvement; may be intentionally left unresolved. |

---

# Bootstrap procedure for an AI with zero ATTB context

Before writing build JSON, do these steps in order.

## Step 1 - Read this guide completely

Do not begin generating JSON after reading only the intake questions.

## Step 2 - Acquire the current ATTB contract

If tools or repository access are available, inspect the current canonical ATTB source before authoring.

At minimum, retrieve:

```text
docs/reference/BUILD_FORMAT.md
docs/reference/BUILD_JSON_GUIDE.md
docs/reference/BUILD_VALIDATION_GUIDE.md
docs/reference/BUILD_TEMPLATE.json
resources/data/eso-skill-catalog.json
resources/data/eso-companions.json
```

When possible also inspect:

```text
docs/reference/BUILD_SCHEMA.json
docs/reference/BUILD_QUICK_START.md
docs/reference/SKILL_CATALOG.md
resources/builds/   (complete working examples)
```

## Step 3 - If repository access is NOT available

Do **not** make up a schema from this guide alone if a current file can be requested.

Ask the user for one or more of:

- current `BUILD_TEMPLATE.json`;
- current `BUILD_SCHEMA.json`;
- current `eso-skill-catalog.json`;
- current `eso-companions.json` when companion authoring is requested;
- a known-good recent ATTB build JSON;
- the current ATTB source ZIP.

If the user cannot provide those, explain that you can draft the build concept and structure, but exact import compatibility and catalog IDs cannot be guaranteed without current ATTB source data.

**Never replace missing catalog access with guessed IDs.**

## Step 4 - Inspect user-provided files before asking questions

If the request includes:

- an existing build;
- character backup;
- synced character JSON;
- screenshots;
- an older build to refresh;

read them first and infer what is already known.

## Step 5 - Run one intake round

Ask only unanswered questions. Use the intake section later in this document.

## Step 6 - Research current ESO buildcraft

Separate **game/build research** from **ATTB schema research**.

- ESO sources determine *what build is good*.
- ATTB source/catalog determines *how to encode it*.

## Step 7 - Design the build in plain language first

Before generating 500+ lines of JSON, decide:

- role/content;
- resource;
- race recommendation;
- weapons/bars;
- core skills;
- important passives;
- rotation model;
- gear progression;
- CP priorities;
- companion;
- special systems;
- accessibility/complexity.

## Step 8 - Encode it into Schema 4

Use the exact current field shapes and exact catalog IDs.

## Step 9 - Validate structurally and semantically

JSON parsing alone is insufficient. Use the validation workflow in this guide.

## Step 10 - Deliver only after the preflight passes

The target is zero errors, zero dangling references, and zero avoidable warnings.

---

# How to behave while interviewing the user

The AI should be helpful, not bureaucratic.

### Do

- collect missing decisions in one compact message;
- infer obvious answers from attachments;
- explain a tradeoff when a choice matters;
- accept "choose for me" and make a sensible decision;
- preserve the user's existing character race/class unless they want a redesign;
- distinguish required information from optional optimization preferences.

### Do not

- ask 16 questions one at a time;
- re-ask facts the user already supplied;
- force the user to understand ATTB internals;
- ask the user for catalog IDs;
- make the user choose between technical schema fields;
- invent answers merely to avoid one reasonable intake message.

### Good intake behavior

If the user says:

> "Make me a solo Stamina Arcanist with Isobel tank. I have ESO Plus and don't mind dungeons, but no trials."

then **do not** ask again for:

- class;
- resource;
- companion;
- companion role;
- ESO Plus;
- whether trials are okay.

Ask only remaining material decisions, for example race preference, one/two bars, rotation complexity, progression scope, and whether Scribing/mythics are okay.

---

# Safe defaults when the user truly does not care

These are **decision-making defaults**, not schema defaults. Current ESO research still wins.

| Question | Safe default |
|---|---|
| Pure class or subclassing? | Pure class. |
| One bar or two? | Two bars for a normal general-purpose build; one bar only when requested or clearly appropriate. |
| Rotation complexity? | Moderate and forgiving. |
| Progression scope? | Full practical progression when the request is for a new/returning character; CP160+ when clearly endgame-only. |
| Race? | Recommend an optimized race but preserve an existing character's actual race unless race change is explicitly on the table. |
| Gear access? | Favor realistic, accessible stages before final gear. Do not assume trial access. |
| Scribing? | Treat as optional unless requested or central to the current build; provide an alternative if practical. |
| Mythics? | Do not assume ownership. Treat as later/final unless user says otherwise. |
| Companion? | No companion section unless requested, relevant to solo play, or user asks for a recommendation. |
| Passives? | Include materially useful combat passives; exclude irrelevant ones; situational passives optional. |
| Skill Points? | Leave practical room for crafting/utility unless user wants completionist spending. |

These defaults exist so the AI can proceed when the user says "pick for me" without turning the intake into an interrogation.

---


# 1. Your job

When I ask you to create an ATTB build, do **not** merely produce JSON that parses.

Your job is to produce a build that is:

1. a coherent, current ESO build for the requested purpose;
2. complete enough to guide progression rather than only show an endgame snapshot;
3. valid against the current ATTB build format;
4. internally cross-referenced correctly;
5. based on exact ATTB catalog IDs rather than guessed skill IDs;
6. selective and sensible about Skill Point spending;
7. complete enough to include important passives without blindly buying every passive;
8. designed so that ATTB should import it with **zero errors and zero avoidable warnings**;
9. delivered as an actual `.json` file, with a short validation/preflight summary.

A file that is syntactically valid JSON but produces ATTB warnings such as:

> `final references fighters_guild__camouflaged_hunter, but that skill is not in the Unlock Plan`

is **not finished**.

Before handing me the file, perform the cross-reference audit in this guide.

---

# 2. Source-of-truth order

Before authoring the JSON, establish the current ATTB contract.

Use this order of authority:

1. **Any current ATTB source ZIP, template, build JSON, schema, or catalog I supplied with the request.**
2. **The current canonical repository:** `DeadxxSmile/Arrow-to-the-Build`
3. Current exported ATTB template/build files I provide.
4. Only after those, prior conversation context or memory.

For ATTB 2.1 / Schema 4, inspect the current versions of these files when available:

- `docs/reference/BUILD_QUICK_START.md`
- `docs/reference/BUILD_JSON_GUIDE.md`
- `docs/reference/BUILD_FORMAT.md`
- `docs/reference/BUILD_VALIDATION_GUIDE.md`
- `docs/reference/BUILD_SCHEMA.json`
- `docs/reference/BUILD_TEMPLATE.json`
- `docs/reference/SKILL_CATALOG.md`
- `resources/data/eso-skill-catalog.json`
- the complete working examples under `resources/builds/`

Do not rely on an old Schema 3 guide when the current app expects Schema 4.

If the repository contains a newer schema than the one described here, follow the repository.

---

# 3. Research the ESO build, not just the JSON

If I ask for a **current**, **best**, **meta**, **modern**, or otherwise up-to-date build, research current ESO information before deciding the target setup.

Use current sources appropriate to the role and content. Prefer:

- official ESO patch notes for changes;
- UESP or another strong mechanics reference for factual game details;
- current reputable buildcraft specialists for the requested role/content;
- more than one buildcraft source when practical.

Do not copy one guide blindly. Cross-check the common buildcraft, then create a coherent plan for **my stated use case**.

If current sources disagree, choose the approach that best fits my requested content and explain the tradeoff briefly.

Do not use web pages to invent ATTB catalog IDs. **ATTB's own catalog is authoritative for `catalog_skill_id`.**

Set `game_version` and `verified_date` accurately.

---

# 4. First determine whether the build is generic or character-specific

Before making assumptions, determine whether I want:

### A. Generic build
A reusable target build for a class/role.

### B. Build for an existing character
A target build intended for one of my actual characters.

If I supply a character backup, synced-character export, current build, screenshots, or other character data, inspect it before asking questions.

For an existing character:

- preserve the real class unless I explicitly request a different character concept;
- preserve the real race by default unless I ask whether a race change is worth it;
- distinguish **CURRENT character reality** from the **TARGET build**;
- do not mistake currently owned skills, gear, or Champion Points for the final target;
- build a useful path from where the character is now toward the intended result.

---

# 5. Intake questions to ask me

Ask the unanswered questions in **one compact intake message**. Do not ask me for information I already supplied.

If I say **"use your judgment"**, make the choice yourself and document it rather than continuing to interrogate me.

## Required decisions

Ask or determine:

1. **Build name**
   - Ask this early because the build's permanent ID should be derived from the intended identity.
   - If I do not care, propose a clear name.

2. **Class**
   - Arcanist, Dragonknight, Necromancer, Nightblade, Sorcerer, Templar, or Warden.

3. **Purpose / role**
   - damage, tank, healer, solo, hybrid, support, etc.

4. **Content**
   - overland;
   - solo/duo;
   - normal/veteran dungeons;
   - arenas;
   - trials;
   - Infinite Archive;
   - PvP;
   - a flexible general-purpose combination.

5. **Group size**
   - solo, duo, 4-player, 12-player, PvP group, etc.

6. **Resource direction**
   - stamina, magicka, health/tank, hybrid, or "choose for me."

7. **Race**
   - fixed race;
   - optimize for the build;
   - keep my current race but list better alternatives.

8. **Pure class vs subclassing**
   - Default to pure class unless I request subclassing or the build specifically calls for it.
   - If subclassing is used, establish which lines are native, subclassing, or mastered.

9. **Weapons / bars**
   - preferred weapons;
   - one-bar vs two-bar;
   - any accessibility or input-complexity constraints.

10. **Build complexity**
    - simple/forgiving;
    - moderate;
    - maximum-performance/high-APM.

11. **Access restrictions**
    - ESO Plus;
    - owned Chapters/DLC;
    - Scribing access;
    - mythics;
    - arena weapons;
    - dungeon/trial gear;
    - crafted/guild-trader gear.

12. **Progression scope**
    - full Level 1 → 50 → CP160 → endgame roadmap;
    - leveling only;
    - CP160+ only;
    - current-character catch-up path.

13. **Gear tolerance**
    - easiest practical gear;
    - no trials;
    - no DLC;
    - crafted/overland only;
    - normal dungeons okay;
    - full endgame farming is fine.

14. **Companion**
    - no companion;
    - recommend one;
    - a specific companion and role, for example **Isobel as tank**.

15. **Transformation / special systems**
    - none;
    - Vampire;
    - Werewolf;
    - Scribing;
    - Class Mastery;
    - other build-defining systems.

16. **Personal priority**
    - damage;
    - survivability;
    - sustain;
    - easy rotation;
    - solo self-sufficiency;
    - group utility;
    - balanced.

## Useful optional questions

Ask only when relevant:

- Do I want the build optimized around gear I already own?
- Do I need a no-DLC/no-trial alternative?
- Do I want a second loadout or smaller situational variants?
- Do I care about a particular Mundus, skill, weapon, set, or theme?
- Should the build reserve a comfortable number of Skill Points for crafting and personal progression?

---

# 6. Permanent naming and ID rules

ATTB display names and permanent IDs are different things.

## Build display name

`name` is human-readable and may be changed later.

Example:

```json
"name": "Stamina Arcanist Solo / Duo with Isobel Tank"
```

## Permanent build ID

`id` is persistent and should not be casually changed after the build is created.

Current Schema 4 IDs allow:

- letters;
- numbers;
- `.`;
- `-`;
- `_`.

Prefer lowercase snake_case for readability.

Example:

```json
"id": "stamina_arcanist_solo_duo_isobel_tank"
```

### Rules

- Do not reuse a protected bundled-build ID.
- Do not accidentally overwrite an unrelated imported/user build.
- If this is a fork, give it a distinct permanent ID.
- If we later revise the same build, preserve its ID unless I explicitly ask to fork it.
- Do not use display text, spaces, slashes, apostrophes, or decorative punctuation as persistent IDs.

---

# 7. The most important skill-ID rule: NEVER GUESS

ATTB player-skill references use stable catalog IDs.

A normal skill ID generally looks like:

```text
{line_id}__{skill_slug}
```

Example:

```text
herald__fatecarver
```

However, **do not construct a `catalog_skill_id` from the current display name and assume it is correct.**

ATTB intentionally preserves stable IDs across some ESO display-name changes. A renamed ability can therefore have a stable catalog ID that is not what you would guess from the current visible name.

For every ordinary player:

- active ability;
- morph;
- passive;
- ultimate;
- Grimoire;
- Class Mastery catalog reference;

look up the exact ID in the current:

```text
resources/data/eso-skill-catalog.json
```

or current ATTB Skill Catalog/Build Editor data.

### Keep these ID types separate

Do not confuse:

- `unlock_order[].id` = stable ID for the build's unlock row;
- `catalog_skill_id` = exact stable ID from the ATTB ESO skill catalog;
- `scribed_skill_id` = ID of a recipe declared under `scribed_skills`;
- `line` = exact catalog skill-line ID;
- `requires[]` = **unlock-row IDs**, not catalog skill IDs;
- `loadout_ids[]` = loadout IDs;
- `recommended_gear_stage_ids[]` = gear-stage IDs;
- CP `final_slots[]` = CP-node IDs in that same tree.

This separation is mandatory.

---

# 8. Required Schema 4 foundation

For the current ATTB 2.1 Schema 4 baseline, a complete build contains usable versions of:

- `schema_version`
- `id`
- `name`
- `metadata`
- `class_configuration`
- `defaults`
- `relevant_lines`
- `cp_plans`
- `unlock_order`
- `phases`
- `gear_stages`

The progression arrays are not placeholders.

`relevant_lines`, `unlock_order`, `phases`, and `gear_stages` must contain meaningful entries.

Current metadata requires at least:

- `roles`
- `content`
- `resource`
- `bar_count`
- `class_style`

Use optional sections when they materially improve the build:

- `short_name`
- `author`
- `game_version`
- `verified_date`
- `summary`
- `notes`
- `requirements`
- `transformations`
- `scribed_skills`
- `quickslots`
- `companions`
- `performance`
- `sources`
- `setup_help`
- `concepts`
- `consumables`
- `tips`
- `default_loadout_id`
- `loadouts`
- `variants`
- `format_notes`
- `extensions`

Do not add sections merely to make the JSON look large.

---


# 8A. JSON anatomy at a glance

This section is intentionally written for an AI that has never seen an ATTB file.

The following is a **structural teaching example**, not a complete importable build. It uses comments and omitted sections to show relationships. Do not output comments or ellipses in the final JSON.

```jsonc
{
  "schema_version": 4,

  // Build identity. `id` is permanent; `name` is display text.
  "id": "stamina_arcanist_solo_duo",
  "name": "Stamina Arcanist Solo / Duo",

  // Search/filter intent.
  "metadata": {
    "roles": ["damage", "solo"],
    "content": ["overland", "dungeons", "arenas"],
    "resource": "stamina",
    "bar_count": 2,
    "class_style": "pure_class"
  },

  // Exactly three active class lines in the current Schema 4 model.
  "class_configuration": {
    "base_class": "Arcanist",
    "active_class_lines": [
      {"line_id": "herald", "source_class": "Arcanist", "mode": "native"},
      {"line_id": "soldier", "source_class": "Arcanist", "mode": "native"},
      {"line_id": "curative", "source_class": "Arcanist", "mode": "native"}
    ]
  },

  // TARGET character setup, not the character's current state.
  "defaults": {
    "class": "Arcanist",
    "race": "Dark Elf",
    "attributes": {"magicka": 0, "health": 0, "stamina": 64},
    "mundus": "The Thief",
    "front_weapon": "Dual Daggers",
    "back_weapon": "Inferno Staff"
  },

  // Every line used by unlock_order must be represented here.
  "relevant_lines": [
    {"id": "herald", "name": "Herald of the Tome", "group": "Class", "max": 50},
    {"id": "soldier", "name": "Soldier of Apocrypha", "group": "Class", "max": 50},
    {"id": "curative", "name": "Curative Runeforms", "group": "Class", "max": 50},
    {"id": "dual_wield", "name": "Dual Wield", "group": "Weapon", "max": 50}
  ],

  // Purchase/dependency plan.
  "unlock_order": [
    {
      "id": "fatecarver",
      "name": "Fatecarver",
      "catalog_skill_id": "herald__fatecarver",
      "line": "herald",
      "kind": "Active",
      "requires": [],
      "skill_point_cost": 1
    },
    {
      "id": "pragmatic_fatecarver",
      "name": "Pragmatic Fatecarver",
      "catalog_skill_id": "herald__pragmatic_fatecarver",
      "line": "herald",
      "kind": "Morph",

      // IMPORTANT: requires points to the BUILD-LOCAL unlock row id,
      // not to `herald__fatecarver`.
      "requires": ["fatecarver"],
      "skill_point_cost": 1
    }
  ],

  // A phase consumes player skills from the Unlock Plan.
  "phases": [
    {
      "id": "15_plus",
      "label": "Level 15+",
      "min_level": 15,
      "max_level": 49,
      "front_bar": {
        "weapon": "Dual Daggers",
        "slots": [
          {
            "name": "Pragmatic Fatecarver",
            "catalog_skill_id": "herald__pragmatic_fatecarver"
          }
        ]
      }
    }
  ],

  // All three trees are required in a complete build.
  "cp_plans": {
    "craft": {"core": [], "flex": [], "final_slots": []},
    "warfare": {"core": [], "flex": [], "final_slots": []},
    "fitness": {"core": [], "flex": [], "final_slots": []}
  },

  // Gear is staged rather than represented as one giant final shopping list.
  "gear_stages": [
    {
      "id": "starter_cp160",
      "name": "CP160 Starter",
      "sets": ["... full structured set/piece objects in real Schema 4 ..."]
    }
  ]
}
```

The important relationship is:

```text
ATTB catalog
    │
    └── catalog_skill_id
            │
            ▼
      unlock_order row
            │
            ├── build-local id  <──── requires[] points here
            │
            └── catalog_skill_id
                    │
                    ├── phase bar refs
                    ├── ultimate refs
                    └── rotation refs
```

A common mistake is to see `herald__fatecarver` and use it everywhere. That is wrong for dependencies:

- **phase/bar skill reference:** `catalog_skill_id: "herald__fatecarver"`
- **unlock row's catalog reference:** `catalog_skill_id: "herald__fatecarver"`
- **morph prerequisite:** `requires: ["fatecarver"]` where `"fatecarver"` is the build-local unlock row ID.

---

# 8B. Small cross-reference example

This is a compact fragment showing how an ability, morph, passive, and phase fit together. It is not a full Schema 4 build by itself.

```json
{
  "relevant_lines": [
    {
      "id": "herald",
      "name": "Herald of the Tome",
      "group": "Class",
      "max": 50
    }
  ],
  "unlock_order": [
    {
      "id": "fatecarver",
      "name": "Fatecarver",
      "catalog_skill_id": "herald__fatecarver",
      "section": "Class",
      "line": "herald",
      "required_rank": 4,
      "kind": "Active",
      "phase": "Leveling",
      "status": "leveling",
      "priority": 40,
      "notes": "Purchase the base ability before its morph.",
      "requires": [],
      "skill_point_cost": 1
    },
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
      "notes": "Chosen final morph.",
      "requires": ["fatecarver"],
      "skill_point_cost": 1
    },
    {
      "id": "fated_fortune_1",
      "name": "Fated Fortune I",
      "catalog_skill_id": "herald__fated_fortune",
      "section": "Passive",
      "line": "herald",
      "required_rank": 8,
      "kind": "Passive",
      "phase": "Early",
      "status": "final",
      "priority": 50,
      "notes": "Example of a deliberately selected useful passive.",
      "requires": [],
      "skill_point_cost": 1
    }
  ],
  "phases": [
    {
      "id": "15_29",
      "label": "Levels 15-29",
      "min_level": 15,
      "max_level": 29,
      "front_bar": {
        "weapon": "Dual Daggers",
        "slots": [
          {
            "name": "Pragmatic Fatecarver",
            "catalog_skill_id": "herald__pragmatic_fatecarver"
          }
        ],
        "ultimate": null
      },
      "back_bar": {
        "weapon": "Inferno Staff",
        "slots": [],
        "ultimate": null
      },
      "rotation": {
        "type": "priority",
        "title": "Example",
        "summary": "Use the chosen spender when appropriate.",
        "opener": [],
        "steps": [
          {
            "name": "Pragmatic Fatecarver",
            "catalog_skill_id": "herald__pragmatic_fatecarver"
          }
        ],
        "execute": [],
        "notes": []
      }
    }
  ]
}
```

Static closure test for this fragment:

```text
Phase skill refs:
  herald__pragmatic_fatecarver

Rotation skill refs:
  herald__pragmatic_fatecarver

Unlock catalog refs:
  herald__fatecarver
  herald__pragmatic_fatecarver
  herald__fated_fortune

Missing phase/rotation refs from Unlock Plan:
  NONE

Unlock requires:
  pragmatic_fatecarver -> fatecarver

Missing build-local prerequisite rows:
  NONE
```

That is the reasoning ATTB authors should perform for the complete build.

---

# 8C. Section relationship map

Use this map when deciding where information belongs.

| Information | Where it belongs |
|---|---|
| Build identity | root `id`, `name`, `short_name`, `author` |
| Search/filter intent | `metadata` |
| Base class + active class lines | `class_configuration` |
| Recommended race/Mundus/weapons/attributes | `defaults` |
| Explanation of those recommendations | `setup_help`, `concepts`, `notes` |
| Skill lines the build tracks | `relevant_lines` |
| Skills/morphs/passives/ultimates to buy | `unlock_order` |
| Exact Scribing recipe | `scribed_skills` + `scribed_skill_id` |
| Level/CP-specific bars | `phases` |
| Combat sequence or priority | each phase's `rotation` |
| Leveling/starter/final equipment | `gear_stages` |
| CP spending | `cp_plans.craft`, `.warfare`, `.fitness` |
| Food/potions/poisons | `consumables` |
| Companion recommendation | `companions` |
| Alternative complete setup | `loadouts` |
| Small situational modification | `variants` |
| Long explanations/caveats | `notes`, `tips`, `performance`, `requirements` |

Do not duplicate the same idea into several sections unless the current schema/example clearly expects it.

---

# 8D. What "complete" means

A large JSON file is not automatically complete.

A complete ATTB build has four layers:

### 1. Game correctness

The actual ESO setup makes sense for the intended role/content.

### 2. Schema correctness

The fields use the current Schema 4 shape and required sections exist.

### 3. Reference correctness

Every ID-based relationship resolves.

### 4. Progression correctness

A player can actually follow the plan from the requested starting point to the target without unexplained gaps.

The preflight later in this guide checks all four.

---


# 9. Class configuration audit

For the current Schema 4 class model:

- exactly three active class lines;
- every active class line must also exist in `relevant_lines`;
- at least one active line must be native to the base class;
- do not use more than one active line from a given foreign class;
- `native` is only for the base class;
- foreign lines use `subclassing` or `mastered`;
- disable Class Mastery when a foreign line is active;
- mastery choices must belong to the base class mastery catalog;
- do not exceed available mastery points.

If using foreign class skills/passives, use the current schema's correct Skill Point cost. Under the current baseline, foreign class purchases cost two ordinary Skill Points and should use:

```json
"skill_point_cost": 2
```

Do not turn a normal pure-class build into a subclass build just because subclassing exists.

---

# 10. Relevant Lines rule

`relevant_lines` is not a decorative index.

It must include:

- all three active class lines;
- every skill line used by an `unlock_order` row;
- weapon lines used by player skill unlocks;
- armor/guild/world/other lines used by selected player unlocks;
- Scribing line when required by current schema/content.

Every `unlock_order[].line` must resolve to a line in `relevant_lines`, and the line must exist in the current catalog.

Do not add every line in ESO "just in case."

---

# 11. Unlock Plan: build the dependency graph correctly

`unlock_order` is the backbone of ATTB progression.

Each important row should have the current schema's appropriate fields, including:

- stable row `id`;
- readable `name`;
- exact `catalog_skill_id` **or** exact `scribed_skill_id`;
- `section`;
- `line`;
- `required_rank`;
- `kind`;
- `phase`;
- `status`;
- `priority`;
- `notes`;
- `requires`;
- correct `skill_point_cost`;
- optional `loadout_ids` when scoped.

## Morphs

A morph must depend on its actual base ability.

Example concept:

```json
{
  "id": "pragmatic_fatecarver",
  "catalog_skill_id": "herald__pragmatic_fatecarver",
  "requires": ["fatecarver"]
}
```

The `requires` value refers to the build unlock-row ID for Fatecarver, not a guessed catalog ID.

Do not mark both alternate morphs of the same ability as final recommendations.

## Priority

Lower priority values should represent earlier recommendations.

The order should make gameplay sense:

- unlock skills needed to level important lines;
- obtain core actives;
- morph them after the base skill;
- add important passives as they become useful;
- add ultimates at valid line ranks;
- introduce later/final bar skills before phases that reference them.

Do not make a beautifully written final bar that requires skills the progression plan never told the player to purchase.

### Catalog unlock gates: use them, do not re-research them by hand

ATTB 2.1.1's Update 50 player catalog carries a complete audited unlock model:

- every ordinary Skill Point passive has one exact per-purchase line-rank gate in `unlock_ranks`;
- `required_rank` is the first passive point's gate or the base skill family's line-rank gate;
- every morph has `requires_base_skill_rank: 4`, because ESO requires the unmorphed ability to reach Rank IV before a morph can be chosen;
- current verification/source metadata is stored on the catalog rows.

`unlock_ranks` and `requires_base_skill_rank` are **catalog maintenance data, not extra fields to copy into build JSON**. When creating build `unlock_order` rows, derive `required_rank` from the current catalog:

- active/ultimate/morph row → catalog `required_rank`;
- passive point I → `unlock_ranks[0]`;
- passive point II → `unlock_ranks[1]`;
- and so on.

Do not give every rank of a passive the same `required_rank`. Do not guess a rank from an old guide. If a supplied ATTB catalog is newer than this document, the catalog wins.

A morph's build dependency still uses `requires: [<base unlock-row id>]`; the catalog's Rank-IV condition is an additional game requirement, not a replacement for Reference Closure.

---

# 12. The REFERENCE CLOSURE rule

This rule exists specifically to prevent the warning failures we have already encountered.

Before delivery, build a set of every player skill reference used anywhere in the effective build.

Then make sure every reference resolves correctly.

## Player skill closure

Every player ability/ultimate referenced by:

- every phase front bar;
- every phase back bar;
- every phase ultimate slot;
- structured rotations when they use IDs;
- loadout overrides;
- variant overrides;
- final bars;
- alternate bars;

must have a corresponding valid entry in `unlock_order`.

If a final bar contains:

```text
fighters_guild__camouflaged_hunter
```

then `unlock_order` must contain the matching exact catalog skill reference, with its proper line, rank, status, priority, and prerequisites.

If a phase contains:

```text
dual_wield__quick_cloak
```

there must be a matching unlock row.

If a phase contains:

```text
herald__the_languid_eye
```

there must be a matching unlock row.

Do **not** hand me a file while any bar skill says "not in the Unlock Plan."

## Other reference closure

Also verify:

- every `unlock_order[].line` → valid `relevant_lines[].id`;
- every `unlock_order[].requires[]` → real `unlock_order[].id`;
- every `scribed_skill_id` → real `scribed_skills[].id`;
- every Grimoire catalog reference → real catalog entry;
- every phase `recommended_gear_stage_ids[]` → real `gear_stages[].id`;
- every `loadout_ids[]` → real loadout;
- `default_loadout_id` → real available loadout;
- every variant loadout scope → real loadout;
- every CP `requires[]` → real node in the same CP tree;
- every CP `final_slots[]` → real slottable node in the same CP tree;
- every keyed override → valid ID and valid effective object after merge.

The finished build should have **zero dangling references**.

---

# 13. Passives: neither "all of them" nor "none of them"

This is a hard requirement.

A serious ATTB build must include a thoughtful passive plan.

Do **not**:

- dump every passive from every relevant line into the build;
- omit passives entirely;
- spend Skill Points on passives that do nothing for the chosen setup;
- consume every available Skill Point merely because a passive exists.

ATTB progression should leave reasonable room for crafting, guild utility, antiquities, alternate skills, and player preference unless I explicitly ask for a total-completion build.

## Passive audit procedure

For each build, actively review passives from:

1. all three active class lines;
2. each equipped weapon line;
3. armor lines actually represented in the build;
4. relevant guild lines;
5. relevant world/system lines;
6. racial or other lines when they are part of the target and represented by the current catalog/schema;
7. any transformation line if Vampire/Werewolf is used.

### Include a passive when it materially supports the build

Examples:

- damage or healing output;
- tank mitigation, block, resistance, sustain, or resource return;
- weapon type actually equipped;
- armor weights actually worn;
- penetration, critical, ultimate generation, recovery, cost reduction, or role mechanics that matter to this setup;
- a guild/passive interaction required by a slotted skill or rotation;
- a transformation mechanic central to the build.

### Skip a passive when it is irrelevant

Examples:

- affects an unused weapon type;
- affects a damage/healing mechanic the build does not use;
- crafting/economy/convenience passive unrelated to the combat build;
- PvP-only value in a PvE build unless included as an optional PvP variant;
- role-specific effect irrelevant to the requested role;
- an armor passive that cannot apply to the actual armor configuration.

### Mark situational passives as optional

If a passive is useful but not core, use the current schema's appropriate optional status/notes rather than pretending it is mandatory.

## Internal passive sanity check before delivery

Before handing me the file, answer internally:

- Did I inspect the passives for every active class line?
- Did I inspect both weapon lines if the build uses two?
- Did I inspect the armor weights actually equipped?
- Did I inspect relevant guild/world lines?
- Did I include the important ones?
- Did I skip clearly irrelevant ones?
- Is the final Skill Point burden reasonable for the intended progression?

If the answer to any is no, the build is not ready.

---

# 14. Skill Point budget sanity check

Calculate or estimate the build's Skill Point burden from the actual `unlock_order` costs.

Separate conceptually:

- **core/final combat purchases**;
- **leveling/temporary purchases**;
- **optional/situational purchases**;
- **foreign-class 2-point purchases**, if any.

Do not optimize by simply deleting useful passives until the count looks small.

Do not optimize by buying everything and assuming the user will eventually find infinite Skill Points.

The goal is a **practical combat roadmap** with room for normal ESO life.

For every temporary unlock, decide when it stops being useful. Prefer an explicit `retire_when` cutoff when the build has a clear handoff point:

- character level when the temporary skill belongs only to an early leveling phase;
- skill-line rank when the purpose is to train that line until a replacement or passive tier becomes available;
- replacement unlock completion when the exact successor matters more than a numeric rank.

Do not keep an early filler in the recommendation queue forever simply because it is tagged `temporary`. If there is no reliable automatic cutoff, omit `retire_when` and let the player retire it manually.

In the delivery summary, report the approximate/core Skill Point burden if it is useful for the build.

---

# 15. Progression phases must be playable

A phase is a usable plan for a level/CP band, not flavor text.

When creating a full progression build, use sensible bands such as:

- early leveling before weapon swap;
- Level 15+ two-bar introduction;
- mid-level morph/passive development;
- late 1-50;
- Level 50 / pre-CP160 transition where useful;
- CP160 starter;
- later/final progression.

Use the current working ATTB examples as the structural pattern.

## Phase rules

- zero to five normal skills per bar;
- ultimate is separate from the five normal slots;
- do not use weapon swap before Level 15;
- early back bars should be absent or explicitly locked;
- do not reference a skill before the unlock plan makes it plausibly available;
- use temporary skills intentionally to level important lines;
- give temporary skills a sensible retirement cutoff when the handoff point is known;
- make bar evolution understandable;
- include clear rotation/priority guidance;
- phase attribute targets must not exceed the game's allocation limit;
- phase gear-stage references must exist.

## Final bars

Final bars must be:

- mechanically coherent;
- supported by the unlock plan;
- compatible with the weapons;
- reflected in the final rotation/priority system;
- appropriate to the requested role/content.

---

# 16. Rotations and combat guidance

Do not create a rotation merely by listing every slotted skill once.

Choose the correct model:

- static sequence when the build truly uses one;
- priority system when effects are refreshed dynamically;
- tank/healer responsibility priority when strict DPS sequencing is inappropriate.

Include:

- opener if meaningful;
- core maintenance effects;
- spammable/channel;
- proc/resource mechanics;
- ultimate guidance;
- execute behavior if applicable;
- defensive or emergency priority for solo/tank/healer builds;
- notes on bar swapping or timing.

Keep complexity aligned with what I requested.

---

# 17. Gear progression

A complete progression build should not jump from "whatever you find" directly to a perfect final trial setup unless I explicitly ask for endgame-only.

When appropriate, create stages such as:

1. **Leveling**
   - current-level drops;
   - Training traits when useful;
   - easy/crafted/overland options.

2. **CP160 Starter**
   - realistic first permanent sets;
   - accessible sources;
   - coherent 5-piece counts.

3. **Intermediate**
   - dungeon/arena/mythic upgrades if appropriate.

4. **Final**
   - target setup for the requested content.

## Gear rules

For every set/stage:

- verify the set actually exists and is current;
- verify acquisition source/location/access;
- verify DLC/Chapter/ESO Plus implications;
- verify tradeability/crafting/dungeon/trial assumptions;
- provide reasonable alternatives;
- use unique piece IDs;
- assign sensible slots, weights, traits, enchants, quality, weapons, bar behavior, and set counts;
- do not create impossible 5/5/monster/mythic/arena-weapon combinations;
- account for bar-specific weapon set counts where relevant.

If I request low-friction gear, do not bury the build behind trial sets.

---

# 18. Champion Points

Every complete current Schema 4 build needs:

- `craft`;
- `warfare`;
- `fitness`.

For each tree:

- use valid node IDs/names according to the current ATTB structure;
- keep node IDs unique within the tree;
- use positive whole-number max values;
- keep jump points within the node max;
- make `requires` resolve within that tree;
- avoid cycles;
- make flex groups readable and coherent;
- use at most four unique final slots;
- every final-slot ID must exist and be `slottable: true`.

Do not spend every imaginable CP point just because the user has high CP.

Build the required path and useful flex choices for the role.

For Craft, include combat/adventure utility sensibly; do not pretend Craft CP is a damage rotation.

---

# 19. Scribing

If the build uses a generic Grimoire only, follow the current catalog/schema rules.

If the exact Scribed Skill matters, define the actual recipe under `scribed_skills`, including the current schema's required:

- Grimoire;
- Focus Script;
- Signature Script;
- Affix Script;
- recipe ID/name.

Then reference that recipe with `scribed_skill_id`.

Do not set both `catalog_skill_id` and `scribed_skill_id` on the same unlock row.

Verify current script names rather than inventing them from memory.

Always provide a non-Scribing alternative when I request broad accessibility or when Scribing access is uncertain.

---

# 20. Loadouts and variants

Use **loadouts** for genuinely different complete setups, such as:

- solo vs group;
- boss vs trash;
- one-bar vs two-bar;
- beginner vs final;
- damage vs tank;
- substantially different class-line configuration.

Use **variants** for smaller situational changes, such as:

- defensive skill swap;
- no-DLC gear;
- easier rotation;
- alternate consumable;
- one or two skill changes.

Do not add loadouts/variants simply because the schema supports them.

## Effective-build validation

ATTB validates the effective merged result.

Therefore, after applying each available loadout and variant:

- required sections must remain valid;
- required arrays cannot be accidentally cleared;
- every skill reference must still satisfy Reference Closure;
- gear must still be complete;
- CP must still be valid;
- IDs/scopes must still resolve.

An override that looks reasonable by itself can still break the effective build. Validate the merged result, not just the base object.

---

# 21. Companion section - ATTB 2.1

ATTB 2.1 promotes companions from a small recommendation field into a first-class authoring surface. The app ships a current companion directory and **two editable starter presets per current combat companion**. A build can use one of those presets as a starting point or store a completely custom companion setup.

Companion data still lives in the root Schema 4 `companions` array. **Schema 4 is not being replaced merely because the UI got richer.** ATTB 2.1 extends the documented companion object additively.

## Companion source of truth

When current ATTB source is available, inspect:

```text
resources/data/eso-companions.json
```

Use it to determine the supported companion IDs, current roster, ATTB starter preset IDs, and researched role identities. Do not assume an older eight/nine/etc. roster from memory if the current file can be checked.

The companion catalog is **not** the player skill catalog. Do not look for companion abilities in `eso-skill-catalog.json`, and do not invent `catalog_skill_id` values for them.

## Recommended ATTB 2.1 companion object

A current companion setup may look like:

```json
{
  "companions": [
    {
      "id": "isobel_shield_saint",
      "companion_id": "isobel",
      "companion_name": "Isobel Veloise",
      "name": "Isobel - Shield Saint",
      "role": "tank",
      "summary": "Tank-oriented companion setup for holding pressure away from the player.",
      "weapon": "One Hand and Shield",
      "armor_weight": "Heavy",
      "weapon_trait": "Bolstered",
      "armor_trait": "Bolstered",
      "jewelry_trait": "Quickened",
      "skills": [
        "Skill priority slot 1",
        "Skill priority slot 2",
        "Skill priority slot 3",
        "Skill priority slot 4",
        "Skill priority slot 5"
      ],
      "ultimate": "Companion ultimate",
      "equipment": [
        "Heavy companion armor with the recommended trait",
        "One Hand and Shield companion weapon"
      ],
      "notes": [
        "Companion bar order is a priority order, not a player rotation."
      ],
      "preset_id": "isobel_shield_saint",
      "source_url": "https://example.invalid/research-source"
    }
  ]
}
```

The example above teaches the shape only. **Use the actual current companion preset/catalog and current buildcraft source for real skill names, traits, ultimate, and source URL.** Do not copy the placeholder text.

## Companion rules

- Keep companion abilities completely separate from player `relevant_lines`, `unlock_order`, phase bars, and player rotations.
- Companion abilities are plain companion skill names in the current Schema 4 companion object; they do not use player `catalog_skill_id`.
- A normal combat companion setup has up to five normal skills plus a separate ultimate.
- Treat `skills[]` as priority order from first to last unless the current app/catalog documents otherwise.
- Use a stable build-local setup `id`.
- When the setup comes from the ATTB starter library, preserve its `preset_id` so the UI can identify the source preset.
- `companion_id` should match the current ATTB companion catalog when supplied.
- `companion_name` is display/context data; the stable `companion_id` is the important cross-version identity.
- Companion gear is companion gear. Do not encode player set arithmetic, player enchantments, or player Skill Points into the companion object.
- If the user wants a specific companion/role, make the companion complementary to the player build rather than using it as an excuse to leave the player build nonfunctional.
- A build may contain multiple companion setups when they are genuinely useful alternatives.

## Character Tracker target vs build JSON

ATTB 2.1 also lets the Character Tracker remember which preset the player intends to use beside a particular character. That selection is **character progression/preferences data**, not a reason to mutate the target build JSON automatically.

Keep the same CURRENT-vs-TARGET mental model:

```text
Character companion target selection = CURRENT/PER-CHARACTER tracking preference
Build `companions[]`                = TARGET build definition / portable JSON
```

## Companion validation

Before delivery, verify:

- every companion row has a valid stable row `id`, display `name`, and `role`;
- `companion_id`, when present, resolves to the current companion catalog;
- skill names are non-empty and not duplicated accidentally;
- no more than five normal companion skills are authored for a normal one-bar combat setup;
- the ultimate is separate from the five normal skills;
- player skill IDs have not leaked into companion skill fields;
- a copied preset remains internally coherent after edits;
- the companion role actually complements the player build.

# 22. Consumables, requirements, notes, and alternatives

Include useful build-facing information rather than filler.

### Consumables

When relevant, provide:

- primary food/drink;
- primary potion;
- poison if used;
- cheaper/easier alternative;
- solo vs group alternative if meaningful.

### Requirements

Record important access requirements such as:

- DLC/Chapter;
- Scribing;
- Antiquities/mythic;
- arena;
- dungeon/trial;
- transformation;
- quest/system unlock.

### Build Notes

Use `notes` for important context that does not fit structured fields:

- why the build is designed this way;
- important tradeoffs;
- what is optional;
- what changes for hard group content;
- how the companion fits;
- known accessibility or gear compromises.

Do not use Notes to excuse a broken structured build.

---

# 23. JSON hygiene

The final file must be ordinary valid JSON.

Do not include:

- comments;
- trailing commas;
- unquoted keys;
- Markdown fences inside the JSON file;
- placeholder pseudo-values such as `TODO`;
- guessed object shapes from an older schema.

Use UTF-8.

Prefer readable formatting with normal indentation.

Before delivery, parse the JSON with a real JSON parser.

---

# 24. Preflight validation checklist

Run this entire checklist **before** giving me the file.

## A. Format and identity

- [ ] JSON parses.
- [ ] Current schema version is used.
- [ ] Build ID is valid, unique, and intended to be permanent.
- [ ] Display name is correct.
- [ ] No protected bundled ID collision.
- [ ] `game_version` and `verified_date` are current/accurate.

## B. Required sections

- [ ] `metadata` is complete.
- [ ] `class_configuration` is complete.
- [ ] `defaults` is complete.
- [ ] `relevant_lines` is non-empty.
- [ ] `unlock_order` is non-empty.
- [ ] `phases` is non-empty.
- [ ] `gear_stages` is non-empty.
- [ ] all three CP trees exist.

## C. Catalog and skill IDs

- [ ] Every `catalog_skill_id` was looked up in the current ATTB catalog.
- [ ] Every authored `required_rank` matches the current catalog gate; multi-point passive rows use the matching `unlock_ranks[]` entry.
- [ ] Morph planning respects both its skill-line `required_rank` and the base ability Rank IV requirement.
- [ ] No skill ID was guessed from display text.
- [ ] Every unlock row uses the correct skill line.
- [ ] Every active class line is in `relevant_lines`.
- [ ] Every unlock line is in `relevant_lines`.
- [ ] Every morph dependency resolves to its base unlock row.
- [ ] No two alternate morphs are both marked final.

## D. Reference Closure

- [ ] Every front-bar skill in every phase exists in `unlock_order`.
- [ ] Every back-bar skill in every phase exists in `unlock_order`.
- [ ] Every ultimate in every phase exists in `unlock_order`.
- [ ] Every ID-based rotation skill exists in `unlock_order`.
- [ ] Every loadout/variant skill reference exists in the effective unlock plan.
- [ ] Every `requires` reference resolves.
- [ ] Every Scribed Skill reference resolves.
- [ ] Every phase gear-stage reference resolves.
- [ ] Every loadout/variant scope resolves.
- [ ] Every CP dependency/final slot resolves.
- [ ] **Dangling references: 0.**

## E. Passives and Skill Points

- [ ] Active-class passives reviewed.
- [ ] Weapon-line passives reviewed.
- [ ] Relevant armor passives reviewed.
- [ ] Relevant guild/world/other passives reviewed.
- [ ] Important passives included.
- [ ] Clearly irrelevant passives omitted.
- [ ] Situational passives marked optional when appropriate.
- [ ] Build does not have zero passives without a compelling reason.
- [ ] Build does not blindly buy all passives.
- [ ] Skill Point burden is reasonable for the intended progression.

## F. Progression

- [ ] Early phase is actually playable.
- [ ] Back bar is not used before Level 15.
- [ ] No bar has more than five normal skills.
- [ ] Ultimates are separate.
- [ ] Skills appear in progression before/when phases need them.
- [ ] Temporary leveling skills have a reason.
- [ ] Final bars are complete and coherent.
- [ ] Rotation matches the bars.
- [ ] Attribute totals are legal.

## G. Gear

- [ ] Gear stages progress logically.
- [ ] Set sources are accurate.
- [ ] Piece IDs are unique.
- [ ] Set counts are possible.
- [ ] Traits/enchants/weights fit the build.
- [ ] Mythic/monster/arena-weapon combinations are physically possible.
- [ ] Reasonable alternatives exist when appropriate.
- [ ] Access restrictions match what I said I own/allow.

## H. Champion Points

- [ ] Craft tree valid.
- [ ] Warfare tree valid.
- [ ] Fitness tree valid.
- [ ] Dependencies resolve.
- [ ] No cycles.
- [ ] Final slots are real slottables.
- [ ] No more than four final slottables per tree.
- [ ] CP plan fits the requested role/content.

## I. Companion, Scribing, loadouts

- [ ] Companion section is separate from player skill data.
- [ ] Every `companion_id` used resolves to the current ATTB companion catalog when available.
- [ ] Normal companion bars contain no more than five normal skills plus a separate ultimate.
- [ ] Companion preset IDs/skill names/traits were copied from current source or researched rather than guessed.
- [ ] Scribing recipes are exact if used.
- [ ] Available loadouts validate as complete effective builds.
- [ ] Available variants validate after merging.

## J. ATTB-specific final check

If current ATTB source/runtime validation is available:

- [ ] run the current build validator/import validation;
- [ ] fix every error;
- [ ] fix every avoidable warning;
- [ ] re-run after fixes.

**Target result:**

```text
Import errors: 0
Known broken references: 0
Avoidable ATTB warnings: 0
```

Suggestions can remain only when they are genuinely optional authoring suggestions rather than evidence of an incomplete build.

---


# 24A. Validation workflow for an unfamiliar AI

Do not treat validation as one action. Run it in layers.

## Layer 1 - JSON syntax

Use a real JSON parser.

Check:

- no comments;
- no trailing commas;
- quoted keys;
- valid strings/escapes;
- no duplicate object keys if your parser/tool can detect them;
- UTF-8 output.

If parsing fails, stop and fix it before any semantic validation.

---

## Layer 2 - Current schema / ATTB validator

When current ATTB source or a schema validator is available:

1. run the current build validator;
2. record errors, warnings, suggestions;
3. fix all errors;
4. investigate every warning;
5. fix every warning that represents an actual inconsistency;
6. re-run.

Do not claim this layer passed unless the actual current validator/schema was run.

---

## Layer 3 - Catalog validation

Build the set:

```text
CATALOG_IDS = every valid catalog_skill_id from current eso-skill-catalog.json
```

For every player `catalog_skill_id` in the build:

```text
assert reference ∈ CATALOG_IDS
```

Also verify that each unlock row's `line` matches the catalog entry's skill line.

Do not merely test whether the string "looks right."

---

## Layer 4 - Build-local ID validation

Within each scope, ensure persistent IDs are:

- present where required;
- syntactically allowed;
- unique.

At minimum inspect:

- build ID;
- unlock row IDs;
- phase IDs;
- gear-stage IDs;
- set IDs;
- piece IDs;
- CP node/group IDs;
- Scribed Skill IDs;
- loadout IDs;
- variant IDs;
- quickslot IDs;
- companion IDs where used.

---

## Layer 5 - Reference Closure

### Skill closure algorithm

Create:

```text
UNLOCK_CATALOG_REFS =
  all unlock_order[].catalog_skill_id
  plus valid grimoire/scribed references as appropriate
```

Then recursively collect player skill references from:

```text
BASE_SKILL_REFS =
  every phase front-bar slot catalog_skill_id/scribed_skill_id
  every phase back-bar slot catalog_skill_id/scribed_skill_id
  every phase ultimate catalog_skill_id/scribed_skill_id
  every structured rotation skill reference
```

Then do the same after applying every **available loadout** and compatible **available variant**, because overrides can add or replace bars.

For ordinary catalog skills:

```text
MISSING_FROM_UNLOCK_PLAN =
  EFFECTIVE_PLAYER_SKILL_REFS - EFFECTIVE_UNLOCK_CATALOG_REFS
```

Target:

```text
MISSING_FROM_UNLOCK_PLAN = empty set
```

This is the exact family of check that catches warnings like:

```text
final references dual_wield__quick_cloak,
but that skill is not in the Unlock Plan
```

### Prerequisite closure

Create:

```text
UNLOCK_ROW_IDS = all unlock_order[].id
```

For every unlock row:

```text
for prerequisite in row.requires:
    assert prerequisite ∈ UNLOCK_ROW_IDS
```

Then verify the dependency graph has no impossible loops.

### Relevant-line closure

For every unlock row:

```text
assert row.line ∈ RELEVANT_LINE_IDS
```

For every active class line:

```text
assert active_class_line.line_id ∈ RELEVANT_LINE_IDS
```

### Gear-stage closure

For each phase:

```text
for stage_id in recommended_gear_stage_ids:
    assert stage_id ∈ GEAR_STAGE_IDS
```

### Loadout/variant closure

Verify:

- `default_loadout_id` exists and is available;
- all `loadout_ids` scopes exist;
- variant loadout scopes exist;
- effective merged build remains valid.

### Champion Point closure

For each CP tree separately:

```text
NODE_IDS = all core node ids + all flex-group node ids

for node in nodes:
    for prerequisite in node.requires:
        assert prerequisite ∈ NODE_IDS

for slot in final_slots:
    assert slot ∈ NODE_IDS
    assert node(slot).slottable == true
```

Also enforce the current maximum final-slot count.

---

## Layer 6 - Skill Point/passive audit

Calculate:

```text
core_skill_points =
  sum(skill_point_cost for required/final/core unlocks)

temporary_skill_points =
  sum(skill_point_cost for temporary/leveling unlocks)

optional_skill_points =
  sum(skill_point_cost for optional/situational unlocks)
```

Then manually assess the passive mix:

```text
active class lines reviewed?        YES/NO
equipped weapon lines reviewed?     YES/NO
used armor lines reviewed?          YES/NO
relevant guild/world lines reviewed? YES/NO
important passives omitted?         YES/NO
irrelevant passives included?       YES/NO
```

The correct answer is not determined by count alone.

A build with 0 passives is suspicious.
A build that purchases every passive is also suspicious.

---

## Layer 7 - Progression simulation

Mentally or programmatically walk the phases in order.

For each phase ask:

- Is the character level high enough for weapon swap?
- Are the referenced skill lines plausibly opened?
- Are the skills represented in Unlock Plan?
- Are their stated required ranks attainable by this point?
- Is the intended morph introduced after the base skill?
- Are temporary leveling skills clearly temporary, with a sensible `retire_when` cutoff whenever the build can know when they have served their purpose?
- Is there a usable heal/defense plan when the content requires one?
- Does the rotation reference only skills actually on the effective bars or deliberately described exceptions?
- Is the recommended gear stage valid?
- Do phase attributes stay legal?

This is where a structurally valid but practically terrible progression build is caught.

---

## Layer 8 - Gear arithmetic

For every gear stage, especially final:

1. count body slots;
2. count jewelry;
3. count front/back weapon contribution;
4. account for monster sets;
5. account for mythics;
6. account for arena weapons;
7. account for one-bar items such as Oakensoul when relevant;
8. verify five-piece bonuses can actually be active on the intended bars;
9. verify every listed piece belongs to the claimed set/type/source.

If bar-specific set activation matters, state it explicitly.

---

## Layer 9 - ESO buildcraft review

After the file is structurally clean, ask:

- Does this setup still make sense in the current ESO patch?
- Does the gear support the skill/rotation plan?
- Do CP choices support the actual damage/healing/tank profile?
- Are sustain and survival reasonable for the requested content?
- Is the companion role complementary rather than redundant?
- Does the complexity match the user's request?

A clean validator result does not prove the build is good.

---

## Layer 10 - Final delivery audit

Only after all prior layers:

- write the `.json` file;
- parse the final on-disk file again;
- if runtime validator exists, run it against the exact final file;
- provide the preflight summary;
- explicitly disclose anything that could not be runtime-verified.

---

# 24B. How to interpret ATTB review results

ATTB separates review findings conceptually into:

### Errors

Block completion/save/import as a complete build.

Examples:

- missing required root data;
- invalid class configuration;
- invalid references;
- broken effective loadout;
- illegal CP final slot;
- malformed required gear data.

**Action:** fix all.

### Warnings

Do not necessarily block saving but usually indicate a deliberate review is needed.

Examples include cross-section mismatches such as a phase/final bar referencing a skill not present in the Unlock Plan.

**Action:** fix all avoidable warnings. A warning may remain only if it is genuinely intentional and the build still behaves correctly.

### Suggestions

Optional authoring improvements.

**Action:** review, but do not contort the build merely to make a suggestion count zero.

The delivery target is therefore:

```text
Errors: 0
Dangling references: 0
Avoidable warnings: 0
Suggestions: reviewed
```

---

# 24C. Fallback validation when you cannot run ATTB

If you cannot run the current ATTB application or validator:

1. say so;
2. do not pretend runtime validation passed;
3. still run:
   - JSON parser;
   - schema validation if `BUILD_SCHEMA.json` is available;
   - catalog membership checks;
   - duplicate-ID checks;
   - Reference Closure;
   - prerequisite graph checks;
   - gear-stage reference checks;
   - CP reference checks;
   - phase progression audit;
   - gear arithmetic;
   - passive/Skill Point audit.

Then report:

```text
Runtime ATTB validator: NOT RUN
Static Schema 4/source audit: PASS
JSON parse: PASS
Catalog/reference closure: PASS
```

If exact catalog/schema data was also unavailable, do **not** label the JSON "ready to import." Ask for the needed current ATTB files instead.

---


# 25. If the validator/runtime is available, USE IT

If I provide the current ATTB source or the repository is accessible, do not stop at hand-review.

Find the current Schema 4 validation/import path and use it when practical.

At minimum:

1. parse the JSON;
2. validate the object against the current schema/validator;
3. run any relevant build validation tests or validation helper available in the source;
4. perform the manual Reference Closure audit above;
5. correct the file;
6. validate again.

If you cannot execute the actual ATTB validator in your environment, say so in the final preflight summary. Do not falsely claim "ATTB validation passed" when you only performed static review.

---

# 26. Delivery format

When the build is complete, give me:

1. **The importable `.json` file.**
2. A short build summary covering:
   - role/content;
   - race/resource/weapons;
   - companion if any;
   - major gear direction;
   - complexity/playstyle.
3. An **ATTB preflight summary** similar to:

```text
ATTB preflight
- Schema: 4
- JSON parse: PASS
- Catalog skill IDs checked: PASS
- Unlock rows: 42
- Passive unlocks: 16 core / 4 optional
- Phase bar/ultimate references checked: 31
- Missing Unlock Plan references: 0
- Dangling requires/gear/loadout/CP references: 0
- CP final slot limits: PASS
- Gear-stage reference check: PASS
- Runtime ATTB validator: PASS
```

If runtime validation could not be run, report:

```text
- Runtime ATTB validator: NOT RUN (static/source audit completed)
```

Do not hide uncertainty.

---

# 27. Do not make these recurring mistakes

### Mistake: Final bar references a skill missing from Unlock Plan
Fix: add the exact skill/morph/ultimate unlock row and its prerequisites before delivery.

### Mistake: Guessing a catalog ID from the visible ESO skill name
Fix: look it up in ATTB's current catalog.

### Mistake: Using `requires` with catalog IDs
Fix: `requires` points to build `unlock_order[].id` values.

### Mistake: Adding every passive
Fix: review every relevant line, then include only passives that materially support this build; mark situational ones optional.

### Mistake: Adding no passives
Fix: audit active class, weapon, armor, guild/world, race/transformation lines as appropriate.

### Mistake: Designing only the final CP160 build
Fix: when I request progression, create playable phases and gear stages leading to it.

### Mistake: Equipping an impossible combination of sets
Fix: count all body, jewelry, weapon, monster, mythic, and arena slots, including bar-specific activation.

### Mistake: Current character state becomes the target by accident
Fix: CURRENT is evidence of what the character owns now; TARGET is the authored build plan.

### Mistake: Changing a build ID during an ordinary revision
Fix: preserve the permanent ID; only change it for a deliberate fork.

### Mistake: Companion skills get mixed into player skills
Fix: keep companion data in the companion section.

### Mistake: "Valid JSON" is treated as equivalent to "valid ATTB build"
Fix: schema validation and Reference Closure are separate requirements.

---

# 28. Recommended build-authoring sequence

Use this sequence to reduce rework:

1. Read my request and any attached/current character/build JSON.
2. Inspect current ATTB schema/template/catalog.
3. Ask one compact intake round for missing build decisions.
4. Research current ESO buildcraft for the requested purpose.
5. Decide the target build concept.
6. Set the display name and permanent ID.
7. Build metadata/defaults/class configuration.
8. Select relevant skill lines.
9. Design final bars and role responsibilities.
10. Create the full unlock plan, including **selective passives**.
11. Build playable progression phases.
12. Run **Reference Closure** on all skill refs.
13. Build gear stages and verify set arithmetic.
14. Build all three CP plans.
15. Add Scribing, consumables, companion, notes, requirements, tips.
16. Add loadouts/variants only if they are actually useful.
17. Parse JSON.
18. Run current ATTB validation when available.
19. Run the full manual preflight.
20. Fix all errors and avoidable warnings.
21. Re-run validation.
22. Deliver the `.json` plus the preflight summary.

---

# 29. Quick intake template for me

When I request a new build and have not supplied enough detail, ask me something close to this:

> I can build this as a clean ATTB import. I need the remaining target decisions first:
>
> - Build name:
> - Class:
> - Main purpose/content: solo, duo, dungeons, trials, PvP, flexible PvE, etc.:
> - Role/resource:
> - Race: fixed, current character race, or optimize:
> - Pure class or subclassing:
> - One bar or two; preferred weapons:
> - Rotation: easy, moderate, or max-performance:
> - Gear restrictions: no trials/no DLC/easy farm/full endgame:
> - ESO Plus / DLC / Scribing / mythic access:
> - Progression: Level 1+, current character catch-up, or CP160+:
> - Companion: none, recommend one, or specific companion/role:
> - Priority: damage, survival, sustain, group utility, or balanced:
>
> If you do not care about one of these, say "choose for me" and I will make the call.

Only ask fields that are still unknown.

---


# 29A. Example end-to-end conversation and reasoning path

This example teaches an unfamiliar AI how to use the guide. It is not a prescription for the actual current best Arcanist build.

## User request

> "Make me an ATTB build for a Stamina Arcanist. Mostly solo/duo, and I want Isobel as tank."

## What the AI should infer immediately

Known:

- class = Arcanist;
- resource direction = Stamina;
- content includes solo/duo;
- player role is primarily damage/self-sufficient PvE;
- companion = Isobel;
- companion role = tank.

Unknown and potentially material:

- build name;
- existing character or generic build;
- race/current race;
- one vs two bars / weapon preference;
- desired complexity;
- gear restrictions;
- ESO Plus/DLC/Scribing/mythic access;
- progression scope;
- whether normal/vet dungeons or arenas should also be supported;
- personal priority between damage and extra solo survivability.

## Good intake message

> I have the core concept: Stamina Arcanist for solo/duo with Isobel tank. I only need the remaining decisions before I build the JSON:
>
> - Is this for an existing character? If so, attach/export its character JSON or tell me the race/level.
> - Build name, or should I name it?
> - Two-bar normal setup, one-bar, or choose for you?
> - Rotation: easy, moderate, or max-performance?
> - Gear limits: no trials, no DLC, easy-farm only, or full endgame options?
> - Do you have ESO Plus, Scribing, and access to mythics?
> - Full leveling roadmap or CP160+?
> - Prioritize maximum damage, extra solo safety, or balanced?
>
> Say "choose for me" on anything you don't care about.

## After the user answers

The AI should then:

1. inspect current ATTB schema/template/catalog;
2. research current Stamina Arcanist solo/duo buildcraft;
3. decide the player bars and rotation;
4. decide which passives materially support those bars and armor/weapons;
5. design Isobel tank separately under `companions`;
6. choose accessible gear progression matching the user's restrictions;
7. encode all exact catalog IDs from ATTB;
8. ensure every bar/ultimate reference is represented in `unlock_order`;
9. calculate the Skill Point burden;
10. validate all three CP trees;
11. parse and validate;
12. deliver JSON only after missing Unlock Plan references = 0.

## What the AI must NOT do

- add every Arcanist passive automatically;
- omit all passives;
- put Isobel's companion skills into player `unlock_order`;
- make "Isobel tank" an excuse to omit player survival entirely if solo content still needs it;
- use a skill in the Level 30-49 or final phase without adding it to Unlock Plan;
- invent catalog IDs from skill display names;
- assume trial gear if the user said no trials;
- overwrite an existing build ID merely because the display name is similar.

---

# 29B. Example of a final handoff message

After creating the file, the AI's response should be concise and confidence-calibrated.

Example:

> Done - I built the ATTB Schema 4 JSON for **Stamina Arcanist Solo / Duo with Isobel Tank**.
>
> Build direction: two-bar Stamina Arcanist, balanced solo/duo damage and self-sufficiency, with Isobel configured separately as a tank. Gear progression goes from leveling → accessible CP160 starter → intermediate → final, respecting your no-trial restriction.
>
> **ATTB preflight**
> - JSON parse: PASS
> - Schema: 4
> - Exact ATTB catalog IDs checked: PASS
> - Unlock Plan/reference closure: PASS
> - Missing phase/final-bar skills from Unlock Plan: 0
> - Passive audit: PASS
> - Gear-stage refs: PASS
> - CP refs/final slots: PASS
> - Runtime ATTB validator: PASS
>
> [Download the JSON]

If the runtime validator was not available, replace the final line honestly rather than claiming PASS.

---


# 30. Quick command I can append to a future request

I may give you this file and then say:

> **Use the attached ATTB AI Build JSON Authoring Guide. Create a new ATTB build for me. Follow its intake, current-source verification, exact catalog-ID lookup, selective-passive rules, Reference Closure audit, and final preflight. Do not deliver the JSON until the missing Unlock Plan reference count is zero.**

Treat that instruction as the expected workflow.

---


# 30A. AI self-test before you claim you understand ATTB

An AI that has never touched ATTB should be able to answer all of these after reading this document:

1. What is the difference between CURRENT character state and TARGET build state?
2. Why is valid JSON not enough?
3. Where does an exact `catalog_skill_id` come from?
4. What is the difference between `unlock_order[].id` and `catalog_skill_id`?
5. What does `requires[]` point to?
6. Why must every phase/final-bar skill appear in the Unlock Plan?
7. Why should a build include some passives but not blindly all passives?
8. Why is the back bar unavailable before Level 15?
9. What are the three required CP trees?
10. What is the difference between a loadout and a variant?
11. Where do companion skills belong?
12. What should happen if the AI cannot access the current ATTB catalog?
13. What is Reference Closure?
14. What must the delivery preflight disclose if runtime validation was not run?

If you cannot answer those confidently, re-read the relevant sections before generating JSON.

---


# 31. Definition of done

The build is done when:

- it is the right ESO build for my requested use;
- all major build sections are present and coherent;
- important passives are included without wasting points on irrelevant ones;
- all catalog IDs were verified rather than guessed;
- all bar/ultimate/rotation references resolve into the Unlock Plan;
- all other cross-references resolve;
- gear and CP are valid and practical;
- companion setups, when used, are valid current companion data and remain separate from player skill IDs;
- JSON parses;
- current ATTB validation passes when available;
- no known avoidable ATTB warning is being handed to me;
- I receive an importable `.json` file and a concise preflight report.

**"It imports" is the minimum. "It imports cleanly and is a good ESO build" is the target.**
