# Arrow to the Build - ESO Skill Catalog Audit (Update 50)

> **Current app release:** ATTB 3.1.0. This file is a historical Update 50 catalog audit; older ATTB version numbers below are intentionally preserved as audit history.

Audit date: 2026-08-08  
Original audited app version: 2.0.0  
ESO live target: Update 50 / API 101050

> Historical audit note: this file records the 2.0-era Update 50 catalog audit. ATTB 2.1.0 adds a follow-up safety layer described below; the original audit results are intentionally preserved as release history.

> **Superseded for unlock timing:** ATTB 2.1.1 completed the full player-skill unlock sweep. The definitive current rank ledger is [`SKILL_UNLOCK_AUDIT_U50.md`](SKILL_UNLOCK_AUDIT_U50.md), generated from catalog `0.6.0-u50-full-unlock-audit`. This older document remains as historical audit context.

## v2.1 follow-up: passive purchase gates

The earlier audit corrected passive **maximum ranks**, but the Character Tracker regression later exposed a different problem: several bundled builds carried stale skill-line requirements for individual armor-passive purchases. ATTB 2.1 adds catalog `unlock_ranks` for every Light, Medium, and Heavy Armor passive and makes Suggested Next Picks use those verified per-point gates as a floor. Ordinary passives without catalog-verified point gates are held out of the immediate queue before their skill line reaches maximum rank. This favors a delayed suggestion over a false `AVAILABLE` claim.

The player skill catalog revision for this follow-up is `0.5.1-u50-rank-gates`.

## Why this audit happened

A live Dark Elf character exposed two connected defects around **Ashlander**:

- The ESO addon snapshot contained Ashlander, proving the character had it, but ESO reported the passive with `currentRank = 0` and no `passiveRank` / `passiveMaxRank` metadata.
- The desktop parser treated a passive rank of zero as "not owned," so Ashlander was displayed as unselected.
- The static catalog incorrectly listed Ashlander as a two-rank passive. It is a single-rank inherent racial passive.

The same API shape is used by several other granted / inherent one-rank passives, so this could not safely be fixed as an Ashlander-only exception.

## Audit scope

The generated catalog now contains **70 skill lines and 967 skills**. The pass covered the metadata ATTB actually consumes:

- skill existence and parent line
- active / ultimate / morph / passive / Scribing type
- current display names
- morph relationships
- passive maximum ranks
- skill-line unlock ranks where ATTB tracks them
- skill-point versus free / inherent / Class Mastery currency
- Update 49 / Update 50 structural moves and renames
- Scribing Grimoire placement under its real parent skill line

This is a structural/progression audit, not a reimplementation of every tooltip's combat formula or numeric damage/healing value; ATTB does not store those effect magnitudes in the skill catalog.

## Major corrections

### Racial and other inherent passives

- All ten racial starter passives are now one rank and free/inherent, including **Ashlander**.
- Light/Medium/Heavy Armor innate bonuses and penalties are represented as one-rank free/inherent entries where they exist.
- Vampire **Feed**, Werewolf **Insatiable Hunger**, Scrying **Scry**, Dark Brotherhood **Blade of Woe**, Thieves Guild **Finders Keepers**, and Emperor passives are marked as free/inherent where appropriate.
- Fighters Guild **Intimidating Presence**, **Skilled Tracker**, **Bounty Hunter**, and Mages Guild **Persuasive Will** were corrected to their actual one-rank caps.

### Passive-rank corrections

Examples found in the wider audit include:

- Dark Elf: Ashlander 1; Dynamic / Resist Flame / Ruination 3.
- Provisioning: **Recipe Quality 4** (the previous catalog had 6).
- Dark Brotherhood: **Padomaic Sprint 4**.
- Vampire: Dark Stalker 2, Strike from the Shadows 2, Undeath 2, Unnatural Movement 2, Blood Ritual 1.
- Werewolf Update 50: Master of the Chase 2, Blood Rage 2, Shadow of the Bloodmoon 1, Feral Cruelty 2, Call of the Hunt 2.
- Excavation: Keen Eye: Treasure Chests 2.

### Update 49 / Update 50 live changes

The catalog was brought forward for the major recent combat refreshes instead of preserving stale pre-refresh placement/name data:

- Dragonknight Update 49 skill moves, unlock ranks, and renamed abilities/passives.
- Nightblade current ability placements/unlock ranks where older catalog data still reflected previous line assignments.
- Werewolf Update 50 names and rank structure.
- All 35 live Update 50 Class Mastery passive names (five per class), using the **live** patch notes rather than earlier PTS names.
- Current names for other changed abilities such as Vinedusk Training, Crescent Sweep, Puncturing Sweep, Vibrant Shroud, Daedric Refuge, Summon Charged Atronach, Mages' Fury / Mages' Wrath, Grave Lord's Sacrifice, Enchanter Hireling, and Forager Hireling.

### Scribing structure

The old catalog could represent Grimoires twice: once in a synthetic Scribing line and again under native lines. The audit now keeps the permanent `scribing__...` catalog IDs but places each Grimoire under its real parent line:

- Weapon Grimoires under their weapon line at rank 25.
- Ulfsild's Contingency / Torchbearer / Trample under Mages Guild / Fighters Guild / Assault at rank 5.
- Banner Bearer under Support.
- Wield Soul / Soul Burst under Soul Magic.

