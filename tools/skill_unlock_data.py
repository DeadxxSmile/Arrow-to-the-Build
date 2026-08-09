"""Verified ESO Update 50 skill-line unlock gates used by ATTB.

The values in this file describe *skill-line rank* requirements, not character level.
Morphs additionally require the unmorphed ability to reach Rank IV.

Primary current source: ESO-Hub's live skill database (checked 2026-08-09).
Patch baseline: ZOS Update 50 Inc. 2 live patch (2026-07-20).
A secondary machine-readable cross-check was made against the APESO skill data table;
when a secondary source disagreed, the current ESO-Hub live page won.
"""

VERIFIED_DATE = "2026-08-09"
GAME_VERSION = "Update 50"
LIVE_PATCH = "Update 50 Inc. 2"
OFFICIAL_PATCH_URL = "https://forums.elderscrollsonline.com/en/discussion/696428/update-50-inc-2-live-patch-notes-all-platforms"
PRIMARY_SOURCE = "ESO-Hub live skill database"
PRIMARY_SOURCE_ROOT = "https://eso-hub.com/en/skills"
SECONDARY_SOURCE = "APESO skill data table (cross-check only)"
SECONDARY_SOURCE_URL = "https://github.com/spencer2585/APESO/blob/main/Mod%20-%20old/Data/APESO_SkillData.lua"

# Current class skill-line passive purchase gates are positional: passive slot 1..4.
CLASS_PASSIVE_GATES = ([8, 18], [14, 27], [22, 36], [39, 50])

CLASS_PASSIVE_SLOTS = {
    # Arcanist display/order differs from the historical generator list; map explicitly.
    "curative": [
        "curative__healing_tides", "curative__hideous_clarity",
        "curative__erudition", "curative__intricate_runeforms",
    ],
    "herald": [
        "herald__fated_fortune", "herald__harnessed_quintessence",
        "herald__psychic_lesion", "herald__splintered_secrets",
    ],
    "soldier": [
        "soldier__aegis_of_the_unseen", "soldier__wellspring_of_the_abyss",
        "soldier__circumvented_fate", "soldier__implacable_outcome",
    ],
    "aedric_spear": [
        "aedric_spear__piercing_spear", "aedric_spear__spear_wall",
        "aedric_spear__burning_light", "aedric_spear__balanced_warrior",
    ],
    "dawns_wrath": [
        "dawns_wrath__enduring_rays", "dawns_wrath__prism",
        "dawns_wrath__illuminate", "dawns_wrath__restoring_spirit",
    ],
    "restoring_light": [
        "restoring_light__mending", "restoring_light__sacred_ground",
        "restoring_light__light_weaver", "restoring_light__master_ritualist",
    ],
    # U49/U50 Dragonknight refresh: permanent IDs are retained, current passive slots are explicit.
    "ardent_flame": [
        "ardent_flame__combustion", "ardent_flame__traumatic_burns",
        "ardent_flame__fan_the_flames", "ardent_flame__a_soul_ablaze",
    ],
    "draconic_power": [
        "draconic_power__iron_skin", "draconic_power__burning_heart",
        "draconic_power__elder_dragon", "draconic_power__scaled_armor",
    ],
    "earthen_heart": [
        "earthen_heart__eternal_mountain", "earthen_heart__battle_roar",
        "earthen_heart__mountain_s_blessing", "earthen_heart__helping_hands",
    ],
    "dark_magic": [
        "dark_magic__unholy_knowledge", "dark_magic__blood_magic",
        "dark_magic__persistence", "dark_magic__exploitation",
    ],
    "daedric_summoning": [
        "daedric_summoning__rebate", "daedric_summoning__power_stone",
        "daedric_summoning__daedric_protection", "daedric_summoning__expert_summoner",
    ],
    "storm_calling": [
        "storm_calling__capacitor", "storm_calling__energized",
        "storm_calling__amplitude", "storm_calling__expert_mage",
    ],
    "assassination": [
        "assassination__master_assassin", "assassination__executioner",
        "assassination__pressure_points", "assassination__hemorrhage",
    ],
    "shadow": [
        "shadow__refreshing_shadows", "shadow__shadow_barrier",
        "shadow__dark_vigor", "shadow__dark_veil",
    ],
    "siphoning": [
        "siphoning__catalyst", "siphoning__magicka_flood",
        "siphoning__soul_siphoner", "siphoning__transfer",
    ],
    "animal_companions": [
        "animal_companions__bond_with_nature", "animal_companions__savage_beast",
        "animal_companions__flourish", "animal_companions__advanced_species",
    ],
    "green_balance": [
        "green_balance__accelerated_growth", "green_balance__nature_s_gift",
        "green_balance__emerald_moss", "green_balance__maturation",
    ],
    "winters_embrace": [
        "winters_embrace__glacial_presence", "winters_embrace__frozen_armor",
        "winters_embrace__icy_aura", "winters_embrace__piercing_cold",
    ],
    "grave_lord": [
        "grave_lord__reusable_parts", "grave_lord__death_knell",
        "grave_lord__dismember", "grave_lord__rapid_rot",
    ],
    "bone_tyrant": [
        "bone_tyrant__death_gleaning", "bone_tyrant__disdain_harm",
        "bone_tyrant__health_avarice", "bone_tyrant__last_gasp",
    ],
    "living_death": [
        "living_death__curative_curse", "living_death__near_death_experience",
        "living_death__corpse_consumption", "living_death__undead_confederate",
    ],
}

