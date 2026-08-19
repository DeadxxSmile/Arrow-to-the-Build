# ESO Update 50 - Full Player Skill & Passive Unlock Audit

> **Current app release:** ATTB 3.0.0. This generated Update 50 ledger remains the current unlock-gate reference for the bundled player catalog.

**ATTB catalog:** `0.6.0-u50-full-unlock-audit`  
**Game baseline:** Update 50  
**Live patch baseline:** Update 50 Inc. 2  
**Verified:** 2026-08-09  

## Scope and source policy

This is the generated maintenance ledger for the complete ATTB **player** skill catalog. It covers every current catalog row: class skills and passives, weapons, armor, World, Guild, Alliance War, racial, crafting, Class Mastery, and Scribing Grimoires. Companion abilities are intentionally separate because ESO companions do not use the player skill-line/Skill Point progression model.

Source hierarchy used for this sweep:

1. **Current ESO-Hub live skill database** for skill-line rank and passive point-rank unlocks.
2. **ZeniMax Online Studios Update 50 / Inc. 2 live patch notes** to establish the current live-patch baseline and current renamed/reworked skills.
3. **APESO machine-readable skill table** as a secondary bulk cross-check. It is not allowed to override current ESO-Hub data when names/ranks disagree.

Important distinction: a morph has **two gates**. Its skill line must meet the family line-rank requirement, and the unmorphed ability must itself reach **Rank IV** before the morph can be chosen. ATTB now stores both facts.

## Coverage

- Catalog skill lines: **70**
- Catalog skill rows: **967**
- Ordinary Skill Point passives: **264**
- Ordinary passives missing per-point unlock gates: **0**
- Morph rows carrying the explicit base-ability Rank IV gate: **420 / 420**

## Sources

- **ESO-Hub live skill database** - Primary current skill-line/skill unlock source: https://eso-hub.com/en/skills
- **ZeniMax Online Studios live patch notes** - Defines the live Update 50 Inc. 2 patch baseline: https://forums.elderscrollsonline.com/en/discussion/696428/update-50-inc-2-live-patch-notes-all-platforms
- **APESO skill data table (cross-check only)** - Machine-readable cross-check only; current ESO-Hub data wins on disagreement: https://github.com/spencer2585/APESO/blob/main/Mod%20-%20old/Data/APESO_SkillData.lua

## Complete catalog ledger

### Curative Runeforms (`curative`)

**Category:** Class  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/arcanist/curative-runeforms

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `curative__vitalizing_glyphic` | Vitalizing Glyphic | Ultimate | skill_point | Line rank 12 |
| `curative__glyphic_of_the_tides` | Glyphic of the Tides | Morph | skill_point | Line rank 12; base ability Rank IV |
| `curative__resonating_glyphic` | Resonating Glyphic | Morph | skill_point | Line rank 12; base ability Rank IV |
| `curative__runemend` | Runemend | Active | skill_point | Line rank 1 |
| `curative__audacious_runemend` | Audacious Runemend | Morph | skill_point | Line rank 1; base ability Rank IV |
| `curative__evolving_runemend` | Evolving Runemend | Morph | skill_point | Line rank 1; base ability Rank IV |
| `curative__remedy_cascade` | Remedy Cascade | Active | skill_point | Line rank 4 |
| `curative__cascading_fortune` | Cascading Fortune | Morph | skill_point | Line rank 4; base ability Rank IV |
| `curative__curative_surge` | Curative Surge | Morph | skill_point | Line rank 4; base ability Rank IV |
| `curative__chakram_shields` | Chakram Shields | Active | skill_point | Line rank 20 |
| `curative__chakram_of_destiny` | Chakram of Destiny | Morph | skill_point | Line rank 20; base ability Rank IV |
| `curative__tidal_chakram` | Tidal Chakram | Morph | skill_point | Line rank 20; base ability Rank IV |
| `curative__arcanist_s_domain` | Arcanist's Domain | Active | skill_point | Line rank 30 |
| `curative__reconstructive_domain` | Reconstructive Domain | Morph | skill_point | Line rank 30; base ability Rank IV |
| `curative__zenas_empowering_disc` | Zenas' Empowering Disc | Morph | skill_point | Line rank 30; base ability Rank IV |
| `curative__apocryphal_gate` | Apocryphal Gate | Active | skill_point | Line rank 42 |
| `curative__fleet_footed_gate` | Fleet-Footed Gate | Morph | skill_point | Line rank 42; base ability Rank IV |
| `curative__passage_between_worlds` | Passage Between Worlds | Morph | skill_point | Line rank 42; base ability Rank IV |
| `curative__healing_tides` | Healing Tides | Passive | skill_point | Point 1: 8 / Point 2: 18 |
| `curative__intricate_runeforms` | Intricate Runeforms | Passive | skill_point | Point 1: 39 / Point 2: 50 |
| `curative__erudition` | Erudition | Passive | skill_point | Point 1: 22 / Point 2: 36 |
| `curative__hideous_clarity` | Hideous Clarity | Passive | skill_point | Point 1: 14 / Point 2: 27 |

### Herald of the Tome (`herald`)

**Category:** Class  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/arcanist/herald-of-the-tome

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `herald__the_unblinking_eye` | The Unblinking Eye | Ultimate | skill_point | Line rank 12 |
| `herald__the_languid_eye` | The Languid Eye | Morph | skill_point | Line rank 12; base ability Rank IV |
| `herald__the_tide_king_s_gaze` | The Tide King's Gaze | Morph | skill_point | Line rank 12; base ability Rank IV |
| `herald__runeblades` | Runeblades | Active | skill_point | Line rank 1 |
| `herald__escalating_runeblades` | Escalating Runeblades | Morph | skill_point | Line rank 1; base ability Rank IV |
| `herald__writhing_runeblades` | Writhing Runeblades | Morph | skill_point | Line rank 1; base ability Rank IV |
| `herald__fatecarver` | Fatecarver | Active | skill_point | Line rank 4 |
| `herald__exhausting_fatecarver` | Exhausting Fatecarver | Morph | skill_point | Line rank 4; base ability Rank IV |
| `herald__pragmatic_fatecarver` | Pragmatic Fatecarver | Morph | skill_point | Line rank 4; base ability Rank IV |
| `herald__abyssal_impact` | Abyssal Impact | Active | skill_point | Line rank 20 |
| `herald__cephaliarch_s_flail` | Cephaliarch's Flail | Morph | skill_point | Line rank 20; base ability Rank IV |
| `herald__tentacular_dread` | Tentacular Dread | Morph | skill_point | Line rank 20; base ability Rank IV |
| `herald__tome_bearer_s_inspiration` | Tome-Bearer's Inspiration | Active | skill_point | Line rank 30 |
| `herald__inspired_scholarship` | Inspired Scholarship | Morph | skill_point | Line rank 30; base ability Rank IV |
| `herald__recuperative_treatise` | Recuperative Treatise | Morph | skill_point | Line rank 30; base ability Rank IV |
| `herald__the_imperfect_ring` | The Imperfect Ring | Active | skill_point | Line rank 42 |
| `herald__fulminating_rune` | Fulminating Rune | Morph | skill_point | Line rank 42; base ability Rank IV |
| `herald__rune_of_displacement` | Rune of Displacement | Morph | skill_point | Line rank 42; base ability Rank IV |
| `herald__fated_fortune` | Fated Fortune | Passive | skill_point | Point 1: 8 / Point 2: 18 |
| `herald__splintered_secrets` | Splintered Secrets | Passive | skill_point | Point 1: 39 / Point 2: 50 |
| `herald__psychic_lesion` | Psychic Lesion | Passive | skill_point | Point 1: 22 / Point 2: 36 |
| `herald__harnessed_quintessence` | Harnessed Quintessence | Passive | skill_point | Point 1: 14 / Point 2: 27 |

### Soldier of Apocrypha (`soldier`)

**Category:** Class  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/arcanist/soldier-of-apocrypha

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `soldier__gibbering_shield` | Gibbering Shield | Ultimate | skill_point | Line rank 12 |
| `soldier__gibbering_shelter` | Gibbering Shelter | Morph | skill_point | Line rank 12; base ability Rank IV |
| `soldier__sanctum_of_the_abyssal_sea` | Sanctum of the Abyssal Sea | Morph | skill_point | Line rank 12; base ability Rank IV |
| `soldier__runic_jolt` | Runic Jolt | Active | skill_point | Line rank 1 |
| `soldier__runic_sunder` | Runic Sunder | Morph | skill_point | Line rank 1; base ability Rank IV |
| `soldier__runic_embrace` | Runic Embrace | Morph | skill_point | Line rank 1; base ability Rank IV |
| `soldier__runespite_ward` | Runespite Ward | Active | skill_point | Line rank 4 |
| `soldier__impervious_runeward` | Impervious Runeward | Morph | skill_point | Line rank 4; base ability Rank IV |
| `soldier__spiteward_of_the_lucid_mind` | Spiteward of the Lucid Mind | Morph | skill_point | Line rank 4; base ability Rank IV |
| `soldier__fatewoven_armor` | Fatewoven Armor | Active | skill_point | Line rank 20 |
| `soldier__cruxweaver_armor` | Cruxweaver Armor | Morph | skill_point | Line rank 20; base ability Rank IV |
| `soldier__unbreakable_fate` | Unbreakable Fate | Morph | skill_point | Line rank 20; base ability Rank IV |
| `soldier__runic_defense` | Runic Defense | Active | skill_point | Line rank 30 |
| `soldier__runeguard_of_freedom` | Runeguard of Freedom | Morph | skill_point | Line rank 30; base ability Rank IV |
| `soldier__runeguard_of_still_waters` | Runeguard of Still Waters | Morph | skill_point | Line rank 30; base ability Rank IV |
| `soldier__rune_of_eldritch_horror` | Rune of Eldritch Horror | Active | skill_point | Line rank 42 |
| `soldier__rune_of_uncanny_adoration` | Rune of Uncanny Adoration | Morph | skill_point | Line rank 42; base ability Rank IV |
| `soldier__rune_of_the_colorless_pool` | Rune of the Colorless Pool | Morph | skill_point | Line rank 42; base ability Rank IV |
| `soldier__implacable_outcome` | Implacable Outcome | Passive | skill_point | Point 1: 39 / Point 2: 50 |
| `soldier__circumvented_fate` | Circumvented Fate | Passive | skill_point | Point 1: 22 / Point 2: 36 |
| `soldier__wellspring_of_the_abyss` | Wellspring of the Abyss | Passive | skill_point | Point 1: 14 / Point 2: 27 |
| `soldier__aegis_of_the_unseen` | Aegis of the Unseen | Passive | skill_point | Point 1: 8 / Point 2: 18 |

### Arcanist Class Mastery (`arcanist_mastery`)

**Category:** Class  
**Max line rank:** 1  
**Current source:** https://eso-hub.com/en/skills/arcanist/arcanist-class-mastery

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `arcanist_mastery__ink_scribe_s_verve` | Ink-Scribe's Verve | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |
| `arcanist_mastery__erudite_s_rigor` | Erudite's Rigor | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |
| `arcanist_mastery__unbound_potential` | Unbound Potential | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |
| `arcanist_mastery__fate_realigned` | Fate Realigned | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |
| `arcanist_mastery__abyssal_emergence` | Abyssal Emergence | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |

### Aedric Spear (`aedric_spear`)

**Category:** Class  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/templar/aedric-spear

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `aedric_spear__radial_sweep` | Radial Sweep | Ultimate | skill_point | Line rank 12 |
| `aedric_spear__empowering_sweep` | Crescent Sweep | Morph | skill_point | Line rank 12; base ability Rank IV |
| `aedric_spear__everlasting_sweep` | Everlasting Sweep | Morph | skill_point | Line rank 12; base ability Rank IV |
| `aedric_spear__puncturing_strikes` | Puncturing Strikes | Active | skill_point | Line rank 1 |
| `aedric_spear__biting_jabs` | Biting Jabs | Morph | skill_point | Line rank 1; base ability Rank IV |
| `aedric_spear__puncturing_sweeps` | Puncturing Sweep | Morph | skill_point | Line rank 1; base ability Rank IV |
| `aedric_spear__piercing_javelin` | Piercing Javelin | Active | skill_point | Line rank 4 |
| `aedric_spear__aurora_javelin` | Aurora Javelin | Morph | skill_point | Line rank 4; base ability Rank IV |
| `aedric_spear__binding_javelin` | Binding Javelin | Morph | skill_point | Line rank 4; base ability Rank IV |
| `aedric_spear__focused_charge` | Focused Charge | Active | skill_point | Line rank 20 |
| `aedric_spear__explosive_charge` | Explosive Charge | Morph | skill_point | Line rank 20; base ability Rank IV |
| `aedric_spear__toppling_charge` | Toppling Charge | Morph | skill_point | Line rank 20; base ability Rank IV |
| `aedric_spear__spear_shards` | Spear Shards | Active | skill_point | Line rank 30 |
| `aedric_spear__blazing_spear` | Blazing Spear | Morph | skill_point | Line rank 30; base ability Rank IV |
| `aedric_spear__luminous_shards` | Luminous Shards | Morph | skill_point | Line rank 30; base ability Rank IV |
| `aedric_spear__sun_shield` | Sun Shield | Active | skill_point | Line rank 42 |
| `aedric_spear__blazing_shield` | Blazing Shield | Morph | skill_point | Line rank 42; base ability Rank IV |
| `aedric_spear__radiant_ward` | Radiant Ward | Morph | skill_point | Line rank 42; base ability Rank IV |
| `aedric_spear__piercing_spear` | Piercing Spear | Passive | skill_point | Point 1: 8 / Point 2: 18 |
| `aedric_spear__spear_wall` | Spear Wall | Passive | skill_point | Point 1: 14 / Point 2: 27 |
| `aedric_spear__burning_light` | Burning Light | Passive | skill_point | Point 1: 22 / Point 2: 36 |
| `aedric_spear__balanced_warrior` | Balanced Warrior | Passive | skill_point | Point 1: 39 / Point 2: 50 |

### Dawn’s Wrath (`dawns_wrath`)

**Category:** Class  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/templar/dawns-wrath

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `dawns_wrath__nova` | Nova | Ultimate | skill_point | Line rank 12 |
| `dawns_wrath__solar_prison` | Solar Prison | Morph | skill_point | Line rank 12; base ability Rank IV |
| `dawns_wrath__solar_disturbance` | Solar Disturbance | Morph | skill_point | Line rank 12; base ability Rank IV |
| `dawns_wrath__sun_fire` | Sun Fire | Active | skill_point | Line rank 1 |
| `dawns_wrath__reflective_light` | Reflective Light | Morph | skill_point | Line rank 1; base ability Rank IV |
| `dawns_wrath__vampire_s_bane` | Vampire's Bane | Morph | skill_point | Line rank 1; base ability Rank IV |
| `dawns_wrath__solar_flare` | Solar Flare | Active | skill_point | Line rank 4 |
| `dawns_wrath__dark_flare` | Dark Flare | Morph | skill_point | Line rank 4; base ability Rank IV |
| `dawns_wrath__solar_barrage` | Solar Barrage | Morph | skill_point | Line rank 4; base ability Rank IV |
| `dawns_wrath__backlash` | Backlash | Active | skill_point | Line rank 20 |
| `dawns_wrath__power_of_the_light` | Power of the Light | Morph | skill_point | Line rank 20; base ability Rank IV |
| `dawns_wrath__purifying_light` | Purifying Light | Morph | skill_point | Line rank 20; base ability Rank IV |
| `dawns_wrath__eclipse` | Eclipse | Active | skill_point | Line rank 30 |
| `dawns_wrath__unstable_core` | Unstable Core | Morph | skill_point | Line rank 30; base ability Rank IV |
| `dawns_wrath__living_dark` | Living Dark | Morph | skill_point | Line rank 30; base ability Rank IV |
| `dawns_wrath__radiant_destruction` | Radiant Destruction | Active | skill_point | Line rank 42 |
| `dawns_wrath__radiant_glory` | Radiant Glory | Morph | skill_point | Line rank 42; base ability Rank IV |
| `dawns_wrath__radiant_oppression` | Radiant Oppression | Morph | skill_point | Line rank 42; base ability Rank IV |
| `dawns_wrath__enduring_rays` | Enduring Rays | Passive | skill_point | Point 1: 8 / Point 2: 18 |
| `dawns_wrath__prism` | Prism | Passive | skill_point | Point 1: 14 / Point 2: 27 |
| `dawns_wrath__illuminate` | Illuminate | Passive | skill_point | Point 1: 22 / Point 2: 36 |
| `dawns_wrath__restoring_spirit` | Restoring Spirit | Passive | skill_point | Point 1: 39 / Point 2: 50 |

