# ESO Build-System Audit for ATTB Schema 4

> **Current app release:** ATTB 3.1.1. Historical v3.0.0 references below identify when the Schema 4 progression-scope work was introduced.
This audit was completed before declaring Schema 4 the public build format. Its purpose was not to copy another build editor. It was to confirm that an ATTB file can represent the character decisions current ESO builds depend on, while leaving safe expansion points for later game systems and the visual Build Editor.

## Research target

- Research date: 2026-08-06
- ATTB skill catalog: Update 50
- Public build format: ATTB Schema 4
- Compatibility goal: accept valid Schema 3 files, export Schema 4, and keep future Schema 4 additions optional whenever possible

Official ESO support and live patch information were treated as the primary source. Current Update 50 class and role indexes from Hyperioxes were used only as a broad comparison for the kinds of information community-authored builds commonly present; ATTB does not copy another creator's build text or artwork.

## Systems checked

### Character identity and basic setup

Builds commonly describe base class, race options, alliance relevance, role, primary resource, attributes, Mundus, weapons, armor weights, curse, food, potions, poisons, access requirements, and explanatory notes.

Schema 4 covers these through `metadata`, `defaults`, `transformations`, `consumables`, `requirements`, and `setup_help`. Recommended defaults remain separate from the character's recorded values inside ATTB.

### Build starting point and progression intent

ATTB builds are not always written for a fresh Level 1 character. A player may be rebuilding an existing Level 50 character or changing an established CP160+ character into a new role. Requiring artificial 1-49 phases in those files makes validation less accurate rather than more complete.

ATTB 3.0.0 therefore extends Schema 4 additively with optional `progression_scope`. `starting_point` is `new_character`, `level_50`, or `cp160_plus`, while `leveling_content_required` tells ATTB whether traditional leveling stages are expected. If the block is absent, ATTB preserves the original Schema 4 behavior (`new_character` + leveling required). This is intentionally backward-compatible and does not justify a Schema 5 bump.

### One-bar and two-bar setups