# Weapon passive purchase gates are also positional (slot 1..5).
WEAPON_PASSIVE_GATES = ([5, 34], [10, 25], [17, 28], [30, 46], [41, 50])
WEAPON_PASSIVE_SLOTS = {
    "two_handed": [
        "two_handed__forceful", "two_handed__heavy_weapons", "two_handed__balanced_blade",
        "two_handed__follow_up", "two_handed__battle_rush",
    ],
    "one_hand_and_shield": [
        "one_hand_and_shield__fortress", "one_hand_and_shield__sword_and_board",
        "one_hand_and_shield__deadly_bash", "one_hand_and_shield__deflect_bolts",
        "one_hand_and_shield__battlefield_mobility",
    ],
    "dual_wield": [
        "dual_wield__focused_killer", "dual_wield__ambidextrous", "dual_wield__controlled_fury",
        "dual_wield__ruffian", "dual_wield__twin_blade_and_blunt",
    ],
    "bow": [
        "bow__long_shots", "bow__accuracy", "bow__ranger", "bow__hawk_eye", "bow__hasty_retreat",
    ],
    "destruction_staff": [
        "destruction_staff__tri_focus", "destruction_staff__penetrating_magic",
        "destruction_staff__elemental_force", "destruction_staff__ancient_knowledge",
        "destruction_staff__destruction_expert",
    ],
    "restoration_staff": [
        "restoration_staff__essence_drain", "restoration_staff__restoration_expert",
        "restoration_staff__cycle_of_life", "restoration_staff__absorb",
        "restoration_staff__restoration_master",
    ],
}