### Restoring Light (`restoring_light`)

**Category:** Class  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/templar/restoring-light

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `restoring_light__rite_of_passage` | Rite of Passage | Ultimate | skill_point | Line rank 12 |
| `restoring_light__practiced_incantation` | Practiced Incantation | Morph | skill_point | Line rank 12; base ability Rank IV |
| `restoring_light__remembrance` | Remembrance | Morph | skill_point | Line rank 12; base ability Rank IV |
| `restoring_light__rushed_ceremony` | Rushed Ceremony | Active | skill_point | Line rank 1 |
| `restoring_light__breath_of_life` | Breath of Life | Morph | skill_point | Line rank 1; base ability Rank IV |
| `restoring_light__honor_the_dead` | Honor the Dead | Morph | skill_point | Line rank 1; base ability Rank IV |
| `restoring_light__healing_ritual` | Healing Ritual | Active | skill_point | Line rank 4 |
| `restoring_light__hasty_prayer` | Hasty Prayer | Morph | skill_point | Line rank 4; base ability Rank IV |
| `restoring_light__ritual_of_rebirth` | Ritual of Rebirth | Morph | skill_point | Line rank 4; base ability Rank IV |
| `restoring_light__restoring_aura` | Restoring Aura | Active | skill_point | Line rank 20 |
| `restoring_light__radiant_aura` | Radiant Aura | Morph | skill_point | Line rank 20; base ability Rank IV |
| `restoring_light__repentance` | Repentance | Morph | skill_point | Line rank 20; base ability Rank IV |
| `restoring_light__cleansing_ritual` | Cleansing Ritual | Active | skill_point | Line rank 30 |
| `restoring_light__extended_ritual` | Extended Ritual | Morph | skill_point | Line rank 30; base ability Rank IV |
| `restoring_light__ritual_of_retribution` | Ritual of Retribution | Morph | skill_point | Line rank 30; base ability Rank IV |
| `restoring_light__rune_focus` | Rune Focus | Active | skill_point | Line rank 42 |
| `restoring_light__channeled_focus` | Channeled Focus | Morph | skill_point | Line rank 42; base ability Rank IV |
| `restoring_light__restoring_focus` | Restoring Focus | Morph | skill_point | Line rank 42; base ability Rank IV |
| `restoring_light__mending` | Mending | Passive | skill_point | Point 1: 8 / Point 2: 18 |
| `restoring_light__sacred_ground` | Sacred Ground | Passive | skill_point | Point 1: 14 / Point 2: 27 |
| `restoring_light__light_weaver` | Light Weaver | Passive | skill_point | Point 1: 22 / Point 2: 36 |
| `restoring_light__master_ritualist` | Master Ritualist | Passive | skill_point | Point 1: 39 / Point 2: 50 |

### Templar Class Mastery (`templar_mastery`)

**Category:** Class  
**Max line rank:** 1  
**Current source:** https://eso-hub.com/en/skills/templar/templar-class-mastery

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `templar_mastery__bright_harbinger` | Bright Harbinger | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |
| `templar_mastery__judgment_s_brand` | Judgment's Brand | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |
| `templar_mastery__divine_refuge` | Devout Guardian | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |
| `templar_mastery__sunlit_resolve` | Steadfast Candescence | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |
| `templar_mastery__sacred_purpose` | Bastion of Light | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |

### Ardent Flame (`ardent_flame`)

**Category:** Class  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/dragonknight/ardent-flame

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `ardent_flame__dragonknight_standard` | Dragonknight Standard | Ultimate | skill_point | Line rank 12 |
| `ardent_flame__lava_whip` | Lava Whip | Active | skill_point | Line rank 1 |
| `ardent_flame__searing_strike` | Searing Strike | Active | skill_point | Line rank 4 |
| `draconic_power__inhale` | Core of Flame | Active | skill_point | Line rank 20 |
| `earthen_heart__ash_cloud` | Hearthfire | Active | skill_point | Line rank 30 |
| `ardent_flame__inferno` | Inferno | Active | skill_point | Line rank 42 |
| `ardent_flame__flame_lash` | Flame Lash | Morph | skill_point | Line rank 1; base ability Rank IV |
| `ardent_flame__molten_whip` | Molten Whip | Morph | skill_point | Line rank 1; base ability Rank IV |
| `ardent_flame__burning_embers` | Burning Embers | Morph | skill_point | Line rank 4; base ability Rank IV |
| `ardent_flame__venomous_claw` | Searing Claw | Morph | skill_point | Line rank 4; base ability Rank IV |
| `ardent_flame__shifting_standard` | Shifting Standard | Morph | skill_point | Line rank 12; base ability Rank IV |
| `ardent_flame__standard_of_might` | Standard of Might | Morph | skill_point | Line rank 12; base ability Rank IV |
| `draconic_power__deep_breath` | Soul of Flame | Morph | skill_point | Line rank 20; base ability Rank IV |
| `draconic_power__draw_essence` | Heart of Flame | Morph | skill_point | Line rank 20; base ability Rank IV |
| `earthen_heart__cinder_storm` | Fire Keeper | Morph | skill_point | Line rank 30; base ability Rank IV |
| `earthen_heart__eruption` | Hearth and Home | Morph | skill_point | Line rank 30; base ability Rank IV |
| `ardent_flame__cauterize` | Cauterize | Morph | skill_point | Line rank 42; base ability Rank IV |
| `ardent_flame__flames_of_oblivion` | Incinerate | Morph | skill_point | Line rank 42; base ability Rank IV |
| `ardent_flame__a_soul_ablaze` | A Soul Ablaze | Passive | skill_point | Point 1: 39 / Point 2: 50 |
| `ardent_flame__combustion` | Combustion | Passive | skill_point | Point 1: 8 / Point 2: 18 |
| `ardent_flame__fan_the_flames` | Fan the Flames | Passive | skill_point | Point 1: 22 / Point 2: 36 |
| `ardent_flame__traumatic_burns` | Traumatic Burns | Passive | skill_point | Point 1: 14 / Point 2: 27 |

### Draconic Power (`draconic_power`)

**Category:** Class  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/dragonknight/draconic-power

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `draconic_power__dragon_leap` | Dragon Leap | Ultimate | skill_point | Line rank 12 |
| `ardent_flame__fiery_breath` | Dragonfire Breath | Active | skill_point | Line rank 1 |
| `draconic_power__dark_talons` | Dark Talons | Active | skill_point | Line rank 4 |
| `draconic_power__dragon_blood` | Dragon Blood | Active | skill_point | Line rank 20 |
| `draconic_power__protective_scale` | Wing Buffet | Active | skill_point | Line rank 30 |
| `ardent_flame__fiery_grip` | Chains of Flame | Active | skill_point | Line rank 42 |
| `ardent_flame__engulfing_flames` | Engulfing Dragonfire | Morph | skill_point | Line rank 1; base ability Rank IV |
| `ardent_flame__noxious_breath` | Disintegrating Dragonfire | Morph | skill_point | Line rank 1; base ability Rank IV |
| `draconic_power__burning_talons` | Burning Talons | Morph | skill_point | Line rank 4; base ability Rank IV |
| `draconic_power__choking_talons` | Choking Talons | Morph | skill_point | Line rank 4; base ability Rank IV |
| `draconic_power__ferocious_leap` | Ferocious Leap | Morph | skill_point | Line rank 12; base ability Rank IV |
| `draconic_power__take_flight` | Take Flight | Morph | skill_point | Line rank 12; base ability Rank IV |
| `draconic_power__coagulating_blood` | Blood of the Elder Dragon | Morph | skill_point | Line rank 20; base ability Rank IV |
| `draconic_power__green_dragon_blood` | Blood of the Green Dragon | Morph | skill_point | Line rank 20; base ability Rank IV |
| `draconic_power__dragon_fire_scale` | Protect the Brood | Morph | skill_point | Line rank 30; base ability Rank IV |
| `draconic_power__protective_plate` | Fleetstep Wings | Morph | skill_point | Line rank 30; base ability Rank IV |
| `ardent_flame__empowering_chains` | Chains of Devastation | Morph | skill_point | Line rank 42; base ability Rank IV |
| `ardent_flame__unrelenting_grip` | Chains of Domination | Morph | skill_point | Line rank 42; base ability Rank IV |
| `draconic_power__burning_heart` | World in Ruin | Passive | skill_point | Point 1: 14 / Point 2: 27 |
| `draconic_power__elder_dragon` | Elder Dragon | Passive | skill_point | Point 1: 22 / Point 2: 36 |
| `draconic_power__iron_skin` | Burnished Scales | Passive | skill_point | Point 1: 8 / Point 2: 18 |
| `draconic_power__scaled_armor` | The Storm Voice | Passive | skill_point | Point 1: 39 / Point 2: 50 |

### Earthen Heart (`earthen_heart`)

**Category:** Class  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/dragonknight/earthen-heart

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `earthen_heart__magma_armor` | Magma Armor | Ultimate | skill_point | Line rank 12 |
| `earthen_heart__stonefist` | Superheated Ward | Active | skill_point | Line rank 1 |
| `earthen_heart__molten_weapons` | Molten Weapons | Active | skill_point | Line rank 4 |
| `earthen_heart__obsidian_shield` | Obsidian Shield | Active | skill_point | Line rank 20 |
| `earthen_heart__petrify` | Petrify | Active | skill_point | Line rank 30 |
| `draconic_power__spiked_armor` | Earthspike Mantle | Active | skill_point | Line rank 42 |
| `earthen_heart__obsidian_shard` | Volcanic Ward | Morph | skill_point | Line rank 1; base ability Rank IV |
| `earthen_heart__stone_giant` | Magma Fist | Morph | skill_point | Line rank 1; base ability Rank IV |
| `earthen_heart__igneous_weapons` | Igneous Weapons | Morph | skill_point | Line rank 4; base ability Rank IV |
| `earthen_heart__molten_armaments` | Molten Armaments | Morph | skill_point | Line rank 4; base ability Rank IV |
| `earthen_heart__corrosive_armor` | Corrosive Armor | Morph | skill_point | Line rank 12; base ability Rank IV |
| `earthen_heart__magma_shell` | Magma Shell | Morph | skill_point | Line rank 12; base ability Rank IV |
| `earthen_heart__fragmented_shield` | Fragmented Shield | Morph | skill_point | Line rank 20; base ability Rank IV |
| `earthen_heart__igneous_shield` | Igneous Shield | Morph | skill_point | Line rank 20; base ability Rank IV |
| `earthen_heart__fossilize` | Fossilize | Morph | skill_point | Line rank 30; base ability Rank IV |
| `earthen_heart__shattering_rocks` | Shattering Rocks | Morph | skill_point | Line rank 30; base ability Rank IV |
| `draconic_power__hardened_armor` | Earthshield Mantle | Morph | skill_point | Line rank 42; base ability Rank IV |
| `draconic_power__volatile_armor` | Shatterspike Mantle | Morph | skill_point | Line rank 42; base ability Rank IV |
| `earthen_heart__battle_roar` | Landslide | Passive | skill_point | Point 1: 14 / Point 2: 27 |
| `earthen_heart__eternal_mountain` | Heart of Stone | Passive | skill_point | Point 1: 8 / Point 2: 18 |
| `earthen_heart__helping_hands` | Mountain Giant | Passive | skill_point | Point 1: 39 / Point 2: 50 |
| `earthen_heart__mountain_s_blessing` | Blessing at the Peak | Passive | skill_point | Point 1: 22 / Point 2: 36 |

### Dragonknight Class Mastery (`dragonknight_mastery`)

**Category:** Class  
**Max line rank:** 1  
**Current source:** https://eso-hub.com/en/skills/dragonknight/dragonknight-class-mastery

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `dragonknight_mastery__recursive_flame` | Inexorable Descent | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |
| `dragonknight_mastery__stone_blooded` | Wildfire Embers | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |
| `dragonknight_mastery__draconic_bulwark` | Resolute Defense | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |
| `dragonknight_mastery__molten_renewal` | Booming Voice | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |
| `dragonknight_mastery__unyielding_heart` | Lead From the Front | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |

### Dark Magic (`dark_magic`)

**Category:** Class  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/sorcerer/dark-magic

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `dark_magic__negate_magic` | Negate Magic | Ultimate | skill_point | Line rank 12 |
| `dark_magic__absorption_field` | Absorption Field | Morph | skill_point | Line rank 12; base ability Rank IV |
| `dark_magic__suppression_field` | Suppression Field | Morph | skill_point | Line rank 12; base ability Rank IV |
| `dark_magic__crystal_shard` | Crystal Shard | Active | skill_point | Line rank 1 |
| `dark_magic__crystal_fragments` | Crystal Fragments | Morph | skill_point | Line rank 1; base ability Rank IV |
| `dark_magic__crystal_weapon` | Crystal Weapon | Morph | skill_point | Line rank 1; base ability Rank IV |
| `dark_magic__encase` | Encase | Active | skill_point | Line rank 4 |
| `dark_magic__shattering_spines` | Shattering Spines | Morph | skill_point | Line rank 4; base ability Rank IV |
| `dark_magic__restraining_prison` | Vibrant Shroud | Morph | skill_point | Line rank 4; base ability Rank IV |
| `dark_magic__rune_prison` | Rune Prison | Active | skill_point | Line rank 20 |
| `dark_magic__defensive_rune` | Defensive Rune | Morph | skill_point | Line rank 20; base ability Rank IV |
| `dark_magic__rune_cage` | Rune Cage | Morph | skill_point | Line rank 20; base ability Rank IV |
| `dark_magic__dark_exchange` | Dark Exchange | Active | skill_point | Line rank 30 |
| `dark_magic__dark_conversion` | Dark Conversion | Morph | skill_point | Line rank 30; base ability Rank IV |
| `dark_magic__dark_deal` | Dark Deal | Morph | skill_point | Line rank 30; base ability Rank IV |
| `dark_magic__daedric_mines` | Daedric Mines | Active | skill_point | Line rank 42 |
| `dark_magic__daedric_tomb` | Daedric Tomb | Morph | skill_point | Line rank 42; base ability Rank IV |
| `dark_magic__daedric_minefield` | Daedric Refuge | Morph | skill_point | Line rank 42; base ability Rank IV |
| `dark_magic__unholy_knowledge` | Unholy Knowledge | Passive | skill_point | Point 1: 8 / Point 2: 18 |
| `dark_magic__blood_magic` | Blood Magic | Passive | skill_point | Point 1: 14 / Point 2: 27 |
| `dark_magic__persistence` | Persistence | Passive | skill_point | Point 1: 22 / Point 2: 36 |
| `dark_magic__exploitation` | Exploitation | Passive | skill_point | Point 1: 39 / Point 2: 50 |