There are now exactly **12 unique Scribing entries**, with no parallel duplicate Grimoire entries.

## Parser and live-sync hardening

This is the more important long-term fix.

### Rank-zero purchased passives

`src/main/addon/snapshotCodec.js` now treats the **presence** of a passive in the addon snapshot as ownership. The addon only serializes abilities ESO says are purchased/unlocked, so a passive with `currentRank = 0` and no rank metadata is interpreted as an owned one-rank passive instead of being dropped.

That fixes Ashlander and the same ESO API behavior for other inherent/granted passives.

### Live passive caps

The bridge payload now has an optional eighth ability field containing `passiveMaxRank`. The desktop parser exposes those caps as `addon_sync.live.skill_max_points`.

The renderer and character-to-build importer prefer the live cap when ESO supplies one, with the static catalog as fallback. This means future passive-rank changes are less likely to produce a bad counter even before the catalog is refreshed.

The bridge change is backward compatible with existing seven-column schema-2 snapshots.

## Build migration / bundled build cleanup

Catalog IDs remain the stable identity for build rows. Schema 4 normalization now refreshes catalog-backed placement/name/unlock metadata when ESO moves a skill while preserving the permanent skill ID.

All seven bundled builds were normalized against the audited catalog. Obsolete second purchases of the racial starter passive were removed, and current Dragonknight/Nightblade/Scribing metadata was migrated. The catalog integrity suite confirms every bundled build resolves against the current catalog.

## Validation results

Against the supplied live `ArrowToTheBuild` snapshot:

- **52 observed abilities matched the audited catalog: 52/52.**
- **30 passives supplied an ESO live `passiveMaxRank`; catalog mismatches: 0.**
- Ashlander now resolves to **allocation 1 / max 1**.
- Finders Keepers now resolves to an owned one-rank passive and is cataloged as free/inherent.

Targeted automated checks completed successfully:

- Catalog integrity / Update 50 regression checks: 12/12 pass.
- Addon parser and bridge compatibility checks: 17/17 pass.
- Build-editor skill checks: 5/5 pass.
- Targeted Schema 4 migration checks: 3/3 pass.
- Touched plain JS/MJS files pass `node --check`; the Python catalog generator passes `py_compile`.
- Catalog generation is deterministic; final regeneration produced the same SHA-256 (`66a045c2db03a9dee35784e3dacec3670e740d57e174f606772775c4baaab6e4`).

### Environment limitation

At the time of this historical audit, the complete repository `npm test` / Electron renderer suite could not be executed in the sandbox because the Electron test runtime was not installed. The sandbox package mirror also failed to provide `yocto-queue-0.1.0`. Those limitations describe the original audit environment only. For the current ATTB 3.1.0 release gate, follow [`RELEASE_CHECKLIST.md`](RELEASE_CHECKLIST.md) and run the full Electron/Vite/installer checks on the normal Windows release machine.

## Main files changed

- `tools/generate_skill_catalog.py`
- `resources/data/eso-skill-catalog.json`
- `resources/addon/ArrowToTheBuildBridge/Bridge.lua`
- `src/main/addon/snapshotCodec.js`
- `src/main/ipc/buildCharacterImport.js`
- `src/main/ipc/buildValidation.js`
- `src/renderer/utils/catalogLogic.mjs`
- `src/renderer/utils/buildEditorSkillLogic.mjs`
- `src/renderer/pages/SkillLinePage.jsx`
- `src/renderer/pages/StatusPage.jsx`
- all seven bundled build JSON files
- regression tests in `tests/catalogIntegrity.test.js`, `tests/addonParser.test.js`, `tests/catalogMigration.test.js`, and `tests/buildEditorSkills.test.js`

## Source hierarchy used

For recent refreshes, official ZeniMax live patch notes were treated as authoritative; current ESO-Hub / UESP skill pages were used to cross-check individual skill-line/rank facts and inherent grants.

Key sources:

- Official Update 50 Live Patch Notes: https://forums.elderscrollsonline.com/en/discussion/693682/update-50-live-patch-notes-all-platforms
- Official Update 49 Live Patch Notes: https://forums.elderscrollsonline.com/en/discussion/689473/update-49-live-patch-notes-all-platforms
- Official Update 42 / Gold Road Scribing notes: https://forums.elderscrollsonline.com/en/discussion/660750/playstation-patch-notes-v2-58-v1-40-gold-road-update-42
- ESO-Hub Ashlander: https://eso-hub.com/en/skills/racial/dark-elf-skills/ashlander
- ESO-Hub Recipe Quality: https://eso-hub.com/en/skills/craft/provisioning/recipe-quality
- ESO-Hub Werewolf: https://eso-hub.com/en/skills/world/werewolf
- ESO-Hub Heavy Armor: https://eso-hub.com/en/skills/armor/heavy-armor
- UESP Finders Keepers: https://en.uesp.net/wiki/Online:Finders_Keepers

## Version boundary

This audit targets **live Update 50**. Update 51 material that is still PTS/upcoming was deliberately not folded into the live catalog. When Update 51 reaches live, the same regression pass should be rerun against its final live patch notes and a fresh character snapshot.