# Exact per-purchase passive gates for non-class/weapon skill lines.
PASSIVE_UNLOCK_RANKS = {
    # Armor
    "light_armor__grace": [2, 10, 30],
    "light_armor__evocation": [6, 18],
    "light_armor__spell_warding": [14, 34],
    "light_armor__prodigy": [38, 46],
    "light_armor__concentration": [42, 50],
    "medium_armor__dexterity": [2, 10, 30],
    "medium_armor__wind_walker": [6, 18],
    "medium_armor__improved_sneak": [14, 34],
    "medium_armor__agility": [38, 46],
    "medium_armor__athletics": [42, 50],
    "heavy_armor__resolve": [2, 10, 30],
    "heavy_armor__constitution": [6, 18],
    "heavy_armor__juggernaut": [14, 34],
    "heavy_armor__revitalize": [38, 46],
    "heavy_armor__rapid_mending": [42, 50],

    # World
    "soul_magic__soul_shatter": [2, 4],
    "soul_magic__soul_summons": [2, 3],
    "soul_magic__soul_lock": [3, 5],
    "vampire__dark_stalker": [3, 7],
    "vampire__strike_from_the_shadows": [4, 8],
    "vampire__blood_ritual": [6],
    "vampire__undeath": [6, 9],
    "vampire__unnatural_movement": [7, 10],
    "werewolf__pursuit": [3, 7],
    "werewolf__blood_rage": [4, 8],
    "werewolf__bloodmoon": [6],
    "werewolf__savage_strength": [6, 9],
    "werewolf__call_of_the_pack": [7, 10],
    "legerdemain__improved_hiding": [1, 6, 11, 16],
    "legerdemain__light_fingers": [2, 7, 12, 17],
    "legerdemain__trafficker": [3, 8, 13, 18],
    "legerdemain__locksmith": [5, 9, 14, 19],
    "legerdemain__kickback": [6, 10, 15, 20],
    "scrying__antiquarian_insight": [1, 3, 5, 7, 10],
    "scrying__scrier_s_patience": [2, 5],
    "scrying__coalescence": [2, 6],
    "scrying__future_focus": [4, 8],
    "scrying__dilation": [4, 8],
    "scrying__farsight": [6, 9],
    "scrying__preemptive_power": [9],
    "excavation__hand_brush": [1, 6],
    "excavation__augur": [1, 5],
    "excavation__trowel": [2, 7],
    "excavation__keen_eye_dig_sites": [2, 4],
    "excavation__excavator_s_reserves": [3, 10],
    "excavation__heavy_shovel": [4, 8],
    "excavation__keen_eye_treasure_chests": [7, 9],

    # Guild
    "fighters_guild__intimidating_presence": [1],
    "fighters_guild__slayer": [3, 6, 7],
    "fighters_guild__banish_the_wicked": [5, 9, 10],
    "fighters_guild__skilled_tracker": [7],
    "fighters_guild__bounty_hunter": [9],
    "mages_guild__persuasive_will": [1],
    "mages_guild__mage_adept": [3, 5],
    "mages_guild__everlasting_magic": [5, 7],
    "mages_guild__magicka_controller": [7, 9],
    "mages_guild__might_of_the_guild": [9, 10],
    "undaunted__undaunted_command": [6, 8],
    "undaunted__undaunted_mettle": [7, 9],
    "psijic_order__clairvoyance": [3, 5],
    "psijic_order__spell_orb": [4, 7],
    "psijic_order__concentrated_barrier": [6, 8],
    "psijic_order__deliberation": [9],
    "thieves_guild__swiftly_forgotten": [2, 5, 8, 11],
    "thieves_guild__haggling": [3, 6, 9, 12],
    "thieves_guild__clemency": [4],
    "thieves_guild__timely_escape": [7],
    "thieves_guild__veil_of_shadows": [10],
    "dark_brotherhood__scales_of_pitiless_justice": [2, 5, 8, 11],
    "dark_brotherhood__padomaic_sprint": [3, 6, 9, 12],
    "dark_brotherhood__shadowy_supplier": [4],
    "dark_brotherhood__shadow_rider": [7],
    "dark_brotherhood__spectral_assassin": [10],

    # Alliance War
    "assault__continuous_attack": [3, 9],
    "assault__reach": [5, 10],
    "assault__combat_frenzy": [8, 10],
    "support__magicka_aid": [3, 9],
    "support__combat_medic": [5, 10],
    "support__battle_resurrection": [8, 10],

    # Racial - the current racial line itself levels with character progression.
    "dark_elf__dynamic": [5, 15, 30],
    "dark_elf__resist_flame": [10, 20, 40],
    "dark_elf__ruination": [25, 35, 50],
    "high_elf__spell_recharge": [5, 15, 30],
    "high_elf__syrabane_s_boon": [10, 20, 40],
    "high_elf__elemental_talent": [25, 35, 50],
    "wood_elf__y_ffre_s_endurance": [5, 15, 30],
    "wood_elf__resist_affliction": [10, 20, 40],
    "wood_elf__hunter_s_eye": [25, 35, 50],
    "breton__gift_of_magnus": [5, 15, 30],
    "breton__spell_attunement": [10, 20, 40],
    "breton__magicka_mastery": [25, 35, 50],
    "orc__brawny": [5, 15, 30],
    "orc__unflinching_rage": [10, 20, 40],
    "orc__swift_warrior": [25, 35, 50],
    "redguard__martial_training": [5, 15, 30],
    "redguard__conditioning": [10, 20, 40],
    "redguard__adrenaline_rush": [25, 35, 50],
    "nord__resist_frost": [5, 15, 30],
    "nord__stalwart": [10, 20, 40],
    "nord__rugged": [25, 35, 50],
    "argonian__life_mender": [5, 15, 30],
    "argonian__argonian_resistance": [10, 20, 40],
    "argonian__resourceful": [25, 35, 50],
    "khajiit__robustness": [5, 15, 30],
    "khajiit__lunar_blessings": [10, 20, 40],
    "khajiit__feline_ambush": [25, 35, 50],
    "imperial__tough": [5, 15, 30],
    "imperial__imperial_mettle": [10, 20, 40],
    "imperial__red_diamond": [25, 35, 50],

    # Craft
    "blacksmithing__metalworking": [1, 5, 10, 15, 20, 25, 30, 35, 40, 50],
    "blacksmithing__keen_eye_ore": [2, 9, 30],
    "blacksmithing__miner_hireling": [3, 12, 32],
    "blacksmithing__metal_extraction": [4, 22, 32],
    "blacksmithing__metallurgy": [8, 18, 28, 45],
    "blacksmithing__temper_expertise": [10, 25, 40],
    "clothing__tailoring": [1, 5, 10, 15, 20, 25, 30, 35, 40, 50],
    "clothing__keen_eye_cloth": [2, 9, 30],
    "clothing__outfitter_hireling": [3, 12, 32],
    "clothing__unraveling": [4, 22, 32],
    "clothing__stitching": [8, 18, 28, 45],
    "clothing__tannin_expertise": [10, 25, 40],
    "woodworking__woodworking": [1, 5, 10, 15, 20, 25, 30, 35, 40, 50],
    "woodworking__keen_eye_wood": [2, 9, 30],
    "woodworking__lumberjack_hireling": [3, 12, 32],
    "woodworking__wood_extraction": [4, 22, 32],
    "woodworking__carpentry": [8, 18, 28, 45],
    "woodworking__resin_expertise": [10, 25, 40],
    "jewelry_crafting__engraver": [1, 14, 27, 40, 50],
    "jewelry_crafting__keen_eye_jewelry": [2, 9, 30],
    "jewelry_crafting__jewelry_extraction": [4, 22, 32],
    "jewelry_crafting__lapidary_research": [8, 18, 28, 45],
    "jewelry_crafting__platings_expertise": [10, 25, 40],
    "alchemy__solvent_proficiency": [1, 10, 20, 30, 40, 48, 49, 50],
    "alchemy__keen_eye_reagents": [2, 6, 17],
    "alchemy__medicinal_use": [8, 35, 50],
    "alchemy__chemistry": [12, 25, 47],
    "alchemy__laboratory_use": [15],
    "alchemy__snakeblood": [23, 33, 43],
    "enchanting__potency_improvement": [1, 5, 10, 15, 20, 25, 30, 35, 40, 50],
    "enchanting__aspect_improvement": [1, 6, 16, 31],
    "enchanting__keen_eye_rune_stones": [2, 7, 14],
    "enchanting__hireling": [3, 12, 32],
    "enchanting__runestone_extraction": [4, 19, 29],
    "provisioning__recipe_quality": [1, 10, 35, 50],
    "provisioning__recipe_improvement": [1, 20, 30, 40, 50, 50],
    "provisioning__gourmand": [3, 14, 43],
    "provisioning__connoisseur": [5, 18, 47],
    "provisioning__chef": [7, 23, 33],
    "provisioning__brewer": [9, 25, 36],
    "provisioning__hireling": [28, 38, 48],
}