### Daedric Summoning (`daedric_summoning`)

**Category:** Class  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/sorcerer/daedric-summoning

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `daedric_summoning__summon_storm_atronach` | Summon Storm Atronach | Ultimate | skill_point | Line rank 12 |
| `daedric_summoning__greater_storm_atronach` | Greater Storm Atronach | Morph | skill_point | Line rank 12; base ability Rank IV |
| `daedric_summoning__charged_atronach` | Summon Charged Atronach | Morph | skill_point | Line rank 12; base ability Rank IV |
| `daedric_summoning__summon_unstable_familiar` | Summon Unstable Familiar | Active | skill_point | Line rank 1 |
| `daedric_summoning__summon_unstable_clannfear` | Summon Unstable Clannfear | Morph | skill_point | Line rank 1; base ability Rank IV |
| `daedric_summoning__summon_volatile_familiar` | Summon Volatile Familiar | Morph | skill_point | Line rank 1; base ability Rank IV |
| `daedric_summoning__daedric_curse` | Daedric Curse | Active | skill_point | Line rank 4 |
| `daedric_summoning__haunting_curse` | Haunting Curse | Morph | skill_point | Line rank 4; base ability Rank IV |
| `daedric_summoning__daedric_prey` | Daedric Prey | Morph | skill_point | Line rank 4; base ability Rank IV |
| `daedric_summoning__summon_winged_twilight` | Summon Winged Twilight | Active | skill_point | Line rank 20 |
| `daedric_summoning__summon_twilight_tormentor` | Summon Twilight Tormentor | Morph | skill_point | Line rank 20; base ability Rank IV |
| `daedric_summoning__summon_twilight_matriarch` | Summon Twilight Matriarch | Morph | skill_point | Line rank 20; base ability Rank IV |
| `daedric_summoning__conjured_ward` | Conjured Ward | Active | skill_point | Line rank 30 |
| `daedric_summoning__hardened_ward` | Hardened Ward | Morph | skill_point | Line rank 30; base ability Rank IV |
| `daedric_summoning__regenerative_ward` | Regenerative Ward | Morph | skill_point | Line rank 30; base ability Rank IV |
| `daedric_summoning__bound_armor` | Bound Armor | Active | skill_point | Line rank 42 |
| `daedric_summoning__bound_aegis` | Bound Aegis | Morph | skill_point | Line rank 42; base ability Rank IV |
| `daedric_summoning__bound_armaments` | Bound Armaments | Morph | skill_point | Line rank 42; base ability Rank IV |
| `daedric_summoning__rebate` | Rebate | Passive | skill_point | Point 1: 8 / Point 2: 18 |
| `daedric_summoning__power_stone` | Power Stone | Passive | skill_point | Point 1: 14 / Point 2: 27 |
| `daedric_summoning__daedric_protection` | Daedric Protection | Passive | skill_point | Point 1: 22 / Point 2: 36 |
| `daedric_summoning__expert_summoner` | Expert Summoner | Passive | skill_point | Point 1: 39 / Point 2: 50 |

### Storm Calling (`storm_calling`)

**Category:** Class  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/sorcerer/storm-calling

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `storm_calling__overload` | Overload | Ultimate | skill_point | Line rank 12 |
| `storm_calling__energy_overload` | Energy Overload | Morph | skill_point | Line rank 12; base ability Rank IV |
| `storm_calling__power_overload` | Power Overload | Morph | skill_point | Line rank 12; base ability Rank IV |
| `storm_calling__mage_s_fury` | Mages' Fury | Active | skill_point | Line rank 1 |
| `storm_calling__endless_fury` | Endless Fury | Morph | skill_point | Line rank 1; base ability Rank IV |
| `storm_calling__mage_s_wrath` | Mages' Wrath | Morph | skill_point | Line rank 1; base ability Rank IV |
| `storm_calling__lightning_form` | Lightning Form | Active | skill_point | Line rank 4 |
| `storm_calling__boundless_storm` | Boundless Storm | Morph | skill_point | Line rank 4; base ability Rank IV |
| `storm_calling__hurricane` | Hurricane | Morph | skill_point | Line rank 4; base ability Rank IV |
| `storm_calling__lightning_splash` | Lightning Splash | Active | skill_point | Line rank 20 |
| `storm_calling__liquid_lightning` | Liquid Lightning | Morph | skill_point | Line rank 20; base ability Rank IV |
| `storm_calling__lightning_flood` | Lightning Flood | Morph | skill_point | Line rank 20; base ability Rank IV |
| `storm_calling__surge` | Surge | Active | skill_point | Line rank 30 |
| `storm_calling__critical_surge` | Critical Surge | Morph | skill_point | Line rank 30; base ability Rank IV |
| `storm_calling__power_surge` | Power Surge | Morph | skill_point | Line rank 30; base ability Rank IV |
| `storm_calling__bolt_escape` | Bolt Escape | Active | skill_point | Line rank 42 |
| `storm_calling__streak` | Streak | Morph | skill_point | Line rank 42; base ability Rank IV |
| `storm_calling__ball_of_lightning` | Ball of Lightning | Morph | skill_point | Line rank 42; base ability Rank IV |
| `storm_calling__capacitor` | Capacitor | Passive | skill_point | Point 1: 8 / Point 2: 18 |
| `storm_calling__energized` | Energized | Passive | skill_point | Point 1: 14 / Point 2: 27 |
| `storm_calling__amplitude` | Amplitude | Passive | skill_point | Point 1: 22 / Point 2: 36 |
| `storm_calling__expert_mage` | Expert Mage | Passive | skill_point | Point 1: 39 / Point 2: 50 |

### Sorcerer Class Mastery (`sorcerer_mastery`)

**Category:** Class  
**Max line rank:** 1  
**Current source:** https://eso-hub.com/en/skills/sorcerer/sorcerer-class-mastery

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `sorcerer_mastery__storm_lashed` | Static Reverberation | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |
| `sorcerer_mastery__daedric_reservoir` | Conservation of Energy | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |
| `sorcerer_mastery__arcane_momentum` | Calculated Defense | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |
| `sorcerer_mastery__voltaic_soul` | Font of Power | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |
| `sorcerer_mastery__conjurer_s_dominion` | Sphere of Influence | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |

### Assassination (`assassination`)

**Category:** Class  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/nightblade/assassination

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `assassination__death_stroke` | Death Stroke | Ultimate | skill_point | Line rank 12 |
| `shadow__veiled_strike` | Veiled Strike | Active | skill_point | Line rank 1 |
| `assassination__teleport_strike` | Teleport Strike | Active | skill_point | Line rank 4 |
| `assassination__assassin_s_blade` | Assassin's Blade | Active | skill_point | Line rank 20 |
| `assassination__mark_target` | Mark Target | Active | skill_point | Line rank 30 |
| `assassination__grim_focus` | Grim Focus | Active | skill_point | Line rank 42 |
| `shadow__concealed_weapon` | Concealed Weapon | Morph | skill_point | Line rank 1; base ability Rank IV |
| `shadow__surprise_attack` | Surprise Attack | Morph | skill_point | Line rank 1; base ability Rank IV |
| `assassination__ambush` | Ambush | Morph | skill_point | Line rank 4; base ability Rank IV |
| `assassination__lotus_fan` | Lotus Fan | Morph | skill_point | Line rank 4; base ability Rank IV |
| `assassination__incapacitating_strike` | Incapacitating Strike | Morph | skill_point | Line rank 12; base ability Rank IV |
| `assassination__soul_harvest` | Soul Harvest | Morph | skill_point | Line rank 12; base ability Rank IV |
| `assassination__impale` | Impale | Morph | skill_point | Line rank 20; base ability Rank IV |
| `assassination__killer_s_blade` | Killer’s Blade | Morph | skill_point | Line rank 20; base ability Rank IV |
| `assassination__piercing_mark` | Piercing Mark | Morph | skill_point | Line rank 30; base ability Rank IV |
| `assassination__reaper_s_mark` | Reaper's Mark | Morph | skill_point | Line rank 30; base ability Rank IV |
| `assassination__merciless_resolve` | Merciless Resolve | Morph | skill_point | Line rank 42; base ability Rank IV |
| `assassination__relentless_focus` | Relentless Focus | Morph | skill_point | Line rank 42; base ability Rank IV |
| `assassination__executioner` | Executioner | Passive | skill_point | Point 1: 14 / Point 2: 27 |
| `assassination__hemorrhage` | Hemorrhage | Passive | skill_point | Point 1: 39 / Point 2: 50 |
| `assassination__master_assassin` | Master Assassin | Passive | skill_point | Point 1: 8 / Point 2: 18 |
| `assassination__pressure_points` | Pressure Points | Passive | skill_point | Point 1: 22 / Point 2: 36 |

### Shadow (`shadow`)

**Category:** Class  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/nightblade/shadow

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `shadow__consuming_darkness` | Consuming Darkness | Ultimate | skill_point | Line rank 12 |
| `assassination__blur` | Blur | Active | skill_point | Line rank 1 |
| `shadow__shadow_cloak` | Shadow Cloak | Active | skill_point | Line rank 4 |
| `shadow__path_of_darkness` | Path of Darkness | Active | skill_point | Line rank 20 |
| `shadow__aspect_of_terror` | Aspect of Terror | Active | skill_point | Line rank 30 |
| `shadow__summon_shade` | Summon Shade | Active | skill_point | Line rank 42 |
| `assassination__mirage` | Mirage | Morph | skill_point | Line rank 1; base ability Rank IV |
| `assassination__phantasmal_escape` | Phantasmal Escape | Morph | skill_point | Line rank 1; base ability Rank IV |
| `shadow__dark_cloak` | Dark Cloak | Morph | skill_point | Line rank 4; base ability Rank IV |
| `shadow__shadowy_disguise` | Shadowy Disguise | Morph | skill_point | Line rank 4; base ability Rank IV |
| `shadow__bolstering_darkness` | Bolstering Darkness | Morph | skill_point | Line rank 12; base ability Rank IV |
| `shadow__veil_of_blades` | Veil of Blades | Morph | skill_point | Line rank 12; base ability Rank IV |
| `shadow__refreshing_path` | Refreshing Path | Morph | skill_point | Line rank 20; base ability Rank IV |
| `shadow__twisting_path` | Twisting Path | Morph | skill_point | Line rank 20; base ability Rank IV |
| `shadow__manifestation_of_terror` | Manifestation of Terror | Morph | skill_point | Line rank 30; base ability Rank IV |
| `shadow__mass_hysteria` | Mass Hysteria | Morph | skill_point | Line rank 30; base ability Rank IV |
| `shadow__dark_shade` | Dark Shade | Morph | skill_point | Line rank 42; base ability Rank IV |
| `shadow__shadow_image` | Shadow Image | Morph | skill_point | Line rank 42; base ability Rank IV |
| `shadow__dark_veil` | Dark Veil | Passive | skill_point | Point 1: 39 / Point 2: 50 |
| `shadow__dark_vigor` | Dark Vigor | Passive | skill_point | Point 1: 22 / Point 2: 36 |
| `shadow__refreshing_shadows` | Refreshing Shadows | Passive | skill_point | Point 1: 8 / Point 2: 18 |
| `shadow__shadow_barrier` | Shadow Barrier | Passive | skill_point | Point 1: 14 / Point 2: 27 |

### Siphoning (`siphoning`)

**Category:** Class  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/nightblade/siphoning

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `siphoning__soul_shred` | Soul Shred | Ultimate | skill_point | Line rank 12 |
| `siphoning__soul_siphon` | Soul Siphon | Morph | skill_point | Line rank 12; base ability Rank IV |
| `siphoning__soul_tether` | Soul Tether | Morph | skill_point | Line rank 12; base ability Rank IV |
| `siphoning__strife` | Strife | Active | skill_point | Line rank 1 |
| `siphoning__swallow_soul` | Swallow Soul | Morph | skill_point | Line rank 1; base ability Rank IV |
| `siphoning__funnel_health` | Funnel Health | Morph | skill_point | Line rank 1; base ability Rank IV |
| `siphoning__malevolent_offering` | Malevolent Offering | Active | skill_point | Line rank 4 |
| `siphoning__shrewd_offering` | Shrewd Offering | Morph | skill_point | Line rank 4; base ability Rank IV |
| `siphoning__healthy_offering` | Healthy Offering | Morph | skill_point | Line rank 4; base ability Rank IV |
| `siphoning__cripple` | Cripple | Active | skill_point | Line rank 20 |
| `siphoning__debilitate` | Debilitate | Morph | skill_point | Line rank 20; base ability Rank IV |
| `siphoning__crippling_grasp` | Crippling Grasp | Morph | skill_point | Line rank 20; base ability Rank IV |
| `siphoning__siphoning_strikes` | Siphoning Strikes | Active | skill_point | Line rank 30 |
| `siphoning__leeching_strikes` | Leeching Strikes | Morph | skill_point | Line rank 30; base ability Rank IV |
| `siphoning__siphoning_attacks` | Siphoning Attacks | Morph | skill_point | Line rank 30; base ability Rank IV |
| `siphoning__drain_power` | Drain Power | Active | skill_point | Line rank 42 |
| `siphoning__power_extraction` | Power Extraction | Morph | skill_point | Line rank 42; base ability Rank IV |
| `siphoning__sap_essence` | Sap Essence | Morph | skill_point | Line rank 42; base ability Rank IV |
| `siphoning__catalyst` | Catalyst | Passive | skill_point | Point 1: 8 / Point 2: 18 |
| `siphoning__magicka_flood` | Magicka Flood | Passive | skill_point | Point 1: 14 / Point 2: 27 |
| `siphoning__soul_siphoner` | Soul Siphoner | Passive | skill_point | Point 1: 22 / Point 2: 36 |
| `siphoning__transfer` | Transfer | Passive | skill_point | Point 1: 39 / Point 2: 50 |

### Nightblade Class Mastery (`nightblade_mastery`)

**Category:** Class  
**Max line rank:** 1  
**Current source:** https://eso-hub.com/en/skills/nightblade/nightblade-class-mastery

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `nightblade_mastery__critical_motivation` | An Eye for Exploitation | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |
| `nightblade_mastery__share_the_spoils` | Share the Spoils | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |
| `nightblade_mastery__nocturnal_guile` | Nocturnal Inspiration | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |
| `nightblade_mastery__bloodied_precision` | Above and Beyond | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |
| `nightblade_mastery__shadowed_intent` | Evasive Trance | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |

### Animal Companions (`animal_companions`)