ESO unlocks the second weapon set at Level 15. Builds may intentionally use one bar, two bars, or different bars in different progression phases and loadouts. [Official weapon-slot support article](https://help.elderscrollsonline.com/app/answers/detail/a_id/41320/)

Schema 4 records `metadata.bar_count`, phase-specific front and back bars, five normal slots, a separate ultimate, weapon labels, lock notes, rotations, progression ranges, and loadout overrides.

### Skills, morphs, passives, ultimates, and progression

A useful progression guide needs more than a final bar. It needs skill-line ranks, base skills, morph prerequisites, passive ranks, temporary skills, final skills, individual Skill Point costs, and a purchase order.

Schema 4 retains stable catalog IDs, ordered `unlock_order`, prerequisites, ranks, status labels, phases, Skill Point costs, and complete line tracking. A display name can change without breaking saved progress because persistence uses stable IDs.

### Subclassing and mastered foreign lines

Official rules checked:

- Subclassing requires the account unlock reached through a Level 50 character.
- A character equips exactly three active class skill lines.
- At least one active line remains native to the base class.
- No more than one active line may come from each foreign class.
- An entire line is selected rather than individual abilities from several lines.
- A foreign line may be actively subclassed or already mastered.
- Foreign abilities and passives cost two Skill Points.
- Subclassing works with Armory builds.

Schema 4 represents this with `class_configuration.active_class_lines`, `source_class`, `mode`, and `skill_point_cost`. [Official Subclassing rules](https://help.elderscrollsonline.com/app/answers/detail/a_id/70950/) and [official Subclassing overview](https://help.elderscrollsonline.com/app/answers/detail/a_id/70629/)

### Class Mastery

Update 50 added one Class Mastery line per class. It is available after all three native class lines are mastered and is disabled while a foreign class line is active. The system currently grants two Class Mastery Points and five choices per class, but official documentation describes it as highly iterative.

Schema 4 stores whether mastery is active, the game-version-specific number of points available, selected passive IDs, prerequisites, and notes. The point count is data rather than a permanent schema maximum. [Official Class Mastery documentation](https://help.elderscrollsonline.com/app/answers/detail/a_id/74901/) and [Update 50 live patch notes](https://forums.elderscrollsonline.com/en/discussion/693682/update-50-live-patch-notes-all-platforms)

### Scribing

Official Scribing uses:

1. a Grimoire for the base behavior;
2. a Focus Script for the main function, final name, resource, and cost;
3. a Signature Script for a unique effect;
4. an Affix Script for a final benefit, commonly a Major or Minor buff or debuff.

Schema 4 can reference a Grimoire as a catalog skill or define an exact recipe in `scribed_skills` and reference it with `scribed_skill_id`. [Official Scribing documentation](https://help.elderscrollsonline.com/app/answers/detail/a_id/65808/)

### Champion Points

Champion Points are account-wide after unlock and can be earned up to 3,600 overall. They are spent in Craft, Warfare, and Fitness. Different characters may save different allocations through the Armory. [Official Champion System documentation](https://help.elderscrollsonline.com/app/answers/detail/a_id/27053/)

ATTB stores the three available budgets per character because it tracks character-specific setups. Schema 4 contains ordered routes, explicit connections, optional branches, jump thresholds, passive and slottable nodes, and the four final slots per tree.

### Equipment and item configuration

Build equipment may depend on armor slots and weights, weapon type on each bar, dual-wield hand, shield, sets, monster sets, mythics, arena weapons, perfected versions, traits, enchantments, poisons, active set counts, quality, sources, tradeability, DLC access, collection source, and alternatives.

Schema 4 records individual physical pieces and these acquisition details. Multiple gear stages and loadouts allow leveling, accessible starter, optimized, trash, boss, solo, group, and no-DLC configurations to coexist.

### Armory-style complete setups

The official Armory stores attributes, active and passive abilities, equipped items, Champion Points, Vampire or Werewolf curse, quickslots, and an outfit slot. [Official Armory documentation](https://help.elderscrollsonline.com/app/answers/detail/a_id/54606/)

Schema 4 uses named `loadouts` for complete gameplay setups and smaller `variants` for situational differences. Loadouts can override class lines, attributes, skills, bars, rotations, equipment, CP, transformations, consumables, quickslots, and other build sections.

Cosmetic outfit data is intentionally not a first-class combat field. A tool that needs it can store it under a namespaced `extensions` key without requiring a schema rewrite.

### Transformations, quickslots, companions, and consumables

Armory slots preserve Vampire or Werewolf status and quickslots. Companions can have their own equipment and selected abilities. [Official Armory documentation](https://help.elderscrollsonline.com/app/answers/detail/a_id/54606/), [official Quickslots documentation](https://help.elderscrollsonline.com/app/answers/detail/a_id/3887/), and [official Companions documentation](https://help.elderscrollsonline.com/app/answers/detail/a_id/53198/)

Schema 4 includes `transformations`, foods and drinks, potions, poisons, `quickslots`, and optional companion recommendations. Companion data is guidance rather than a second full player-character schema.

### Challenge Difficulty and PvP Veterancy

Update 50 added opt-in overland Challenge Difficulty and PvP Veterancy/Vengeance loadout systems. Challenge Difficulty changes the context in which a build is used rather than the character's ordinary combat loadout. Vengeance contains mode-specific loadout skill lines and perks. [Official Challenge Difficulty documentation](https://help.elderscrollsonline.com/app/answers/detail/a_id/74900/) and [Update 50 live patch notes](https://forums.elderscrollsonline.com/en/discussion/693682/update-50-live-patch-notes-all-platforms)

Schema 4 can describe these through metadata, content tags, difficulty tags, requirements, loadout conditions, loadout-specific skills, and namespaced `extensions`. No current ATTB field hardcodes the four present difficulty names or present Veterancy perks, so later seasonal changes do not force a breaking schema revision.

### Performance targets, sources, and future data

The format optionally includes responsibilities, important buffs and debuffs, stat or parse targets, rotation complexity, test environment, build requirements, and research sources.

`extensions` preserves namespaced information that ATTB does not understand yet. Root objects also permit additional optional properties. Stable public fields are still validated strictly where bad data would break tracking, persistence, or loadout application.

## Coverage conclusion

Schema 3 was strong for progression but assumed one primarily pure-class setup with a smaller variant layer. It did not explicitly model subclassing, Class Mastery availability, exact Scribing recipes, complete reusable loadouts, transformations, quickslots, companions, performance targets, source records, or safe namespaced future data.

Schema 4 closes those gaps while retaining the tested progression, gear, Champion Point, and variant foundations. ATTB 3.0.0 also demonstrates the intended additive-extension model with optional `progression_scope`, allowing established-character builds to omit irrelevant leveling history without changing the public schema number. Valid Schema 3 files are migrated during import. New public builds should use Schema 4. After public release, new fields should remain optional and backward-compatible whenever possible; a future schema number should be reserved for a genuinely breaking semantic change.

No static format can guarantee that ESO will never introduce an entirely new kind of build data. Schema 4 is designed so most additions can be represented through optional properties, loadout overrides, descriptive metadata, and namespaced extensions before a breaking change is considered.