# Expand class and weapon positional tables into the same exact-ID map.
for _line_id, _ids in CLASS_PASSIVE_SLOTS.items():
    if len(_ids) != len(CLASS_PASSIVE_GATES):
        raise ValueError(f"Class passive slot map for {_line_id} is incomplete")
    for _skill_id, _ranks in zip(_ids, CLASS_PASSIVE_GATES):
        PASSIVE_UNLOCK_RANKS[_skill_id] = list(_ranks)

for _line_id, _ids in WEAPON_PASSIVE_SLOTS.items():
    if len(_ids) != len(WEAPON_PASSIVE_GATES):
        raise ValueError(f"Weapon passive slot map for {_line_id} is incomplete")
    for _skill_id, _ranks in zip(_ids, WEAPON_PASSIVE_GATES):
        PASSIVE_UNLOCK_RANKS[_skill_id] = list(_ranks)

# Base-family line-rank corrections/locks where lines do not use the standard class/weapon pattern.
# The generator propagates each value to the two morphs in the same family.
FAMILY_REQUIRED_RANK_OVERRIDES = {
    # Soul Magic
    "soul_magic__soul_strike": 6,
    "soul_magic__soul_trap": 1,

    # Vampire
    "vampire__blood_scion": 5,
    "vampire__eviscerate": 1,
    "vampire__blood_frenzy": 2,
    "vampire__vampiric_drain": 4,
    "vampire__mesmerize": 6,
    "vampire__mist_form": 9,

    # Werewolf
    "werewolf__werewolf_transformation": 1,
    "werewolf__pounce": 2,
    "werewolf__hircine_s_bounty": 4,
    "werewolf__roar": 5,
    "werewolf__piercing_howl": 6,
    "werewolf__infectious_claws": 9,

    # Psijic Order
    "psijic_order__time_stop": 2,
    "psijic_order__imbue_weapon": 3,
    "psijic_order__accelerate": 5,
    "psijic_order__mend_wounds": 6,
    "psijic_order__meditate": 8,
    "psijic_order__undo": 10,

    # Alliance War
    "assault__war_horn": 4,
    "assault__vigor": 2,
    "assault__caltrops": 6,
    "assault__magicka_detonation": 7,
    "assault__rapid_maneuver": 5,
    "support__barrier": 6,
    "support__siege_shield": 2,
    "support__purge": 4,
    "support__guard": 5,
    "support__revealing_flare": 7,
}

