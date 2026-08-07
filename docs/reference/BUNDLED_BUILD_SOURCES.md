# Mighty Seven build research

The seven bundled JSON files are ATTB-authored **flexible PvE progression guides**, not verbatim copies of another creator's page. They combine current Update 50 pure-class skill direction with ATTB's own Level 1-50 unlock order, early and late ultimate guidance, temporary skills, prerequisites, Champion Point graph, gear stages, solo safety, and ordinary group-play considerations.

Verified: **2026-08-07** for **ESO Update 50**.

## Class-specific current references

- [Hyperioxes: Stamina Arcanist Solo Build](https://hyperioxes.com/eso/solo/stamina-arcanist-build)
- [Hyperioxes: Magicka Dragonknight Solo Build](https://hyperioxes.com/eso/solo/magicka-dragonknight-build)
- [Hyperioxes: Stamina Necromancer Solo Build](https://hyperioxes.com/eso/solo/stamina-necromancer-build)
- [Hyperioxes: Stamina Nightblade Solo Build](https://hyperioxes.com/eso/solo/stamina-nightblade-build)
- [Hyperioxes: Magicka Sorcerer Solo Build](https://hyperioxes.com/eso/solo/magicka-sorcerer-build)
- [Hyperioxes: Magicka Templar Solo Build](https://hyperioxes.com/eso/solo/magicka-templar-build)
- [Hyperioxes: Magicka Warden Solo Build](https://hyperioxes.com/eso/solo/magicka-warden-build)

Secondary cross-checks used where useful:

- [SkinnyCheeks: Magicka Templar U50](https://www.skinnycheeks.gg/magicka-templar-u50)
- [SkinnyCheeks: Arcanist Tests U50](https://www.skinnycheeks.gg/arcanist-tests-u50)
- [SkinnyCheeks: Flamethrower U50 Dragonknight](https://www.skinnycheeks.gg/flamethrower-u50)
- [SkinnyCheeks: Magicka Sorcerer U50](https://www.skinnycheeks.gg/magicka-sorcerer-u50)
- [Hyperioxes: Magicka Warden DPS Build](https://hyperioxes.com/eso/dps/magicka-warden-build)
- [AlcastHQ: Stamina Necromancer PvE Build](https://alcasthq.com/eso-stamina-necromancer-build-pve/)
- [ESO-Hub: Stamina Nightblade DD U50](https://eso-hub.com/en/builds/hagius/019e820f-291a-7199-9df3-1d531ca09dec/stamblade-dd-u50)

## Official system references

- [Update 50 live patch notes](https://forums.elderscrollsonline.com/en/discussion/693682/update-50-live-patch-notes-all-platforms)
- [Class Mastery](https://help.elderscrollsonline.com/app/answers/detail/a_id/74901/)
- [Subclassing system](https://help.elderscrollsonline.com/app/answers/detail/a_id/70950/)
- [Scribing](https://help.elderscrollsonline.com/app/answers/detail/a_id/65808/)
- [Champion System](https://help.elderscrollsonline.com/app/answers/detail/a_id/27053/)
- [Armory Station](https://help.elderscrollsonline.com/app/answers/detail/a_id/54606/)

## Editorial policy

- The default loadout is a strong, approachable pure-class damage setup intended to work in solo and ordinary group PvE rather than a narrow trial-dummy parse.
- Skill bars, Class Mastery choices, build identities, and endgame set directions are cross-checked against current build research.
- ATTB authors the progression order, explanatory text, starter gear, warnings, access notes, and loadout/variant structure.
- Every progression phase includes an attainable ultimate recommendation as soon as one is useful; the locked second bar remains empty before Level 15.
- Endgame gear is presented as a practical endpoint menu because penetration, movement, group buffs, DLC ownership, encounter length, and outside healing can change the best combination.
- PvP, tank, healer, trial-specialist, one-bar, and encounter-specific setups belong in additional Schema 4 loadouts or separate community builds rather than being falsely represented by the flexible PvE default.
- No third-party build prose or artwork is bundled.
- Each bundled JSON includes its own research-source records so an exported copy retains the references used to review it.
- The JSON remains human-readable and can be exported from the in-app Build Setup Guide as a starting point for community builds and the visual Build Editor.

## Frozen-release curated build audit

Full buildcraft audit: **2026-08-07**.

Before the 2.0 release, all seven bundled builds were re-reviewed one class at a time as actual ESO Update 50 progression builds rather than as merely schema-valid JSON. Current pure-class solo/flexible setups were cross-checked against mainstream current build research, with group-DPS material used as a sanity check so a narrow veteran-solo, trial-dummy, one-bar, PvP, or encounter-specific setup would not become the universal ATTB default.

The audit deliberately rejected a simple “buy every passive” rule. Passive ranks are now curated by the abilities, weapons, armor weights, and content the baseline actually uses; low-value ranks move later or become optional so players retain Skill Points for crafting and personal choices. `Medicinal Use` is the only crafting passive the bundled combat baselines intentionally recommend across all seven classes because it directly affects potion uptime.

The same review checked game semantics that JSON validation cannot prove. It corrected weapon-bar set counts, arena-weapon slot metadata, Scribing recipes, race defaults that came from specialized hard-solo assumptions, current Champion Point defaults, weapon elements, set acquisition metadata, and an invalid Warden leveling bar that had placed an Ultimate morph in a normal ability slot. Regression tests now protect the objective parts of those decisions, including starter five-piece uptime on both bars, hotbar skill types, exact mature Scribing references, arena-weapon slot validity, trial-set source sanity, and class-specific curated defaults.

### Curated default identities

| Class | Bundled baseline | Default race | Back bar |
|---|---|---|---|
| Arcanist | Stamina Flexible PvE | Dark Elf | Inferno Staff |
| Dragonknight | Magicka Flexible PvE | Dark Elf | Inferno Staff |
| Necromancer | Stamina Flexible PvE | Dark Elf | Inferno Staff |
| Nightblade | Stamina Flexible PvE | Khajiit | Ice Staff |
| Sorcerer | Magicka Flexible PvE | Dark Elf | Lightning Staff |
| Templar | Magicka Flexible PvE | Dark Elf | Ice Staff |
| Warden | Magicka Flexible PvE | Dark Elf | Ice Staff |

These are broad defaults, not restrictions. Each build explains meaningful race, gear, mastery, Champion Point, consumable, and content-specific alternatives where the current research supports them.