**Category:** Class  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/warden/animal-companions

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `animal_companions__feral_guardian` | Feral Guardian | Ultimate | skill_point | Line rank 12 |
| `animal_companions__eternal_guardian` | Eternal Guardian | Morph | skill_point | Line rank 12; base ability Rank IV |
| `animal_companions__wild_guardian` | Wild Guardian | Morph | skill_point | Line rank 12; base ability Rank IV |
| `animal_companions__dive` | Dive | Active | skill_point | Line rank 1 |
| `animal_companions__cutting_dive` | Cutting Dive | Morph | skill_point | Line rank 1; base ability Rank IV |
| `animal_companions__screaming_cliff_racer` | Screaming Cliff Racer | Morph | skill_point | Line rank 1; base ability Rank IV |
| `animal_companions__scorch` | Scorch | Active | skill_point | Line rank 4 |
| `animal_companions__subterranean_assault` | Subterranean Assault | Morph | skill_point | Line rank 4; base ability Rank IV |
| `animal_companions__deep_fissure` | Deep Fissure | Morph | skill_point | Line rank 4; base ability Rank IV |
| `animal_companions__swarm` | Swarm | Active | skill_point | Line rank 20 |
| `animal_companions__growing_swarm` | Growing Swarm | Morph | skill_point | Line rank 20; base ability Rank IV |
| `animal_companions__fetcher_infection` | Fetcher Infection | Morph | skill_point | Line rank 20; base ability Rank IV |
| `animal_companions__betty_netch` | Betty Netch | Active | skill_point | Line rank 30 |
| `animal_companions__bull_netch` | Bull Netch | Morph | skill_point | Line rank 30; base ability Rank IV |
| `animal_companions__blue_betty` | Blue Betty | Morph | skill_point | Line rank 30; base ability Rank IV |
| `animal_companions__falcon_s_swiftness` | Falcon’s Swiftness | Active | skill_point | Line rank 42 |
| `animal_companions__deceptive_predator` | Deceptive Predator | Morph | skill_point | Line rank 42; base ability Rank IV |
| `animal_companions__bird_of_prey` | Bird of Prey | Morph | skill_point | Line rank 42; base ability Rank IV |
| `animal_companions__bond_with_nature` | Bond With Nature | Passive | skill_point | Point 1: 8 / Point 2: 18 |
| `animal_companions__savage_beast` | Savage Beast | Passive | skill_point | Point 1: 14 / Point 2: 27 |
| `animal_companions__flourish` | Flourish | Passive | skill_point | Point 1: 22 / Point 2: 36 |
| `animal_companions__advanced_species` | Advanced Species | Passive | skill_point | Point 1: 39 / Point 2: 50 |

### Green Balance (`green_balance`)

**Category:** Class  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/warden/green-balance

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `green_balance__secluded_grove` | Secluded Grove | Ultimate | skill_point | Line rank 12 |
| `green_balance__healing_thicket` | Healing Thicket | Morph | skill_point | Line rank 12; base ability Rank IV |
| `green_balance__enchanted_forest` | Enchanted Forest | Morph | skill_point | Line rank 12; base ability Rank IV |
| `green_balance__fungal_growth` | Fungal Growth | Active | skill_point | Line rank 1 |
| `green_balance__enchanted_growth` | Enchanted Growth | Morph | skill_point | Line rank 1; base ability Rank IV |
| `green_balance__soothing_spores` | Soothing Spores | Morph | skill_point | Line rank 1; base ability Rank IV |
| `green_balance__healing_seed` | Healing Seed | Active | skill_point | Line rank 4 |
| `green_balance__budding_seeds` | Budding Seeds | Morph | skill_point | Line rank 4; base ability Rank IV |
| `green_balance__corrupting_pollen` | Corrupting Pollen | Morph | skill_point | Line rank 4; base ability Rank IV |
| `green_balance__living_vines` | Living Vines | Active | skill_point | Line rank 20 |
| `green_balance__leeching_vines` | Leeching Vines | Morph | skill_point | Line rank 20; base ability Rank IV |
| `green_balance__living_trellis` | Living Trellis | Morph | skill_point | Line rank 20; base ability Rank IV |
| `green_balance__lotus_flower` | Lotus Flower | Active | skill_point | Line rank 30 |
| `green_balance__green_lotus` | Green Lotus | Morph | skill_point | Line rank 30; base ability Rank IV |
| `green_balance__lotus_blossom` | Lotus Blossom | Morph | skill_point | Line rank 30; base ability Rank IV |
| `green_balance__nature_s_grasp` | Nature’s Grasp | Active | skill_point | Line rank 42 |
| `green_balance__bursting_vines` | Bursting Vines | Morph | skill_point | Line rank 42; base ability Rank IV |
| `green_balance__nature_s_embrace` | Nature’s Embrace | Morph | skill_point | Line rank 42; base ability Rank IV |
| `green_balance__accelerated_growth` | Accelerated Growth | Passive | skill_point | Point 1: 8 / Point 2: 18 |
| `green_balance__nature_s_gift` | Nature’s Gift | Passive | skill_point | Point 1: 14 / Point 2: 27 |
| `green_balance__emerald_moss` | Emerald Moss | Passive | skill_point | Point 1: 22 / Point 2: 36 |
| `green_balance__maturation` | Maturation | Passive | skill_point | Point 1: 39 / Point 2: 50 |

### Winter’s Embrace (`winters_embrace`)

**Category:** Class  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/warden/winters-embrace

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `winters_embrace__sleet_storm` | Sleet Storm | Ultimate | skill_point | Line rank 12 |
| `winters_embrace__northern_storm` | Northern Storm | Morph | skill_point | Line rank 12; base ability Rank IV |
| `winters_embrace__permafrost` | Permafrost | Morph | skill_point | Line rank 12; base ability Rank IV |
| `winters_embrace__frost_cloak` | Frost Cloak | Active | skill_point | Line rank 1 |
| `winters_embrace__expansive_frost_cloak` | Expansive Frost Cloak | Morph | skill_point | Line rank 1; base ability Rank IV |
| `winters_embrace__ice_fortress` | Ice Fortress | Morph | skill_point | Line rank 1; base ability Rank IV |
| `winters_embrace__impaling_shards` | Impaling Shards | Active | skill_point | Line rank 4 |
| `winters_embrace__winter_s_revenge` | Winter’s Revenge | Morph | skill_point | Line rank 4; base ability Rank IV |
| `winters_embrace__gripping_shards` | Gripping Shards | Morph | skill_point | Line rank 4; base ability Rank IV |
| `winters_embrace__arctic_wind` | Arctic Wind | Active | skill_point | Line rank 20 |
| `winters_embrace__arctic_blast` | Arctic Blast | Morph | skill_point | Line rank 20; base ability Rank IV |
| `winters_embrace__polar_wind` | Polar Wind | Morph | skill_point | Line rank 20; base ability Rank IV |
| `winters_embrace__crystallized_shield` | Crystallized Shield | Active | skill_point | Line rank 30 |
| `winters_embrace__crystallized_slab` | Crystallized Slab | Morph | skill_point | Line rank 30; base ability Rank IV |
| `winters_embrace__shimmering_shield` | Shimmering Shield | Morph | skill_point | Line rank 30; base ability Rank IV |
| `winters_embrace__frozen_gate` | Frozen Gate | Active | skill_point | Line rank 42 |
| `winters_embrace__frozen_device` | Frozen Device | Morph | skill_point | Line rank 42; base ability Rank IV |
| `winters_embrace__frozen_retreat` | Frozen Retreat | Morph | skill_point | Line rank 42; base ability Rank IV |
| `winters_embrace__glacial_presence` | Glacial Presence | Passive | skill_point | Point 1: 8 / Point 2: 18 |
| `winters_embrace__frozen_armor` | Frozen Armor | Passive | skill_point | Point 1: 14 / Point 2: 27 |
| `winters_embrace__icy_aura` | Icy Aura | Passive | skill_point | Point 1: 22 / Point 2: 36 |
| `winters_embrace__piercing_cold` | Piercing Cold | Passive | skill_point | Point 1: 39 / Point 2: 50 |

### Warden Class Mastery (`warden_mastery`)

**Category:** Class  
**Max line rank:** 1  
**Current source:** https://eso-hub.com/en/skills/warden/warden-class-mastery

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `warden_mastery__green_keeper_s_hide` | Green-Keeper's Hide | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |
| `warden_mastery__bountiful_harvest` | Nature's Bounty | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |
| `warden_mastery__winter_s_dominion` | Glacial Obstinance | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |
| `warden_mastery__wild_communion` | Tundra's Maw | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |
| `warden_mastery__seasonal_strength` | Wild Adaptation | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |

### Grave Lord (`grave_lord`)

**Category:** Class  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/necromancer/grave-lord

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `grave_lord__frozen_colossus` | Frozen Colossus | Ultimate | skill_point | Line rank 12 |
| `grave_lord__pestilent_colossus` | Pestilent Colossus | Morph | skill_point | Line rank 12; base ability Rank IV |
| `grave_lord__glacial_colossus` | Glacial Colossus | Morph | skill_point | Line rank 12; base ability Rank IV |
| `grave_lord__flame_skull` | Flame Skull | Active | skill_point | Line rank 1 |
| `grave_lord__venom_skull` | Venom Skull | Morph | skill_point | Line rank 1; base ability Rank IV |
| `grave_lord__ricochet_skull` | Ricochet Skull | Morph | skill_point | Line rank 1; base ability Rank IV |
| `grave_lord__sacrificial_bones` | Sacrificial Bones | Active | skill_point | Line rank 4 |
| `grave_lord__blighted_blastbones` | Blighted Blastbones | Morph | skill_point | Line rank 4; base ability Rank IV |
| `grave_lord__stalking_blastbones` | Grave Lord's Sacrifice | Morph | skill_point | Line rank 4; base ability Rank IV |
| `grave_lord__boneyard` | Boneyard | Active | skill_point | Line rank 20 |
| `grave_lord__avid_boneyard` | Avid Boneyard | Morph | skill_point | Line rank 20; base ability Rank IV |
| `grave_lord__unnerving_boneyard` | Unnerving Boneyard | Morph | skill_point | Line rank 20; base ability Rank IV |
| `grave_lord__skeletal_mage` | Skeletal Mage | Active | skill_point | Line rank 30 |
| `grave_lord__skeletal_arcanist` | Skeletal Arcanist | Morph | skill_point | Line rank 30; base ability Rank IV |
| `grave_lord__archer` | Skeletal Archer | Morph | skill_point | Line rank 30; base ability Rank IV |
| `grave_lord__shocking_siphon` | Shocking Siphon | Active | skill_point | Line rank 42 |
| `grave_lord__detonating_siphon` | Detonating Siphon | Morph | skill_point | Line rank 42; base ability Rank IV |
| `grave_lord__mystic_siphon` | Mystic Siphon | Morph | skill_point | Line rank 42; base ability Rank IV |
| `grave_lord__reusable_parts` | Reusable Parts | Passive | skill_point | Point 1: 8 / Point 2: 18 |
| `grave_lord__death_knell` | Death Knell | Passive | skill_point | Point 1: 14 / Point 2: 27 |
| `grave_lord__dismember` | Dismember | Passive | skill_point | Point 1: 22 / Point 2: 36 |
| `grave_lord__rapid_rot` | Rapid Rot | Passive | skill_point | Point 1: 39 / Point 2: 50 |

### Bone Tyrant (`bone_tyrant`)

**Category:** Class  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/necromancer/bone-tyrant

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `bone_tyrant__bone_goliath_transformation` | Bone Goliath Transformation | Ultimate | skill_point | Line rank 12 |
| `bone_tyrant__pummeling_goliath` | Pummeling Goliath | Morph | skill_point | Line rank 12; base ability Rank IV |
| `bone_tyrant__ravenous_goliath` | Ravenous Goliath | Morph | skill_point | Line rank 12; base ability Rank IV |
| `bone_tyrant__death_scythe` | Death Scythe | Active | skill_point | Line rank 1 |
| `bone_tyrant__ruinous_scythe` | Ruinous Scythe | Morph | skill_point | Line rank 1; base ability Rank IV |
| `bone_tyrant__hungry_scythe` | Hungry Scythe | Morph | skill_point | Line rank 1; base ability Rank IV |
| `bone_tyrant__bone_armor` | Bone Armor | Active | skill_point | Line rank 4 |
| `bone_tyrant__beckoning_armor` | Beckoning Armor | Morph | skill_point | Line rank 4; base ability Rank IV |
| `bone_tyrant__summoner_s_armor` | Summoner’s Armor | Morph | skill_point | Line rank 4; base ability Rank IV |
| `bone_tyrant__bitter_harvest` | Bitter Harvest | Active | skill_point | Line rank 20 |
| `bone_tyrant__deaden_pain` | Deaden Pain | Morph | skill_point | Line rank 20; base ability Rank IV |
| `bone_tyrant__necrotic_potency` | Necrotic Potency | Morph | skill_point | Line rank 20; base ability Rank IV |
| `bone_tyrant__bone_totem` | Bone Totem | Active | skill_point | Line rank 30 |
| `bone_tyrant__agony_totem` | Agony Totem | Morph | skill_point | Line rank 30; base ability Rank IV |
| `bone_tyrant__remote_totem` | Remote Totem | Morph | skill_point | Line rank 30; base ability Rank IV |
| `bone_tyrant__grave_grasp` | Grave Grasp | Active | skill_point | Line rank 42 |
| `bone_tyrant__empowering_grasp` | Empowering Grasp | Morph | skill_point | Line rank 42; base ability Rank IV |
| `bone_tyrant__ghostly_embrace` | Ghostly Embrace | Morph | skill_point | Line rank 42; base ability Rank IV |
| `bone_tyrant__death_gleaning` | Death Gleaning | Passive | skill_point | Point 1: 8 / Point 2: 18 |
| `bone_tyrant__disdain_harm` | Disdain Harm | Passive | skill_point | Point 1: 14 / Point 2: 27 |
| `bone_tyrant__health_avarice` | Health Avarice | Passive | skill_point | Point 1: 22 / Point 2: 36 |
| `bone_tyrant__last_gasp` | Last Gasp | Passive | skill_point | Point 1: 39 / Point 2: 50 |

### Living Death (`living_death`)

**Category:** Class  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/necromancer/living-death

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `living_death__reanimate` | Reanimate | Ultimate | skill_point | Line rank 12 |
| `living_death__renewing_animation` | Renewing Animation | Morph | skill_point | Line rank 12; base ability Rank IV |
| `living_death__animate_blastbones` | Animate Blastbones | Morph | skill_point | Line rank 12; base ability Rank IV |
| `living_death__render_flesh` | Render Flesh | Active | skill_point | Line rank 1 |
| `living_death__resistant_flesh` | Resistant Flesh | Morph | skill_point | Line rank 1; base ability Rank IV |
| `living_death__blood_sacrifice` | Blood Sacrifice | Morph | skill_point | Line rank 1; base ability Rank IV |
| `living_death__expunge` | Expunge | Active | skill_point | Line rank 4 |
| `living_death__expunge_and_modify` | Expunge and Modify | Morph | skill_point | Line rank 4; base ability Rank IV |
| `living_death__hexproof` | Hexproof | Morph | skill_point | Line rank 4; base ability Rank IV |
| `living_death__life_amid_death` | Life amid Death | Active | skill_point | Line rank 20 |
| `living_death__enduring_undeath` | Enduring Undeath | Morph | skill_point | Line rank 20; base ability Rank IV |
| `living_death__renewing_undeath` | Renewing Undeath | Morph | skill_point | Line rank 20; base ability Rank IV |
| `living_death__spirit_mender` | Spirit Mender | Active | skill_point | Line rank 30 |
| `living_death__spirit_guardian` | Spirit Guardian | Morph | skill_point | Line rank 30; base ability Rank IV |
| `living_death__intensive_mender` | Intensive Mender | Morph | skill_point | Line rank 30; base ability Rank IV |
| `living_death__restoring_tether` | Restoring Tether | Active | skill_point | Line rank 42 |
| `living_death__braided_tether` | Braided Tether | Morph | skill_point | Line rank 42; base ability Rank IV |
| `living_death__mortal_coil` | Mortal Coil | Morph | skill_point | Line rank 42; base ability Rank IV |
| `living_death__curative_curse` | Curative Curse | Passive | skill_point | Point 1: 8 / Point 2: 18 |
| `living_death__near_death_experience` | Near-Death Experience | Passive | skill_point | Point 1: 14 / Point 2: 27 |
| `living_death__corpse_consumption` | Corpse Consumption | Passive | skill_point | Point 1: 22 / Point 2: 36 |
| `living_death__undead_confederate` | Undead Confederate | Passive | skill_point | Point 1: 39 / Point 2: 50 |

### Necromancer Class Mastery (`necromancer_mastery`)