# Inherent/system-granted abilities/passives do not consume an ordinary skill point, but still have
# a skill-line rank/condition at which they become available.
INHERENT_REQUIRED_RANKS = {
    "vampire__feed": 1,
    "werewolf__devour": 1,
    "scrying__scry": 1,
    "psijic_order__see_the_unseen": 1,
    "thieves_guild__finders_keepers": 1,
    "dark_brotherhood__blade_of_woe": 1,
}

# All race identity/starter passives are granted when the racial line exists (rank 1).
for _race, _starter in {
    "dark_elf": "ashlander", "high_elf": "highborn", "wood_elf": "acrobat", "breton": "opportunist",
    "orc": "craftsman", "redguard": "wayfarer", "nord": "reveler", "argonian": "amphibian",
    "khajiit": "cutpurse", "imperial": "diplomat",
}.items():
    INHERENT_REQUIRED_RANKS[f"{_race}__{_starter}"] = 1

# Emperor passives are condition-granted rather than individually purchased.
for _name in ("domination", "authority", "monarch", "tactician", "emperor"):
    INHERENT_REQUIRED_RANKS[f"emperor__{_name}"] = 1

PASSIVE_MAX_POINTS_OVERRIDES = {
    "psijic_order__deliberation": 1,
    "thieves_guild__veil_of_shadows": 1,
}

CURRENCY_OVERRIDES = {
    "psijic_order__see_the_unseen": "none",
}