**Category:** Class  
**Max line rank:** 1  
**Current source:** https://eso-hub.com/en/skills/necromancer/necromancer-class-mastery

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `necromancer_mastery__death_s_covenant` | Nothing Wasted | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |
| `necromancer_mastery__corpse_weaver` | Cycle Unending | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |
| `necromancer_mastery__grave_resolve` | Pound of Flesh | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |
| `necromancer_mastery__undying_purpose` | Veil's Forfeit | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |
| `necromancer_mastery__soul_collector` | Malevolent Promise | Passive | class_mastery_point | All 3 native class lines rank 50; Class Mastery choice |

### Two-Handed (`two_handed`)

**Category:** Weapon  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/weapon/two-handed

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `two_handed__berserker_strike` | Berserker Strike | Ultimate | skill_point | Line rank 50 |
| `two_handed__uppercut` | Uppercut | Active | skill_point | Line rank 2 |
| `two_handed__critical_charge` | Critical Charge | Active | skill_point | Line rank 4 |
| `two_handed__cleave` | Cleave | Active | skill_point | Line rank 14 |
| `two_handed__reverse_slash` | Reverse Slash | Active | skill_point | Line rank 20 |
| `two_handed__momentum` | Momentum | Active | skill_point | Line rank 38 |
| `two_handed__dizzying_swing` | Dizzying Swing | Morph | skill_point | Line rank 2; base ability Rank IV |
| `two_handed__wrecking_blow` | Wrecking Blow | Morph | skill_point | Line rank 2; base ability Rank IV |
| `two_handed__critical_rush` | Critical Rush | Morph | skill_point | Line rank 4; base ability Rank IV |
| `two_handed__stampede` | Stampede | Morph | skill_point | Line rank 4; base ability Rank IV |
| `two_handed__brawler` | Brawler | Morph | skill_point | Line rank 14; base ability Rank IV |
| `two_handed__carve` | Carve | Morph | skill_point | Line rank 14; base ability Rank IV |
| `two_handed__executioner` | Executioner | Morph | skill_point | Line rank 20; base ability Rank IV |
| `two_handed__reverse_slice` | Reverse Slice | Morph | skill_point | Line rank 20; base ability Rank IV |
| `two_handed__forward_momentum` | Forward Momentum | Morph | skill_point | Line rank 38; base ability Rank IV |
| `two_handed__rally` | Rally | Morph | skill_point | Line rank 38; base ability Rank IV |
| `two_handed__berserker_rage` | Berserker Rage | Morph | skill_point | Line rank 50; base ability Rank IV |
| `two_handed__onslaught` | Onslaught | Morph | skill_point | Line rank 50; base ability Rank IV |
| `two_handed__balanced_blade` | Balanced Blade | Passive | skill_point | Point 1: 17 / Point 2: 28 |
| `two_handed__battle_rush` | Battle Rush | Passive | skill_point | Point 1: 41 / Point 2: 50 |
| `two_handed__follow_up` | Follow Up | Passive | skill_point | Point 1: 30 / Point 2: 46 |
| `two_handed__forceful` | Forceful | Passive | skill_point | Point 1: 5 / Point 2: 34 |
| `two_handed__heavy_weapons` | Heavy Weapons | Passive | skill_point | Point 1: 10 / Point 2: 25 |
| `scribing__smash` | Smash | Scribing | none | Line rank 25 |

### One Hand and Shield (`one_hand_and_shield`)

**Category:** Weapon  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/weapon/one-hand-and-shield

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `one_hand_and_shield__shield_wall` | Shield Wall | Ultimate | skill_point | Line rank 50 |
| `one_hand_and_shield__puncture` | Puncture | Active | skill_point | Line rank 2 |
| `one_hand_and_shield__low_slash` | Low Slash | Active | skill_point | Line rank 4 |
| `one_hand_and_shield__defensive_posture` | Defensive Posture | Active | skill_point | Line rank 14 |
| `one_hand_and_shield__shield_charge` | Shield Charge | Active | skill_point | Line rank 20 |
| `one_hand_and_shield__power_bash` | Power Bash | Active | skill_point | Line rank 38 |
| `one_hand_and_shield__pierce_armor` | Pierce Armor | Morph | skill_point | Line rank 2; base ability Rank IV |
| `one_hand_and_shield__ransack` | Ransack | Morph | skill_point | Line rank 2; base ability Rank IV |
| `one_hand_and_shield__deep_slash` | Deep Slash | Morph | skill_point | Line rank 4; base ability Rank IV |
| `one_hand_and_shield__heroic_slash` | Heroic Slash | Morph | skill_point | Line rank 4; base ability Rank IV |
| `one_hand_and_shield__absorb_missile` | Absorb Missile | Morph | skill_point | Line rank 14; base ability Rank IV |
| `one_hand_and_shield__defensive_stance` | Defensive Stance | Morph | skill_point | Line rank 14; base ability Rank IV |
| `one_hand_and_shield__invasion` | Invasion | Morph | skill_point | Line rank 20; base ability Rank IV |
| `one_hand_and_shield__shielded_assault` | Shielded Assault | Morph | skill_point | Line rank 20; base ability Rank IV |
| `one_hand_and_shield__power_slam` | Power Slam | Morph | skill_point | Line rank 38; base ability Rank IV |
| `one_hand_and_shield__reverberating_bash` | Reverberating Bash | Morph | skill_point | Line rank 38; base ability Rank IV |
| `one_hand_and_shield__shield_discipline` | Shield Discipline | Morph | skill_point | Line rank 50; base ability Rank IV |
| `one_hand_and_shield__spell_wall` | Spell Wall | Morph | skill_point | Line rank 50; base ability Rank IV |
| `one_hand_and_shield__battlefield_mobility` | Battlefield Mobility | Passive | skill_point | Point 1: 41 / Point 2: 50 |
| `one_hand_and_shield__deadly_bash` | Deadly Bash | Passive | skill_point | Point 1: 17 / Point 2: 28 |
| `one_hand_and_shield__deflect_bolts` | Deflect Bolts | Passive | skill_point | Point 1: 30 / Point 2: 46 |
| `one_hand_and_shield__fortress` | Fortress | Passive | skill_point | Point 1: 5 / Point 2: 34 |
| `one_hand_and_shield__sword_and_board` | Sword and Board | Passive | skill_point | Point 1: 10 / Point 2: 25 |
| `scribing__shield_throw` | Shield Throw | Scribing | none | Line rank 25 |

### Dual Wield (`dual_wield`)

**Category:** Weapon  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/weapon/dual-wield

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `dual_wield__lacerate` | Lacerate | Ultimate | skill_point | Line rank 50 |
| `dual_wield__flurry` | Flurry | Active | skill_point | Line rank 2 |
| `dual_wield__twin_slashes` | Twin Slashes | Active | skill_point | Line rank 4 |
| `dual_wield__whirlwind` | Whirlwind | Active | skill_point | Line rank 14 |
| `dual_wield__blade_cloak` | Blade Cloak | Active | skill_point | Line rank 20 |
| `dual_wield__hidden_blade` | Hidden Blade | Active | skill_point | Line rank 38 |
| `dual_wield__bloodthirst` | Bloodthirst | Morph | skill_point | Line rank 2; base ability Rank IV |
| `dual_wield__rapid_strikes` | Rapid Strikes | Morph | skill_point | Line rank 2; base ability Rank IV |
| `dual_wield__blood_craze` | Blood Craze | Morph | skill_point | Line rank 4; base ability Rank IV |
| `dual_wield__rending_slashes` | Rending Slashes | Morph | skill_point | Line rank 4; base ability Rank IV |
| `dual_wield__steel_tornado` | Steel Tornado | Morph | skill_point | Line rank 14; base ability Rank IV |
| `dual_wield__whirling_blades` | Whirling Blades | Morph | skill_point | Line rank 14; base ability Rank IV |
| `dual_wield__deadly_cloak` | Deadly Cloak | Morph | skill_point | Line rank 20; base ability Rank IV |
| `dual_wield__quick_cloak` | Quick Cloak | Morph | skill_point | Line rank 20; base ability Rank IV |
| `dual_wield__flying_blade` | Flying Blade | Morph | skill_point | Line rank 38; base ability Rank IV |
| `dual_wield__shrouded_daggers` | Shrouded Daggers | Morph | skill_point | Line rank 38; base ability Rank IV |
| `dual_wield__rend` | Rend | Morph | skill_point | Line rank 50; base ability Rank IV |
| `dual_wield__thrive_in_chaos` | Thrive in Chaos | Morph | skill_point | Line rank 50; base ability Rank IV |
| `dual_wield__ambidextrous` | Ambidextrous | Passive | skill_point | Point 1: 10 / Point 2: 25 |
| `dual_wield__controlled_fury` | Controlled Fury | Passive | skill_point | Point 1: 17 / Point 2: 28 |
| `dual_wield__focused_killer` | Focused Killer | Passive | skill_point | Point 1: 5 / Point 2: 34 |
| `dual_wield__ruffian` | Ruffian | Passive | skill_point | Point 1: 30 / Point 2: 46 |
| `dual_wield__twin_blade_and_blunt` | Twin Blade and Blunt | Passive | skill_point | Point 1: 41 / Point 2: 50 |
| `scribing__traveling_knife` | Traveling Knife | Scribing | none | Line rank 25 |

### Bow (`bow`)

**Category:** Weapon  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/weapon/bow

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `bow__rapid_fire` | Rapid Fire | Ultimate | skill_point | Line rank 50 |
| `bow__snipe` | Snipe | Active | skill_point | Line rank 2 |
| `bow__volley` | Volley | Active | skill_point | Line rank 4 |
| `bow__scatter_shot` | Scatter Shot | Active | skill_point | Line rank 14 |
| `bow__arrow_spray` | Arrow Spray | Active | skill_point | Line rank 20 |
| `bow__poison_arrow` | Poison Arrow | Active | skill_point | Line rank 38 |
| `bow__focused_aim` | Focused Aim | Morph | skill_point | Line rank 2; base ability Rank IV |
| `bow__lethal_arrow` | Lethal Arrow | Morph | skill_point | Line rank 2; base ability Rank IV |
| `bow__arrow_barrage` | Arrow Barrage | Morph | skill_point | Line rank 4; base ability Rank IV |
| `bow__endless_hail` | Endless Hail | Morph | skill_point | Line rank 4; base ability Rank IV |
| `bow__draining_shot` | Draining Shot | Morph | skill_point | Line rank 14; base ability Rank IV |
| `bow__magnum_shot` | Magnum Shot | Morph | skill_point | Line rank 14; base ability Rank IV |
| `bow__acid_spray` | Acid Spray | Morph | skill_point | Line rank 20; base ability Rank IV |
| `bow__bombard` | Bombard | Morph | skill_point | Line rank 20; base ability Rank IV |
| `bow__poison_injection` | Poison Injection | Morph | skill_point | Line rank 38; base ability Rank IV |
| `bow__venom_arrow` | Venom Arrow | Morph | skill_point | Line rank 38; base ability Rank IV |
| `bow__ballista` | Ballista | Morph | skill_point | Line rank 50; base ability Rank IV |
| `bow__toxic_barrage` | Toxic Barrage | Morph | skill_point | Line rank 50; base ability Rank IV |
| `bow__accuracy` | Accuracy | Passive | skill_point | Point 1: 10 / Point 2: 25 |
| `bow__hasty_retreat` | Hasty Retreat | Passive | skill_point | Point 1: 41 / Point 2: 50 |
| `bow__hawk_eye` | Hawk Eye | Passive | skill_point | Point 1: 30 / Point 2: 46 |
| `bow__long_shots` | Vinedusk Training | Passive | skill_point | Point 1: 5 / Point 2: 34 |
| `bow__ranger` | Ranger | Passive | skill_point | Point 1: 17 / Point 2: 28 |
| `scribing__vault` | Vault | Scribing | none | Line rank 25 |

### Destruction Staff (`destruction_staff`)

**Category:** Weapon  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/weapon/destruction-staff

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `destruction_staff__elemental_storm` | Elemental Storm | Ultimate | skill_point | Line rank 50 |
| `destruction_staff__force_shock` | Force Shock | Active | skill_point | Line rank 2 |
| `destruction_staff__wall_of_elements` | Wall of Elements | Active | skill_point | Line rank 4 |
| `destruction_staff__destructive_touch` | Destructive Touch | Active | skill_point | Line rank 14 |
| `destruction_staff__weakness_to_elements` | Weakness to Elements | Active | skill_point | Line rank 20 |
| `destruction_staff__impulse` | Impulse | Active | skill_point | Line rank 38 |
| `destruction_staff__crushing_shock` | Crushing Shock | Morph | skill_point | Line rank 2; base ability Rank IV |
| `destruction_staff__force_pulse` | Force Pulse | Morph | skill_point | Line rank 2; base ability Rank IV |
| `destruction_staff__elemental_blockade` | Elemental Blockade | Morph | skill_point | Line rank 4; base ability Rank IV |
| `destruction_staff__unstable_wall_of_elements` | Unstable Wall of Elements | Morph | skill_point | Line rank 4; base ability Rank IV |
| `destruction_staff__destructive_clench` | Destructive Clench | Morph | skill_point | Line rank 14; base ability Rank IV |
| `destruction_staff__destructive_reach` | Destructive Reach | Morph | skill_point | Line rank 14; base ability Rank IV |
| `destruction_staff__elemental_drain` | Elemental Drain | Morph | skill_point | Line rank 20; base ability Rank IV |
| `destruction_staff__elemental_susceptibility` | Elemental Susceptibility | Morph | skill_point | Line rank 20; base ability Rank IV |
| `destruction_staff__elemental_ring` | Elemental Ring | Morph | skill_point | Line rank 38; base ability Rank IV |
| `destruction_staff__pulsar` | Pulsar | Morph | skill_point | Line rank 38; base ability Rank IV |
| `destruction_staff__elemental_rage` | Elemental Rage | Morph | skill_point | Line rank 50; base ability Rank IV |
| `destruction_staff__eye_of_the_storm` | Eye of the Storm | Morph | skill_point | Line rank 50; base ability Rank IV |
| `destruction_staff__ancient_knowledge` | Ancient Knowledge | Passive | skill_point | Point 1: 30 / Point 2: 46 |
| `destruction_staff__destruction_expert` | Destruction Expert | Passive | skill_point | Point 1: 41 / Point 2: 50 |
| `destruction_staff__elemental_force` | Elemental Force | Passive | skill_point | Point 1: 17 / Point 2: 28 |
| `destruction_staff__penetrating_magic` | Penetrating Magic | Passive | skill_point | Point 1: 10 / Point 2: 25 |
| `destruction_staff__tri_focus` | Tri Focus | Passive | skill_point | Point 1: 5 / Point 2: 34 |
| `scribing__elemental_explosion` | Elemental Explosion | Scribing | none | Line rank 25 |

### Restoration Staff (`restoration_staff`)

**Category:** Weapon  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/weapon/restoration-staff

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `restoration_staff__panacea` | Panacea | Ultimate | skill_point | Line rank 50 |
| `restoration_staff__grand_healing` | Grand Healing | Active | skill_point | Line rank 2 |
| `restoration_staff__regeneration` | Regeneration | Active | skill_point | Line rank 4 |
| `restoration_staff__blessing_of_protection` | Blessing of Protection | Active | skill_point | Line rank 14 |
| `restoration_staff__steadfast_ward` | Steadfast Ward | Active | skill_point | Line rank 20 |
| `restoration_staff__force_siphon` | Force Siphon | Active | skill_point | Line rank 38 |
| `restoration_staff__healing_springs` | Healing Springs | Morph | skill_point | Line rank 2; base ability Rank IV |
| `restoration_staff__illustrious_healing` | Illustrious Healing | Morph | skill_point | Line rank 2; base ability Rank IV |
| `restoration_staff__radiating_regeneration` | Radiating Regeneration | Morph | skill_point | Line rank 4; base ability Rank IV |
| `restoration_staff__rapid_regeneration` | Rapid Regeneration | Morph | skill_point | Line rank 4; base ability Rank IV |
| `restoration_staff__blessing_of_restoration` | Blessing of Restoration | Morph | skill_point | Line rank 14; base ability Rank IV |
| `restoration_staff__combat_prayer` | Combat Prayer | Morph | skill_point | Line rank 14; base ability Rank IV |
| `restoration_staff__healing_ward` | Healing Ward | Morph | skill_point | Line rank 20; base ability Rank IV |
| `restoration_staff__ward_ally` | Ward Ally | Morph | skill_point | Line rank 20; base ability Rank IV |
| `restoration_staff__quick_siphon` | Quick Siphon | Morph | skill_point | Line rank 38; base ability Rank IV |
| `restoration_staff__siphon_spirit` | Siphon Spirit | Morph | skill_point | Line rank 38; base ability Rank IV |
| `restoration_staff__life_giver` | Life Giver | Morph | skill_point | Line rank 50; base ability Rank IV |
| `restoration_staff__light_s_champion` | Light’s Champion | Morph | skill_point | Line rank 50; base ability Rank IV |
| `restoration_staff__absorb` | Absorb | Passive | skill_point | Point 1: 30 / Point 2: 46 |
| `restoration_staff__cycle_of_life` | Cycle of Life | Passive | skill_point | Point 1: 17 / Point 2: 28 |
| `restoration_staff__essence_drain` | Essence Drain | Passive | skill_point | Point 1: 5 / Point 2: 34 |
| `restoration_staff__restoration_expert` | Restoration Expert | Passive | skill_point | Point 1: 10 / Point 2: 25 |
| `restoration_staff__restoration_master` | Restoration Master | Passive | skill_point | Point 1: 41 / Point 2: 50 |
| `scribing__mender_s_bond` | Mender's Bond | Scribing | none | Line rank 25 |

### Light Armor (`light_armor`)

**Category:** Armor  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/armor/light-armor

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `light_armor__light_armor_bonuses` | Light Armor Bonuses | Passive | none | System/condition based |
| `light_armor__light_armor_penalties` | Light Armor Penalties | Passive | none | System/condition based |
| `light_armor__annulment` | Annulment | Active | skill_point | Line rank 22 |
| `light_armor__dampen_magic` | Dampen Magic | Morph | skill_point | Line rank 22; base ability Rank IV |
| `light_armor__harness_magicka` | Harness Magicka | Morph | skill_point | Line rank 22; base ability Rank IV |
| `light_armor__grace` | Grace | Passive | skill_point | Point 1: 2 / Point 2: 10 / Point 3: 30 |
| `light_armor__evocation` | Evocation | Passive | skill_point | Point 1: 6 / Point 2: 18 |
| `light_armor__spell_warding` | Spell Warding | Passive | skill_point | Point 1: 14 / Point 2: 34 |
| `light_armor__prodigy` | Prodigy | Passive | skill_point | Point 1: 38 / Point 2: 46 |
| `light_armor__concentration` | Concentration | Passive | skill_point | Point 1: 42 / Point 2: 50 |

### Medium Armor (`medium_armor`)

**Category:** Armor  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/armor/medium-armor

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `medium_armor__medium_armor_bonuses` | Medium Armor Bonuses | Passive | none | System/condition based |
| `medium_armor__evasion` | Evasion | Active | skill_point | Line rank 22 |
| `medium_armor__elude` | Elude | Morph | skill_point | Line rank 22; base ability Rank IV |
| `medium_armor__shuffle` | Shuffle | Morph | skill_point | Line rank 22; base ability Rank IV |
| `medium_armor__dexterity` | Dexterity | Passive | skill_point | Point 1: 2 / Point 2: 10 / Point 3: 30 |
| `medium_armor__wind_walker` | Wind Walker | Passive | skill_point | Point 1: 6 / Point 2: 18 |
| `medium_armor__improved_sneak` | Improved Sneak | Passive | skill_point | Point 1: 14 / Point 2: 34 |
| `medium_armor__agility` | Agility | Passive | skill_point | Point 1: 38 / Point 2: 46 |
| `medium_armor__athletics` | Athletics | Passive | skill_point | Point 1: 42 / Point 2: 50 |

### Heavy Armor (`heavy_armor`)

**Category:** Armor  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/armor/heavy-armor

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `heavy_armor__heavy_armor_bonuses` | Heavy Armor Bonuses | Passive | none | System/condition based |
| `heavy_armor__heavy_armor_penalties` | Heavy Armor Penalties | Passive | none | System/condition based |
| `heavy_armor__immovable` | Unstoppable | Active | skill_point | Line rank 22 |
| `heavy_armor__immovable_brute` | Unstoppable Brute | Morph | skill_point | Line rank 22; base ability Rank IV |
| `heavy_armor__unstoppable` | Immovable | Morph | skill_point | Line rank 22; base ability Rank IV |
| `heavy_armor__resolve` | Resolve | Passive | skill_point | Point 1: 2 / Point 2: 10 / Point 3: 30 |
| `heavy_armor__constitution` | Constitution | Passive | skill_point | Point 1: 6 / Point 2: 18 |
| `heavy_armor__juggernaut` | Juggernaut | Passive | skill_point | Point 1: 14 / Point 2: 34 |
| `heavy_armor__revitalize` | Revitalize | Passive | skill_point | Point 1: 38 / Point 2: 46 |
| `heavy_armor__rapid_mending` | Rapid Mending | Passive | skill_point | Point 1: 42 / Point 2: 50 |

### Soul Magic (`soul_magic`)

**Category:** World  
**Max line rank:** 6  
**Current source:** https://eso-hub.com/en/skills/world/soul-magic

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `soul_magic__soul_strike` | Soul Strike | Ultimate | skill_point | Line rank 6 |
| `soul_magic__soul_trap` | Soul Trap | Active | skill_point | Line rank 1 |
| `soul_magic__consuming_trap` | Consuming Trap | Morph | skill_point | Line rank 1; base ability Rank IV |
| `soul_magic__soul_splitting_trap` | Soul Splitting Trap | Morph | skill_point | Line rank 1; base ability Rank IV |
| `soul_magic__shatter_soul` | Shatter Soul | Morph | skill_point | Line rank 6; base ability Rank IV |
| `soul_magic__soul_assault` | Soul Assault | Morph | skill_point | Line rank 6; base ability Rank IV |
| `soul_magic__soul_lock` | Soul Lock | Passive | skill_point | Point 1: 3 / Point 2: 5 |
| `soul_magic__soul_shatter` | Soul Shatter | Passive | skill_point | Point 1: 2 / Point 2: 4 |
| `soul_magic__soul_summons` | Soul Summons | Passive | skill_point | Point 1: 2 / Point 2: 3 |
| `scribing__soul_burst` | Soul Burst | Scribing | none | Scribing/Scholarium system access; no parent-line rank gate |
| `scribing__wield_soul` | Wield Soul | Scribing | none | Scribing/Scholarium system access; no parent-line rank gate |

### Vampire (`vampire`)

**Category:** World  
**Max line rank:** 10  
**Current source:** https://eso-hub.com/en/skills/world/vampire

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `vampire__blood_scion` | Blood Scion | Ultimate | skill_point | Line rank 5 |
| `vampire__swarming_scion` | Swarming Scion | Morph | skill_point | Line rank 5; base ability Rank IV |
| `vampire__perfect_scion` | Perfect Scion | Morph | skill_point | Line rank 5; base ability Rank IV |
| `vampire__eviscerate` | Eviscerate | Active | skill_point | Line rank 1 |
| `vampire__blood_for_blood` | Blood for Blood | Morph | skill_point | Line rank 1; base ability Rank IV |
| `vampire__arterial_burst` | Arterial Burst | Morph | skill_point | Line rank 1; base ability Rank IV |
| `vampire__blood_frenzy` | Blood Frenzy | Active | skill_point | Line rank 2 |
| `vampire__simmering_frenzy` | Simmering Frenzy | Morph | skill_point | Line rank 2; base ability Rank IV |
| `vampire__sated_fury` | Sated Fury | Morph | skill_point | Line rank 2; base ability Rank IV |
| `vampire__vampiric_drain` | Vampiric Drain | Active | skill_point | Line rank 4 |
| `vampire__exhilarating_drain` | Exhilarating Drain | Morph | skill_point | Line rank 4; base ability Rank IV |
| `vampire__drain_vigor` | Drain Vigor | Morph | skill_point | Line rank 4; base ability Rank IV |
| `vampire__mesmerize` | Mesmerize | Active | skill_point | Line rank 6 |
| `vampire__hypnosis` | Hypnosis | Morph | skill_point | Line rank 6; base ability Rank IV |
| `vampire__stupefy` | Stupefy | Morph | skill_point | Line rank 6; base ability Rank IV |
| `vampire__mist_form` | Mist Form | Active | skill_point | Line rank 9 |
| `vampire__elusive_mist` | Elusive Mist | Morph | skill_point | Line rank 9; base ability Rank IV |
| `vampire__blood_mist` | Blood Mist | Morph | skill_point | Line rank 9; base ability Rank IV |
| `vampire__feed` | Feed | Passive | none | Line rank 1 |
| `vampire__dark_stalker` | Dark Stalker | Passive | skill_point | Point 1: 3 / Point 2: 7 |
| `vampire__strike_from_the_shadows` | Strike from the Shadows | Passive | skill_point | Point 1: 4 / Point 2: 8 |
| `vampire__undeath` | Undeath | Passive | skill_point | Point 1: 6 / Point 2: 9 |
| `vampire__unnatural_movement` | Unnatural Movement | Passive | skill_point | Point 1: 7 / Point 2: 10 |
| `vampire__blood_ritual` | Blood Ritual | Passive | skill_point | Point 1: 6 |

### Werewolf (`werewolf`)

**Category:** World  
**Max line rank:** 10  
**Current source:** https://eso-hub.com/en/skills/world/werewolf

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `werewolf__werewolf_transformation` | Werewolf Transformation | Ultimate | skill_point | Line rank 1 |
| `werewolf__pack_leader` | Pack Leader | Morph | skill_point | Line rank 1; base ability Rank IV |
| `werewolf__werewolf_berserker` | Werewolf Berserker | Morph | skill_point | Line rank 1; base ability Rank IV |
| `werewolf__pounce` | Pounce | Active | skill_point | Line rank 2 |
| `werewolf__brutal_pounce` | Brutal Pounce | Morph | skill_point | Line rank 2; base ability Rank IV |
| `werewolf__feral_pounce` | Feral Pounce | Morph | skill_point | Line rank 2; base ability Rank IV |
| `werewolf__hircine_s_bounty` | Hircine’s Bounty | Active | skill_point | Line rank 4 |
| `werewolf__hircine_s_fortitude` | Hircine’s Fortitude | Morph | skill_point | Line rank 4; base ability Rank IV |
| `werewolf__hircine_s_rage` | Hircine’s Rage | Morph | skill_point | Line rank 4; base ability Rank IV |
| `werewolf__roar` | Roar | Active | skill_point | Line rank 5 |
| `werewolf__ferocious_roar` | Ferocious Roar | Morph | skill_point | Line rank 5; base ability Rank IV |
| `werewolf__deafening_roar` | Deafening Roar | Morph | skill_point | Line rank 5; base ability Rank IV |
| `werewolf__piercing_howl` | Gnash | Active | skill_point | Line rank 6 |
| `werewolf__howl_of_despair` | Rip and Tear | Morph | skill_point | Line rank 6; base ability Rank IV |
| `werewolf__howl_of_agony` | Bloody Gnash | Morph | skill_point | Line rank 6; base ability Rank IV |
| `werewolf__infectious_claws` | Rending Claws | Active | skill_point | Line rank 9 |
| `werewolf__claws_of_life` | Bloodclaws | Morph | skill_point | Line rank 9; base ability Rank IV |
| `werewolf__claws_of_anguish` | Claw Fury | Morph | skill_point | Line rank 9; base ability Rank IV |
| `werewolf__devour` | Insatiable Hunger | Passive | none | Line rank 1 |
| `werewolf__pursuit` | Master of the Chase | Passive | skill_point | Point 1: 3 / Point 2: 7 |
| `werewolf__blood_rage` | Blood Rage | Passive | skill_point | Point 1: 4 / Point 2: 8 |
| `werewolf__bloodmoon` | Shadow of the Bloodmoon | Passive | skill_point | Point 1: 6 |
| `werewolf__savage_strength` | Feral Cruelty | Passive | skill_point | Point 1: 6 / Point 2: 9 |
| `werewolf__call_of_the_pack` | Call of the Hunt | Passive | skill_point | Point 1: 7 / Point 2: 10 |

### Legerdemain (`legerdemain`)

**Category:** World  
**Max line rank:** 20  
**Current source:** https://eso-hub.com/en/skills/world/legerdemain

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `legerdemain__improved_hiding` | Improved Hiding | Passive | skill_point | Point 1: 1 / Point 2: 6 / Point 3: 11 / Point 4: 16 |
| `legerdemain__light_fingers` | Light Fingers | Passive | skill_point | Point 1: 2 / Point 2: 7 / Point 3: 12 / Point 4: 17 |
| `legerdemain__trafficker` | Trafficker | Passive | skill_point | Point 1: 3 / Point 2: 8 / Point 3: 13 / Point 4: 18 |
| `legerdemain__locksmith` | Locksmith | Passive | skill_point | Point 1: 5 / Point 2: 9 / Point 3: 14 / Point 4: 19 |
| `legerdemain__kickback` | Kickback | Passive | skill_point | Point 1: 6 / Point 2: 10 / Point 3: 15 / Point 4: 20 |

### Scrying (`scrying`)

**Category:** World  
**Max line rank:** 10  
**Current source:** https://eso-hub.com/en/skills/world/scrying

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `scrying__scry` | Scry | Passive | none | Line rank 1 |
| `scrying__antiquarian_insight` | Antiquarian Insight | Passive | skill_point | Point 1: 1 / Point 2: 3 / Point 3: 5 / Point 4: 7 / Point 5: 10 |
| `scrying__scrier_s_patience` | Scrier’s Patience | Passive | skill_point | Point 1: 2 / Point 2: 5 |
| `scrying__coalescence` | Coalescence | Passive | skill_point | Point 1: 2 / Point 2: 6 |
| `scrying__future_focus` | Future Focus | Passive | skill_point | Point 1: 4 / Point 2: 8 |
| `scrying__dilation` | Dilation | Passive | skill_point | Point 1: 4 / Point 2: 8 |
| `scrying__farsight` | Farsight | Passive | skill_point | Point 1: 6 / Point 2: 9 |
| `scrying__preemptive_power` | Preemptive Power | Passive | skill_point | Point 1: 9 |

### Excavation (`excavation`)

**Category:** World  
**Max line rank:** 10  
**Current source:** https://eso-hub.com/en/skills/world/excavation

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `excavation__hand_brush` | Hand Brush | Passive | skill_point | Point 1: 1 / Point 2: 6 |
| `excavation__augur` | Augur | Passive | skill_point | Point 1: 1 / Point 2: 5 |
| `excavation__trowel` | Trowel | Passive | skill_point | Point 1: 2 / Point 2: 7 |
| `excavation__keen_eye_dig_sites` | Keen Eye: Dig Sites | Passive | skill_point | Point 1: 2 / Point 2: 4 |
| `excavation__keen_eye_treasure_chests` | Keen Eye: Treasure Chests | Passive | skill_point | Point 1: 7 / Point 2: 9 |
| `excavation__excavator_s_reserves` | Excavator’s Reserves | Passive | skill_point | Point 1: 3 / Point 2: 10 |
| `excavation__heavy_shovel` | Heavy Shovel | Passive | skill_point | Point 1: 4 / Point 2: 8 |

### Fighters Guild (`fighters_guild`)

**Category:** Guild  
**Max line rank:** 10  
**Current source:** https://eso-hub.com/en/skills/guild/fighters-guild

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `fighters_guild__dawnbreaker` | Dawnbreaker | Ultimate | skill_point | Line rank 10 |
| `fighters_guild__silver_bolts` | Silver Bolts | Active | skill_point | Line rank 2 |
| `fighters_guild__circle_of_protection` | Circle of Protection | Active | skill_point | Line rank 4 |
| `fighters_guild__expert_hunter` | Expert Hunter | Active | skill_point | Line rank 6 |
| `fighters_guild__trap_beast` | Trap Beast | Active | skill_point | Line rank 8 |
| `fighters_guild__silver_leash` | Silver Leash | Morph | skill_point | Line rank 2; base ability Rank IV |
| `fighters_guild__silver_shards` | Silver Shards | Morph | skill_point | Line rank 2; base ability Rank IV |
| `fighters_guild__ring_of_preservation` | Ring of Preservation | Morph | skill_point | Line rank 4; base ability Rank IV |
| `fighters_guild__turn_evil` | Turn Evil | Morph | skill_point | Line rank 4; base ability Rank IV |
| `fighters_guild__camouflaged_hunter` | Camouflaged Hunter | Morph | skill_point | Line rank 6; base ability Rank IV |
| `fighters_guild__evil_hunter` | Evil Hunter | Morph | skill_point | Line rank 6; base ability Rank IV |
| `fighters_guild__barbed_trap` | Barbed Trap | Morph | skill_point | Line rank 8; base ability Rank IV |
| `fighters_guild__lightweight_beast_trap` | Lightweight Beast Trap | Morph | skill_point | Line rank 8; base ability Rank IV |
| `fighters_guild__dawnbreaker_of_smiting` | Dawnbreaker of Smiting | Morph | skill_point | Line rank 10; base ability Rank IV |
| `fighters_guild__flawless_dawnbreaker` | Flawless Dawnbreaker | Morph | skill_point | Line rank 10; base ability Rank IV |
| `fighters_guild__banish_the_wicked` | Banish the Wicked | Passive | skill_point | Point 1: 5 / Point 2: 9 / Point 3: 10 |
| `fighters_guild__bounty_hunter` | Bounty Hunter | Passive | skill_point | Point 1: 9 |
| `fighters_guild__intimidating_presence` | Intimidating Presence | Passive | skill_point | Point 1: 1 |
| `fighters_guild__skilled_tracker` | Skilled Tracker | Passive | skill_point | Point 1: 7 |
| `fighters_guild__slayer` | Slayer | Passive | skill_point | Point 1: 3 / Point 2: 6 / Point 3: 7 |
| `scribing__torchbearer` | Torchbearer | Scribing | none | Line rank 5 |

### Mages Guild (`mages_guild`)

**Category:** Guild  
**Max line rank:** 10  
**Current source:** https://eso-hub.com/en/skills/guild/mages-guild

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `mages_guild__meteor` | Meteor | Ultimate | skill_point | Line rank 10 |
| `mages_guild__magelight` | Magelight | Active | skill_point | Line rank 2 |
| `mages_guild__entropy` | Entropy | Active | skill_point | Line rank 4 |
| `mages_guild__fire_rune` | Fire Rune | Active | skill_point | Line rank 6 |
| `mages_guild__equilibrium` | Equilibrium | Active | skill_point | Line rank 8 |
| `mages_guild__inner_light` | Inner Light | Morph | skill_point | Line rank 2; base ability Rank IV |
| `mages_guild__radiant_magelight` | Radiant Magelight | Morph | skill_point | Line rank 2; base ability Rank IV |
| `mages_guild__degeneration` | Degeneration | Morph | skill_point | Line rank 4; base ability Rank IV |
| `mages_guild__structured_entropy` | Structured Entropy | Morph | skill_point | Line rank 4; base ability Rank IV |
| `mages_guild__scalding_rune` | Scalding Rune | Morph | skill_point | Line rank 6; base ability Rank IV |
| `mages_guild__volcanic_rune` | Volcanic Rune | Morph | skill_point | Line rank 6; base ability Rank IV |
| `mages_guild__balance` | Balance | Morph | skill_point | Line rank 8; base ability Rank IV |
| `mages_guild__spell_symmetry` | Spell Symmetry | Morph | skill_point | Line rank 8; base ability Rank IV |
| `mages_guild__ice_comet` | Ice Comet | Morph | skill_point | Line rank 10; base ability Rank IV |
| `mages_guild__shooting_star` | Shooting Star | Morph | skill_point | Line rank 10; base ability Rank IV |
| `mages_guild__everlasting_magic` | Everlasting Magic | Passive | skill_point | Point 1: 5 / Point 2: 7 |
| `mages_guild__mage_adept` | Mage Adept | Passive | skill_point | Point 1: 3 / Point 2: 5 |
| `mages_guild__magicka_controller` | Magicka Controller | Passive | skill_point | Point 1: 7 / Point 2: 9 |
| `mages_guild__might_of_the_guild` | Might of the Guild | Passive | skill_point | Point 1: 9 / Point 2: 10 |
| `mages_guild__persuasive_will` | Persuasive Will | Passive | skill_point | Point 1: 1 |
| `scribing__ulfsild_s_contingency` | Ulfsild's Contingency | Scribing | none | Line rank 5 |

### Undaunted (`undaunted`)

**Category:** Guild  
**Max line rank:** 9  
**Current source:** https://eso-hub.com/en/skills/guild/undaunted

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `undaunted__blood_altar` | Blood Altar | Active | skill_point | Line rank 1 |
| `undaunted__overflowing_altar` | Overflowing Altar | Morph | skill_point | Line rank 1; base ability Rank IV |
| `undaunted__sanguine_altar` | Sanguine Altar | Morph | skill_point | Line rank 1; base ability Rank IV |
| `undaunted__trapping_webs` | Trapping Webs | Active | skill_point | Line rank 2 |
| `undaunted__shadow_silk` | Shadow Silk | Morph | skill_point | Line rank 2; base ability Rank IV |
| `undaunted__tangling_webs` | Tangling Webs | Morph | skill_point | Line rank 2; base ability Rank IV |
| `undaunted__inner_fire` | Inner Fire | Active | skill_point | Line rank 3 |
| `undaunted__inner_beast` | Inner Beast | Morph | skill_point | Line rank 3; base ability Rank IV |
| `undaunted__inner_rage` | Inner Rage | Morph | skill_point | Line rank 3; base ability Rank IV |
| `undaunted__bone_shield` | Bone Shield | Active | skill_point | Line rank 4 |
| `undaunted__spiked_bone_shield` | Spiked Bone Shield | Morph | skill_point | Line rank 4; base ability Rank IV |
| `undaunted__bone_surge` | Bone Surge | Morph | skill_point | Line rank 4; base ability Rank IV |
| `undaunted__necrotic_orb` | Necrotic Orb | Active | skill_point | Line rank 5 |
| `undaunted__mystic_orb` | Mystic Orb | Morph | skill_point | Line rank 5; base ability Rank IV |
| `undaunted__energy_orb` | Energy Orb | Morph | skill_point | Line rank 5; base ability Rank IV |
| `undaunted__undaunted_command` | Undaunted Command | Passive | skill_point | Point 1: 6 / Point 2: 8 |
| `undaunted__undaunted_mettle` | Undaunted Mettle | Passive | skill_point | Point 1: 7 / Point 2: 9 |

### Psijic Order (`psijic_order`)

**Category:** Guild  
**Max line rank:** 10  
**Current source:** https://eso-hub.com/en/skills/guild/psijic-order

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `psijic_order__undo` | Undo | Ultimate | skill_point | Line rank 10 |
| `psijic_order__precognition` | Precognition | Morph | skill_point | Line rank 10; base ability Rank IV |
| `psijic_order__temporal_guard` | Temporal Guard | Morph | skill_point | Line rank 10; base ability Rank IV |
| `psijic_order__time_stop` | Time Stop | Active | skill_point | Line rank 2 |
| `psijic_order__time_freeze` | Time Freeze | Morph | skill_point | Line rank 2; base ability Rank IV |
| `psijic_order__borrowed_time` | Borrowed Time | Morph | skill_point | Line rank 2; base ability Rank IV |
| `psijic_order__imbue_weapon` | Imbue Weapon | Active | skill_point | Line rank 3 |
| `psijic_order__crushing_weapon` | Crushing Weapon | Morph | skill_point | Line rank 3; base ability Rank IV |
| `psijic_order__elemental_weapon` | Elemental Weapon | Morph | skill_point | Line rank 3; base ability Rank IV |
| `psijic_order__accelerate` | Accelerate | Active | skill_point | Line rank 5 |
| `psijic_order__race_against_time` | Race Against Time | Morph | skill_point | Line rank 5; base ability Rank IV |
| `psijic_order__channeled_acceleration` | Channeled Acceleration | Morph | skill_point | Line rank 5; base ability Rank IV |
| `psijic_order__mend_wounds` | Mend Wounds | Active | skill_point | Line rank 6 |
| `psijic_order__symbiosis` | Symbiosis | Morph | skill_point | Line rank 6; base ability Rank IV |
| `psijic_order__mend_spirit` | Mend Spirit | Morph | skill_point | Line rank 6; base ability Rank IV |
| `psijic_order__meditate` | Meditate | Active | skill_point | Line rank 8 |
| `psijic_order__introspection` | Introspection | Morph | skill_point | Line rank 8; base ability Rank IV |
| `psijic_order__deep_thoughts` | Deep Thoughts | Morph | skill_point | Line rank 8; base ability Rank IV |
| `psijic_order__see_the_unseen` | See the Unseen | Passive | none | Line rank 1 |
| `psijic_order__clairvoyance` | Clairvoyance | Passive | skill_point | Point 1: 3 / Point 2: 5 |
| `psijic_order__spell_orb` | Spell Orb | Passive | skill_point | Point 1: 4 / Point 2: 7 |
| `psijic_order__deliberation` | Deliberation | Passive | skill_point | Point 1: 9 |
| `psijic_order__concentrated_barrier` | Concentrated Barrier | Passive | skill_point | Point 1: 6 / Point 2: 8 |

### Thieves Guild (`thieves_guild`)

**Category:** Guild  
**Max line rank:** 12  
**Current source:** https://eso-hub.com/en/skills/guild/thieves-guild

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `thieves_guild__finders_keepers` | Finders Keepers | Passive | none | Line rank 1 |
| `thieves_guild__swiftly_forgotten` | Swiftly Forgotten | Passive | skill_point | Point 1: 2 / Point 2: 5 / Point 3: 8 / Point 4: 11 |
| `thieves_guild__haggling` | Haggling | Passive | skill_point | Point 1: 3 / Point 2: 6 / Point 3: 9 / Point 4: 12 |
| `thieves_guild__clemency` | Clemency | Passive | skill_point | Point 1: 4 |
| `thieves_guild__timely_escape` | Timely Escape | Passive | skill_point | Point 1: 7 |
| `thieves_guild__veil_of_shadows` | Veil of Shadows | Passive | skill_point | Point 1: 10 |

### Dark Brotherhood (`dark_brotherhood`)

**Category:** Guild  
**Max line rank:** 12  
**Current source:** https://eso-hub.com/en/skills/guild/dark-brotherhood

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `dark_brotherhood__blade_of_woe` | Blade of Woe | Passive | none | Line rank 1 |
| `dark_brotherhood__scales_of_pitiless_justice` | Scales of Pitiless Justice | Passive | skill_point | Point 1: 2 / Point 2: 5 / Point 3: 8 / Point 4: 11 |
| `dark_brotherhood__padomaic_sprint` | Padomaic Sprint | Passive | skill_point | Point 1: 3 / Point 2: 6 / Point 3: 9 / Point 4: 12 |
| `dark_brotherhood__shadowy_supplier` | Shadowy Supplier | Passive | skill_point | Point 1: 4 |
| `dark_brotherhood__shadow_rider` | Shadow Rider | Passive | skill_point | Point 1: 7 |
| `dark_brotherhood__spectral_assassin` | Spectral Assassin | Passive | skill_point | Point 1: 10 |

### Assault (`assault`)

**Category:** Alliance War  
**Max line rank:** 10  
**Current source:** https://eso-hub.com/en/skills/alliance-war/assault

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `assault__war_horn` | War Horn | Ultimate | skill_point | Line rank 4 |
| `assault__vigor` | Vigor | Active | skill_point | Line rank 2 |
| `assault__caltrops` | Caltrops | Active | skill_point | Line rank 6 |
| `assault__magicka_detonation` | Magicka Detonation | Active | skill_point | Line rank 7 |
| `assault__rapid_maneuver` | Rapid Maneuver | Active | skill_point | Line rank 5 |
| `assault__echoing_vigor` | Echoing Vigor | Morph | skill_point | Line rank 2; base ability Rank IV |
| `assault__resolving_vigor` | Resolving Vigor | Morph | skill_point | Line rank 2; base ability Rank IV |
| `assault__anti_cavalry_caltrops` | Anti-Cavalry Caltrops | Morph | skill_point | Line rank 6; base ability Rank IV |
| `assault__razor_caltrops` | Razor Caltrops | Morph | skill_point | Line rank 6; base ability Rank IV |
| `assault__inevitable_detonation` | Inevitable Detonation | Morph | skill_point | Line rank 7; base ability Rank IV |
| `assault__proximity_detonation` | Proximity Detonation | Morph | skill_point | Line rank 7; base ability Rank IV |
| `assault__charging_maneuver` | Charging Maneuver | Morph | skill_point | Line rank 5; base ability Rank IV |
| `assault__retreating_maneuver` | Retreating Maneuver | Morph | skill_point | Line rank 5; base ability Rank IV |
| `assault__aggressive_horn` | Aggressive Horn | Morph | skill_point | Line rank 4; base ability Rank IV |
| `assault__sturdy_horn` | Sturdy Horn | Morph | skill_point | Line rank 4; base ability Rank IV |
| `assault__combat_frenzy` | Combat Frenzy | Passive | skill_point | Point 1: 8 / Point 2: 10 |
| `assault__continuous_attack` | Continuous Attack | Passive | skill_point | Point 1: 3 / Point 2: 9 |
| `assault__reach` | Reach | Passive | skill_point | Point 1: 5 / Point 2: 10 |
| `scribing__trample` | Trample | Scribing | none | Line rank 5 |

### Support (`support`)

**Category:** Alliance War  
**Max line rank:** 10  
**Current source:** https://eso-hub.com/en/skills/alliance-war/support

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `support__barrier` | Barrier | Ultimate | skill_point | Line rank 6 |
| `support__siege_shield` | Siege Shield | Active | skill_point | Line rank 2 |
| `support__purge` | Purge | Active | skill_point | Line rank 4 |
| `support__guard` | Guard | Active | skill_point | Line rank 5 |
| `support__revealing_flare` | Revealing Flare | Active | skill_point | Line rank 7 |
| `support__propelling_shield` | Propelling Shield | Morph | skill_point | Line rank 2; base ability Rank IV |
| `support__siege_weapon_shield` | Siege Weapon Shield | Morph | skill_point | Line rank 2; base ability Rank IV |
| `support__cleanse` | Cleanse | Morph | skill_point | Line rank 4; base ability Rank IV |
| `support__efficient_purge` | Efficient Purge | Morph | skill_point | Line rank 4; base ability Rank IV |
| `support__mystic_guard` | Mystic Guard | Morph | skill_point | Line rank 5; base ability Rank IV |
| `support__stalwart_guard` | Stalwart Guard | Morph | skill_point | Line rank 5; base ability Rank IV |
| `support__blinding_flare` | Blinding Flare | Morph | skill_point | Line rank 7; base ability Rank IV |
| `support__lingering_flare` | Lingering Flare | Morph | skill_point | Line rank 7; base ability Rank IV |
| `support__replenishing_barrier` | Replenishing Barrier | Morph | skill_point | Line rank 6; base ability Rank IV |
| `support__reviving_barrier` | Reviving Barrier | Morph | skill_point | Line rank 6; base ability Rank IV |
| `support__battle_resurrection` | Battle Resurrection | Passive | skill_point | Point 1: 8 / Point 2: 10 |
| `support__combat_medic` | Combat Medic | Passive | skill_point | Point 1: 5 / Point 2: 10 |
| `support__magicka_aid` | Magicka Aid | Passive | skill_point | Point 1: 3 / Point 2: 9 |
| `scribing__banner_bearer` | Banner Bearer | Scribing | none | Line rank 5 |

### Emperor (`emperor`)

**Category:** Alliance War  
**Max line rank:** 1  
**Current source:** https://eso-hub.com/en/skills/alliance-war/emperor

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `emperor__domination` | Domination | Passive | none | Line rank 1 |
| `emperor__authority` | Authority | Passive | none | Line rank 1 |
| `emperor__monarch` | Monarch | Passive | none | Line rank 1 |
| `emperor__tactician` | Tactician | Passive | none | Line rank 1 |
| `emperor__emperor` | Emperor | Passive | none | Line rank 1 |

### Dark Elf Skills (`dark_elf`)

**Category:** Racial  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/racial/dark-elf

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `dark_elf__ashlander` | Ashlander | Passive | none | Line rank 1 |
| `dark_elf__dynamic` | Dynamic | Passive | skill_point | Point 1: 5 / Point 2: 15 / Point 3: 30 |
| `dark_elf__resist_flame` | Resist Flame | Passive | skill_point | Point 1: 10 / Point 2: 20 / Point 3: 40 |
| `dark_elf__ruination` | Ruination | Passive | skill_point | Point 1: 25 / Point 2: 35 / Point 3: 50 |

### High Elf Skills (`high_elf`)

**Category:** Racial  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/racial/high-elf

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `high_elf__highborn` | Highborn | Passive | none | Line rank 1 |
| `high_elf__spell_recharge` | Spell Recharge | Passive | skill_point | Point 1: 5 / Point 2: 15 / Point 3: 30 |
| `high_elf__syrabane_s_boon` | Syrabane’s Boon | Passive | skill_point | Point 1: 10 / Point 2: 20 / Point 3: 40 |
| `high_elf__elemental_talent` | Elemental Talent | Passive | skill_point | Point 1: 25 / Point 2: 35 / Point 3: 50 |

### Wood Elf Skills (`wood_elf`)

**Category:** Racial  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/racial/wood-elf

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `wood_elf__acrobat` | Acrobat | Passive | none | Line rank 1 |
| `wood_elf__y_ffre_s_endurance` | Y’ffre’s Endurance | Passive | skill_point | Point 1: 5 / Point 2: 15 / Point 3: 30 |
| `wood_elf__resist_affliction` | Resist Affliction | Passive | skill_point | Point 1: 10 / Point 2: 20 / Point 3: 40 |
| `wood_elf__hunter_s_eye` | Hunter’s Eye | Passive | skill_point | Point 1: 25 / Point 2: 35 / Point 3: 50 |

### Breton Skills (`breton`)

**Category:** Racial  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/racial/breton

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `breton__opportunist` | Opportunist | Passive | none | Line rank 1 |
| `breton__gift_of_magnus` | Gift of Magnus | Passive | skill_point | Point 1: 5 / Point 2: 15 / Point 3: 30 |
| `breton__spell_attunement` | Spell Attunement | Passive | skill_point | Point 1: 10 / Point 2: 20 / Point 3: 40 |
| `breton__magicka_mastery` | Magicka Mastery | Passive | skill_point | Point 1: 25 / Point 2: 35 / Point 3: 50 |

### Orc Skills (`orc`)

**Category:** Racial  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/racial/orc

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `orc__craftsman` | Craftsman | Passive | none | Line rank 1 |
| `orc__brawny` | Brawny | Passive | skill_point | Point 1: 5 / Point 2: 15 / Point 3: 30 |
| `orc__unflinching_rage` | Unflinching Rage | Passive | skill_point | Point 1: 10 / Point 2: 20 / Point 3: 40 |
| `orc__swift_warrior` | Swift Warrior | Passive | skill_point | Point 1: 25 / Point 2: 35 / Point 3: 50 |

### Redguard Skills (`redguard`)

**Category:** Racial  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/racial/redguard

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `redguard__wayfarer` | Wayfarer | Passive | none | Line rank 1 |
| `redguard__martial_training` | Martial Training | Passive | skill_point | Point 1: 5 / Point 2: 15 / Point 3: 30 |
| `redguard__conditioning` | Conditioning | Passive | skill_point | Point 1: 10 / Point 2: 20 / Point 3: 40 |
| `redguard__adrenaline_rush` | Adrenaline Rush | Passive | skill_point | Point 1: 25 / Point 2: 35 / Point 3: 50 |

### Nord Skills (`nord`)

**Category:** Racial  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/racial/nord

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `nord__reveler` | Reveler | Passive | none | Line rank 1 |
| `nord__stalwart` | Stalwart | Passive | skill_point | Point 1: 10 / Point 2: 20 / Point 3: 40 |
| `nord__resist_frost` | Resist Frost | Passive | skill_point | Point 1: 5 / Point 2: 15 / Point 3: 30 |
| `nord__rugged` | Rugged | Passive | skill_point | Point 1: 25 / Point 2: 35 / Point 3: 50 |

### Argonian Skills (`argonian`)

**Category:** Racial  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/racial/argonian

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `argonian__amphibian` | Amphibian | Passive | none | Line rank 1 |
| `argonian__resourceful` | Resourceful | Passive | skill_point | Point 1: 25 / Point 2: 35 / Point 3: 50 |
| `argonian__argonian_resistance` | Argonian Resistance | Passive | skill_point | Point 1: 10 / Point 2: 20 / Point 3: 40 |
| `argonian__life_mender` | Life Mender | Passive | skill_point | Point 1: 5 / Point 2: 15 / Point 3: 30 |

### Khajiit Skills (`khajiit`)

**Category:** Racial  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/racial/khajiit

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `khajiit__cutpurse` | Cutpurse | Passive | none | Line rank 1 |
| `khajiit__robustness` | Robustness | Passive | skill_point | Point 1: 5 / Point 2: 15 / Point 3: 30 |
| `khajiit__lunar_blessings` | Lunar Blessings | Passive | skill_point | Point 1: 10 / Point 2: 20 / Point 3: 40 |
| `khajiit__feline_ambush` | Feline Ambush | Passive | skill_point | Point 1: 25 / Point 2: 35 / Point 3: 50 |

### Imperial Skills (`imperial`)

**Category:** Racial  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/racial/imperial

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `imperial__diplomat` | Diplomat | Passive | none | Line rank 1 |
| `imperial__tough` | Tough | Passive | skill_point | Point 1: 5 / Point 2: 15 / Point 3: 30 |
| `imperial__imperial_mettle` | Imperial Mettle | Passive | skill_point | Point 1: 10 / Point 2: 20 / Point 3: 40 |
| `imperial__red_diamond` | Red Diamond | Passive | skill_point | Point 1: 25 / Point 2: 35 / Point 3: 50 |

### Blacksmithing (`blacksmithing`)

**Category:** Craft  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/craft/blacksmithing

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `blacksmithing__metalworking` | Metalworking | Passive | skill_point | Point 1: 1 / Point 2: 5 / Point 3: 10 / Point 4: 15 / Point 5: 20 / Point 6: 25 / Point 7: 30 / Point 8: 35 / Point 9: 40 / Point 10: 50 |
| `blacksmithing__keen_eye_ore` | Keen Eye: Ore | Passive | skill_point | Point 1: 2 / Point 2: 9 / Point 3: 30 |
| `blacksmithing__miner_hireling` | Miner Hireling | Passive | skill_point | Point 1: 3 / Point 2: 12 / Point 3: 32 |
| `blacksmithing__metal_extraction` | Metal Extraction | Passive | skill_point | Point 1: 4 / Point 2: 22 / Point 3: 32 |
| `blacksmithing__metallurgy` | Metallurgy | Passive | skill_point | Point 1: 8 / Point 2: 18 / Point 3: 28 / Point 4: 45 |
| `blacksmithing__temper_expertise` | Temper Expertise | Passive | skill_point | Point 1: 10 / Point 2: 25 / Point 3: 40 |

### Clothing (`clothing`)

**Category:** Craft  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/craft/clothing

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `clothing__tailoring` | Tailoring | Passive | skill_point | Point 1: 1 / Point 2: 5 / Point 3: 10 / Point 4: 15 / Point 5: 20 / Point 6: 25 / Point 7: 30 / Point 8: 35 / Point 9: 40 / Point 10: 50 |
| `clothing__keen_eye_cloth` | Keen Eye: Cloth | Passive | skill_point | Point 1: 2 / Point 2: 9 / Point 3: 30 |
| `clothing__outfitter_hireling` | Outfitter Hireling | Passive | skill_point | Point 1: 3 / Point 2: 12 / Point 3: 32 |
| `clothing__unraveling` | Unraveling | Passive | skill_point | Point 1: 4 / Point 2: 22 / Point 3: 32 |
| `clothing__stitching` | Stitching | Passive | skill_point | Point 1: 8 / Point 2: 18 / Point 3: 28 / Point 4: 45 |
| `clothing__tannin_expertise` | Tannin Expertise | Passive | skill_point | Point 1: 10 / Point 2: 25 / Point 3: 40 |

### Woodworking (`woodworking`)

**Category:** Craft  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/craft/woodworking

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `woodworking__woodworking` | Woodworking | Passive | skill_point | Point 1: 1 / Point 2: 5 / Point 3: 10 / Point 4: 15 / Point 5: 20 / Point 6: 25 / Point 7: 30 / Point 8: 35 / Point 9: 40 / Point 10: 50 |
| `woodworking__keen_eye_wood` | Keen Eye: Wood | Passive | skill_point | Point 1: 2 / Point 2: 9 / Point 3: 30 |
| `woodworking__lumberjack_hireling` | Lumberjack Hireling | Passive | skill_point | Point 1: 3 / Point 2: 12 / Point 3: 32 |
| `woodworking__wood_extraction` | Wood Extraction | Passive | skill_point | Point 1: 4 / Point 2: 22 / Point 3: 32 |
| `woodworking__carpentry` | Carpentry | Passive | skill_point | Point 1: 8 / Point 2: 18 / Point 3: 28 / Point 4: 45 |
| `woodworking__resin_expertise` | Resin Expertise | Passive | skill_point | Point 1: 10 / Point 2: 25 / Point 3: 40 |

### Jewelry Crafting (`jewelry_crafting`)

**Category:** Craft  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/craft/jewelry-crafting

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `jewelry_crafting__engraver` | Engraver | Passive | skill_point | Point 1: 1 / Point 2: 14 / Point 3: 27 / Point 4: 40 / Point 5: 50 |
| `jewelry_crafting__keen_eye_jewelry` | Keen Eye: Jewelry | Passive | skill_point | Point 1: 2 / Point 2: 9 / Point 3: 30 |
| `jewelry_crafting__jewelry_extraction` | Jewelry Extraction | Passive | skill_point | Point 1: 4 / Point 2: 22 / Point 3: 32 |
| `jewelry_crafting__lapidary_research` | Lapidary Research | Passive | skill_point | Point 1: 8 / Point 2: 18 / Point 3: 28 / Point 4: 45 |
| `jewelry_crafting__platings_expertise` | Platings Expertise | Passive | skill_point | Point 1: 10 / Point 2: 25 / Point 3: 40 |

### Alchemy (`alchemy`)

**Category:** Craft  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/craft/alchemy

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `alchemy__solvent_proficiency` | Solvent Proficiency | Passive | skill_point | Point 1: 1 / Point 2: 10 / Point 3: 20 / Point 4: 30 / Point 5: 40 / Point 6: 48 / Point 7: 49 / Point 8: 50 |
| `alchemy__keen_eye_reagents` | Keen Eye: Reagents | Passive | skill_point | Point 1: 2 / Point 2: 6 / Point 3: 17 |
| `alchemy__medicinal_use` | Medicinal Use | Passive | skill_point | Point 1: 8 / Point 2: 35 / Point 3: 50 |
| `alchemy__chemistry` | Chemistry | Passive | skill_point | Point 1: 12 / Point 2: 25 / Point 3: 47 |
| `alchemy__laboratory_use` | Laboratory Use | Passive | skill_point | Point 1: 15 |
| `alchemy__snakeblood` | Snakeblood | Passive | skill_point | Point 1: 23 / Point 2: 33 / Point 3: 43 |

### Enchanting (`enchanting`)

**Category:** Craft  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/craft/enchanting

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `enchanting__potency_improvement` | Potency Improvement | Passive | skill_point | Point 1: 1 / Point 2: 5 / Point 3: 10 / Point 4: 15 / Point 5: 20 / Point 6: 25 / Point 7: 30 / Point 8: 35 / Point 9: 40 / Point 10: 50 |
| `enchanting__aspect_improvement` | Aspect Improvement | Passive | skill_point | Point 1: 1 / Point 2: 6 / Point 3: 16 / Point 4: 31 |
| `enchanting__keen_eye_rune_stones` | Keen Eye: Rune Stones | Passive | skill_point | Point 1: 2 / Point 2: 7 / Point 3: 14 |
| `enchanting__hireling` | Enchanter Hireling | Passive | skill_point | Point 1: 3 / Point 2: 12 / Point 3: 32 |
| `enchanting__runestone_extraction` | Runestone Extraction | Passive | skill_point | Point 1: 4 / Point 2: 19 / Point 3: 29 |

### Provisioning (`provisioning`)

**Category:** Craft  
**Max line rank:** 50  
**Current source:** https://eso-hub.com/en/skills/craft/provisioning

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|
| `provisioning__recipe_quality` | Recipe Quality | Passive | skill_point | Point 1: 1 / Point 2: 10 / Point 3: 35 / Point 4: 50 |
| `provisioning__recipe_improvement` | Recipe Improvement | Passive | skill_point | Point 1: 1 / Point 2: 20 / Point 3: 30 / Point 4: 40 / Point 5: 50 / Point 6: 50 |
| `provisioning__gourmand` | Gourmand | Passive | skill_point | Point 1: 3 / Point 2: 14 / Point 3: 43 |
| `provisioning__connoisseur` | Connoisseur | Passive | skill_point | Point 1: 5 / Point 2: 18 / Point 3: 47 |
| `provisioning__chef` | Chef | Passive | skill_point | Point 1: 7 / Point 2: 23 / Point 3: 33 |
| `provisioning__brewer` | Brewer | Passive | skill_point | Point 1: 9 / Point 2: 25 / Point 3: 36 |
| `provisioning__hireling` | Forager Hireling | Passive | skill_point | Point 1: 28 / Point 2: 38 / Point 3: 48 |

### Scribing (`scribing`)

**Category:** System  
**Max line rank:** 1  
**Current source:** https://eso-hub.com/en/scribing

| Catalog ID | Skill | Type | Cost type | Verified availability gate |
|---|---|---|---|---|

