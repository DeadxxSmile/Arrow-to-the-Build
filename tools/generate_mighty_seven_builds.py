"""Generate the five missing ATTB launch builds and add U50 Class Mastery rows to all seven.

The output is intentionally ordinary JSON: this script is only a reproducible authoring aid.
The app continues to load and validate the generated JSON exactly like any community build.
"""
from __future__ import annotations

import copy
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILD_DIR = ROOT / "resources" / "builds"
CATALOG_PATH = ROOT / "resources" / "data" / "eso-skill-catalog.json"
VERIFIED_DATE = "2026-08-05"
GAME_VERSION = "Update 50"
AUTHOR = "DeadxxSmile / ATTB Community Launch Bundle"


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.lower().replace("’", "'")).strip("_")


catalog = json.loads(CATALOG_PATH.read_text(encoding="utf8"))
line_by_id = {line["id"]: line for line in catalog["lines"]}
skill_by_id = {skill["id"]: (line, skill) for line in catalog["lines"] for skill in line.get("skills", [])}

arcanist_path = BUILD_DIR / "stamina_arcanist_solo_duo.json"
templar_path = BUILD_DIR / "magicka_templar_solo_duo.json"
arcanist = json.loads(arcanist_path.read_text(encoding="utf8"))
templar = json.loads(templar_path.read_text(encoding="utf8"))
BASE_CP = copy.deepcopy(arcanist["cp_plans"])


def relevant(line_ids: list[str]) -> list[dict]:
    out = []
    for line_id in line_ids:
        line = line_by_id[line_id]
        out.append({"id": line["id"], "name": line["name"], "max": line["max_rank"], "group": line["group"]})
    return out


class BuildRows:
    def __init__(self):
        self.rows: list[dict] = []
        self.priority = 10
        self.ids: set[str] = set()

    def add(self, catalog_id: str, *, row_id: str | None = None, status: str = "final",
            phase: str = "Final", notes: str = "", requires: list[str] | None = None,
            required_rank: int | None = None, name: str | None = None, section: str | None = None) -> str:
        line, skill = skill_by_id[catalog_id]
        rid = row_id or slug(name or skill["name"])
        if rid in self.ids:
            raise ValueError(f"duplicate row id {rid}")
        self.ids.add(rid)
        kind = skill["type"]
        display = name or skill["name"]
        if section is None:
            section = {
                "Morph": "Morph", "Passive": "Passive", "Ultimate": "Ultimate",
                "Scribing": "Scribing", "Active": line["group"]
            }.get(kind, line["group"])
        if required_rank is None:
            required_rank = skill.get("required_rank")
            if required_rank is None:
                required_rank = 1 if kind == "Passive" and line.get("currency") == "class_mastery_point" else 0
        base_name = None
        if skill.get("base_id"):
            base_name = skill_by_id[skill["base_id"]][1]["name"]
        row = {
            "id": rid,
            "name": display,
            "catalog_skill_id": catalog_id,
            "section": section,
            "line": line["id"],
            "required_rank": int(required_rank),
            "kind": kind,
            "phase": phase,
            "status": status,
            "priority": self.priority,
            "notes": notes,
            "morph_from": base_name,
            "image": None,
            "requires": list(requires or []),
        }
        self.rows.append(row)
        self.priority += 10
        return rid

    def family(self, base_id: str, morph_id: str, *, phase: str = "Early", notes: str = "",
               base_notes: str | None = None, status: str = "final") -> tuple[str, str]:
        base_name = skill_by_id[base_id][1]["name"]
        morph_name = skill_by_id[morph_id][1]["name"]
        base_row = self.add(base_id, row_id=slug(base_name), status=status, phase=phase,
                            notes=base_notes or f"Train {base_name} to rank IV, then take {morph_name}.")
        morph_row = self.add(morph_id, row_id=slug(morph_name), status=status, phase=phase,
                             notes=notes, requires=[base_row])
        return base_row, morph_row

    def passive_ranks(self, catalog_id: str, ranks: list[int], *, phase: str = "Final", notes: str = "") -> None:
        skill = skill_by_id[catalog_id][1]
        numerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"]
        for index, required_rank in enumerate(ranks):
            self.add(catalog_id, row_id=f"{slug(skill['name'])}_{index + 1}",
                     name=f"{skill['name']} {numerals[index]}", required_rank=required_rank,
                     phase=phase if required_rank >= 30 else ("Middle" if required_rank >= 18 else "Early"),
                     notes=notes or "Permanent passive rank.")


def add_class_passives(rows: BuildRows, line_ids: list[str]) -> None:
    rank_pairs = [(8, 18), (14, 27), (22, 36), (39, 50)]
    for line_id in line_ids:
        passives = [s for s in line_by_id[line_id]["skills"] if s["type"] == "Passive"]
        if len(passives) < 4:
            raise ValueError(f"{line_id} has fewer than four class passives")
        for skill, ranks in zip(passives[:4], rank_pairs):
            rows.passive_ranks(skill["id"], list(ranks), notes=f"Permanent {line_by_id[line_id]['name']} passive.")


def add_weapon_armor_passives(rows: BuildRows, resource: str) -> None:
    # Both bars use a destruction staff; the front bar uses daggers for offensive stats.
    for cid in [
        "dual_wield__focused_killer", "dual_wield__ambidextrous",
        "dual_wield__controlled_fury", "dual_wield__twin_blade_and_blunt",
    ]:
        rows.passive_ranks(cid, [10, 30], notes="Permanent Dual Wield damage passive.")
    for cid in [
        "destruction_staff__penetrating_magic", "destruction_staff__elemental_force",
        "destruction_staff__ancient_knowledge", "destruction_staff__destruction_expert",
    ]:
        rows.passive_ranks(cid, [10, 30], notes="Permanent Destruction Staff passive; skip Tri Focus for this setup.")
    if resource == "magicka":
        for cid in ["light_armor__evocation", "light_armor__spell_warding", "light_armor__prodigy", "light_armor__concentration"]:
            rows.passive_ranks(cid, [12, 36], notes="Core Light Armor passive.")
        rows.passive_ranks("medium_armor__dexterity", [2, 20, 40], notes="Improves the value of the Medium pieces in the final mix.")
        rows.passive_ranks("medium_armor__agility", [18, 36], notes="Improves damage from the Medium pieces in the final mix.")
    else:
        rows.passive_ranks("medium_armor__dexterity", [2, 20, 40], notes="Core Medium Armor critical passive.")
        for cid in ["medium_armor__wind_walker", "medium_armor__agility", "medium_armor__athletics"]:
            rows.passive_ranks(cid, [14, 34], notes="Core Medium Armor passive.")
        rows.passive_ranks("light_armor__concentration", [18, 36], notes="Useful penetration from the single Light piece.")
    rows.passive_ranks("undaunted__undaunted_mettle", [5, 9], notes="Rewards the mixed armor weights used by the build.")


def add_racial_passives(rows: BuildRows, race_line: str) -> None:
    skills = [s for s in line_by_id[race_line]["skills"] if s["type"] == "Passive"]
    rank_schedules = [[1, 10], [5, 15, 30], [10, 20, 40], [25, 35, 50]]
    for skill, schedule in zip(skills, rank_schedules):
        rows.passive_ranks(skill["id"], schedule[: int(skill.get("max_points") or 1)], notes="Recommended racial passive.")


def add_masteries(rows: BuildRows, mastery_line: str, mastery_ids: list[str]) -> None:
    for cid in mastery_ids:
        rows.add(cid, status="final", phase="Final", required_rank=1,
                 notes="One of the build's two recommended Class Mastery choices. Requires all three native class lines at rank 50; subclassing disables Class Mastery.")


def generic_cp(*, dot_heavy: bool = False) -> dict:
    cp = copy.deepcopy(BASE_CP)
    cp["warfare"]["final_slots"] = [
        "master_at_arms", "biting_aura", "thaumaturge" if dot_heavy else "fighting_finesse", "wrathful_strikes"
    ]
    return cp


def gear_stages(*, resource: str, armor: str, bridge_set: str, bridge_source: str,
                final_set: str, final_source: str, second_final: str = "Sul-Xan’s Torment or Whorl of the Depths") -> list[dict]:
    glyph = "Max Magicka" if resource == "magicka" else "Max Stamina"
    harm = "Magical Harm" if resource == "magicka" else "Physical Harm"
    return [
        {
            "id": "leveling", "name": "Leveling drops", "min_level": 1, "max_level": 49,
            "summary": f"Use Training gear, keep weapons near your level, and work toward {armor}. Do not farm permanent sets before CP160.",
            "pieces": [
                {"id": "armor_current_level_training", "slot": "Armor", "set": "Any current-level pieces", "source": "Quests, drops, or a crafted refresh", "trait": "Training preferred", "weight": armor},
                {"id": "front_two_current_level_daggers", "slot": "Front bar", "set": "Two current-level daggers", "source": "Replace every 5–10 levels", "trait": "Training preferred"},
                {"id": "back_current_level_inferno_staff", "slot": "Back bar after Level 15", "set": "Current-level Inferno Staff", "source": "Replace every 5–10 levels", "trait": "Training preferred"},
            ],
        },
        {
            "id": "starter", "name": "CP160 crafted starter", "min_level": 50, "max_level": 9999,
            "summary": "Order’s Wrath + Tide-Born Wildstalker + Highland Sentinel. These craftable sets are a dependable first permanent loadout.",
            "pieces": [
                {"id": "body_orders_wrath", "slot": "Five body pieces", "set": "Order’s Wrath", "source": "Steadfast Hammer and Saw, High Isle; crafted or bought", "trait": f"Divines / {glyph}"},
                {"id": "weapons_jewelry_tide_born", "slot": "Weapons and jewelry", "set": "Tide-Born Wildstalker", "source": "Tide-Born Foundry, Western Solstice; crafted or bought", "trait": f"Charged + Infused / Bloodthirsty / {harm}"},
                {"id": "remaining_highland_sentinel", "slot": "Remaining armor or jewelry", "set": "Highland Sentinel", "source": "Leftwheal Granary, West Weald; crafted or bought", "trait": f"Divines / Bloodthirsty / {glyph}"},
            ],
        },
        {
            "id": "mid", "name": "Strong non-trial bridge", "min_level": 50, "max_level": 9999,
            "summary": f"Farm {bridge_set}, keep one strong crafted five-piece while filling gaps, then add a solo mythic and arena staff when available.",
            "pieces": [
                {"id": f"body_{slug(bridge_set)}", "slot": "Body or weapons/jewelry", "set": bridge_set, "source": bridge_source, "trait": f"Divines / Bloodthirsty / {glyph}"},
                {"id": "other_five_piece_crafted", "slot": "Other five-piece", "set": "Order’s Wrath or Tide-Born Wildstalker", "source": "Crafted or guild traders", "trait": f"Divines / Bloodthirsty / {glyph}"},
                {"id": "ring_pale_order", "slot": "Ring", "set": "Ring of the Pale Order", "source": "Antiquities; optional for solo play", "trait": "Bloodthirsty"},
                {"id": "back_crushing_wall", "slot": "Back bar", "set": "Crushing Wall Inferno Staff", "source": "Maelstrom Arena", "trait": "Infused / Weapon Damage"},
            ],
        },
        {
            "id": "final", "name": "Optimized solo / duo endpoint", "min_level": 50, "max_level": 9999,
            "summary": f"Use {final_set} with {second_final}. Treat this as an endpoint menu rather than a rule: penetration, encounter movement, DLC access, and the presence of an outside healer can change the best combination.",
            "pieces": [
                {"id": f"body_{slug(final_set)}", "slot": "Primary five-piece", "set": final_set, "source": final_source, "trait": f"Divines / {glyph}"},
                {"id": f"weapons_jewelry_{slug(second_final)}", "slot": "Second five-piece", "set": second_final, "source": "Trial or dungeon alternative; use a crafted set until acquired", "trait": f"Bloodthirsty / Charged / {harm}"},
                {"id": "monster_one_piece", "slot": "Head or shoulder", "set": "Slimecraw or Valkyn Skoria (1 piece)", "source": "Wayrest Sewers I or City of Ash II", "trait": "Divines"},
                {"id": "ring_pale_order", "slot": "Ring", "set": "Ring of the Pale Order", "source": "Antiquities; remove when an outside healer needs to heal you", "trait": "Bloodthirsty"},
                {"id": "back_crushing_wall", "slot": "Back bar", "set": "Crushing Wall Inferno Staff", "source": "Maelstrom Arena", "trait": "Infused / Weapon Damage"},
            ],
        },
    ]


def consumables(resource: str) -> dict:
    if resource == "magicka":
        foods = [
            {"name": "Clockwork Citrus Filet", "use": "Premium solo Health, Magicka, and recovery"},
            {"name": "Witchmother’s Potent Brew", "use": "Budget Health and Magicka sustain"},
            {"name": "Artaeum Pickled Fish Bowl", "use": "Larger Health and Magicka pools when sustain is already comfortable"},
        ]
        power = "Spell Power potion"
    else:
        foods = [
            {"name": "Orzorga’s Smoked Bear Haunch", "use": "General solo sustain and recovery"},
            {"name": "Dubious Camoran Throne", "use": "Budget Health and Stamina sustain"},
            {"name": "Braised Rabbit with Spring Vegetables", "use": "Larger Health and Stamina pools when sustain is already comfortable"},
        ]
        power = "Weapon Power potion"
    return {
        "foods": foods,
        "potions": [
            {"name": "Tri-stat potion", "use": "Default solo emergency recovery"},
            {"name": power, "use": "Damage option when the build is not already supplying the major offensive buffs"},
            {"name": "Armor potion", "use": "Situational defensive option for difficult solo encounters"},
        ],
        "pvp_alternatives": [
            {"name": "Bewitched Sugar Skulls", "use": "Larger pools for a future PvP variant"},
            {"name": "Immovability or detection potion", "use": "Future PvP utility; the launch JSON is not a PvP build"},
        ],
    }


def variants() -> list[dict]:
    return [
        {"id": "solo-duo", "name": "Solo / Duo PvE", "summary": "The progression-oriented launch build exactly as written.", "available": True, "overrides": None},
        {"id": "group-dps", "name": "Organized Group DPS", "summary": "Planned encounter-focused variant.", "available": False,
         "unavailable_reason": "This launch file intentionally does not pretend the solo/duo bars and gear are an optimized organized-group loadout.", "overrides": None},
        {"id": "pvp", "name": "PvP", "summary": "Planned PvP variant.", "available": False,
         "unavailable_reason": "PvP needs its own attributes, defenses, bars, gear, and consumables. Those overrides are not authored yet.", "overrides": None},
    ]


def base_tips(class_name: str) -> list[str]:
    return [
        f"Keep one skill from each native {class_name} line on the active bar whenever XP lands until all three reach rank 50.",
        "Join Fighters Guild, Mages Guild, and Undaunted early; train mount Speed every day.",
        "Unlock all three armor lines by equipping three pieces of each weight once, then return to the build’s leveling mix.",
        "Do not buy Destruction Staff Tri Focus for this setup; it can change blocking behavior with an Ice Staff and is not needed here.",
        "Ring of the Pale Order blocks outside healing. Remove it when a duo partner or group healer needs to heal you.",
        "The two listed Class Mastery choices require all three native class lines at rank 50. Subclassing disables Class Mastery.",
        "Scribing abilities are optional progression gates. Use the named temporary class or weapon skill until the Grimoire and scripts are unlocked.",
    ]


def make_build(*, build_id: str, name: str, short_name: str, class_name: str, race: str, race_line: str,
               resource: str, summary: str, accent: str, concepts: list[dict], rows: BuildRows,
               phases: list[dict], bridge_set: str, bridge_source: str, final_set: str, final_source: str,
               alliance: str = "Ebonheart Pact", dot_heavy: bool = False,
               extra_tips: list[str] | None = None) -> dict:
    class_lines = {
        "Dragonknight": ["ardent_flame", "draconic_power", "earthen_heart", "dragonknight_mastery"],
        "Sorcerer": ["dark_magic", "daedric_summoning", "storm_calling", "sorcerer_mastery"],
        "Nightblade": ["assassination", "shadow", "siphoning", "nightblade_mastery"],
        "Warden": ["animal_companions", "green_balance", "winters_embrace", "warden_mastery"],
        "Necromancer": ["grave_lord", "bone_tyrant", "living_death", "necromancer_mastery"],
    }[class_name]
    used_lines = class_lines + ["dual_wield", "destruction_staff", "light_armor", "medium_armor", "fighters_guild", "mages_guild", "undaunted", race_line, "scribing"]
    # Keep line order stable while removing anything unused by an authored row.
    row_lines = {row["line"] for row in rows.rows}
    used_lines = [x for x in used_lines if x in row_lines]
    armor = "5 Light / 1 Medium / 1 Heavy" if resource == "magicka" else "5 Medium / 1 Light / 1 Heavy"
    end_armor = "5 Light / 2 Medium" if resource == "magicka" else "6 Medium / 1 Light"
    attributes = {"stamina": 64 if resource == "stamina" else 0, "magicka": 64 if resource == "magicka" else 0, "health": 0}
    return {
        "schema_version": 2,
        "id": build_id,
        "name": name,
        "short_name": short_name,
        "author": AUTHOR,
        "game_version": GAME_VERSION,
        "verified_date": VERIFIED_DATE,
        "summary": summary,
        "theme": {"accent": accent},
        "images": {},
        "defaults": {
            "class": class_name, "race": race, "alliance": alliance, "eso_plus": False,
            "attributes": attributes, "mundus": "The Thief", "front_weapon": "Dual Daggers",
            "back_weapon": "Inferno Staff at Level 15", "leveling_armor": armor,
            "endgame_armor": end_armor, "leveling_trait": "Training", "gear_cap": "Level 50 / CP160",
        },
        "concepts": concepts,
        "relevant_lines": relevant(used_lines),
        "cp_plans": generic_cp(dot_heavy=dot_heavy),
        "unlock_order": rows.rows,
        "phases": phases,
        "gear_stages": gear_stages(resource=resource, armor=armor, bridge_set=bridge_set,
                                   bridge_source=bridge_source, final_set=final_set, final_source=final_source),
        "consumables": consumables(resource),
        "tips": base_tips(class_name) + list(extra_tips or []),
        "variants": variants(),
    }


def common_finish(rows: BuildRows, *, class_lines: list[str], race_line: str, resource: str, mastery_line: str, mastery_ids: list[str]) -> None:
    add_class_passives(rows, class_lines)
    add_weapon_armor_passives(rows, resource)
    add_racial_passives(rows, race_line)
    add_masteries(rows, mastery_line, mastery_ids)


# ------------------------------ Dragonknight ------------------------------
dk = BuildRows()
dk.add("ardent_flame__fiery_grip", status="temporary", phase="Leveling", notes="Starter Ardent Flame leveling slot; replace it as the damage kit opens.")
dk.add("earthen_heart__stonefist", status="temporary", phase="Leveling", notes="Starter Earthen Heart leveling slot; do not build the final rotation around it.")
dk.family("draconic_power__spiked_armor", "draconic_power__volatile_armor", notes="Defensive buff and damaging armor pulse for difficult solo fights.")
dk.family("ardent_flame__searing_strike", "ardent_flame__venomous_claw", notes="Long single-target flame DoT; refresh after it expires rather than clipping it early.")
dk.family("ardent_flame__fiery_breath", "ardent_flame__noxious_breath", phase="Middle", notes="Strong cone damage and class debuff for packs.")
dk.family("ardent_flame__lava_whip", "ardent_flame__molten_whip", phase="Middle", notes="Primary direct attack and payoff for the class damage loop.")
dk.family("draconic_power__inhale", "draconic_power__deep_breath", phase="Late", notes="Solo sustain engine and AoE pulse; keep it active as pressure rises.")
dk.family("ardent_flame__inferno", "ardent_flame__flames_of_oblivion", phase="Late", notes="Fire damage and offensive buff source.")
dk.family("earthen_heart__molten_weapons", "earthen_heart__igneous_weapons", phase="Early", notes="Long-duration offensive buff for you and nearby allies.")
dk.family("draconic_power__dragon_leap", "draconic_power__take_flight", phase="Middle", notes="Cheap burst ultimate and mobility tool.")
dk.family("ardent_flame__dragonknight_standard", "ardent_flame__standard_of_might", phase="Middle", notes="Main stationary boss ultimate when the target will remain in the banner.")
dk.family("destruction_staff__wall_of_elements", "destruction_staff__elemental_blockade", phase="Early", notes="Back-bar ground DoT and Crushing Wall trigger.")
dk.family("destruction_staff__weakness_to_elements", "destruction_staff__elemental_susceptibility", phase="Middle", notes="Solo penetration and status-effect support.")
dk.add("scribing__ulfsild_s_contingency", row_id="ulfsild_s_contingency", phase="Late", notes="Optional Scribing AoE/utility slot; use another class DoT until unlocked.")
common_finish(dk, class_lines=["ardent_flame", "draconic_power", "earthen_heart"], race_line="nord", resource="magicka",
              mastery_line="dragonknight_mastery", mastery_ids=["dragonknight_mastery__recursive_flame", "dragonknight_mastery__stone_blooded"])

dk_build = make_build(
    build_id="magicka_dragonknight_solo_duo", name="Magicka Dragonknight Solo / Duo", short_name="Magicka Dragonknight",
    class_name="Dragonknight", race="Nord", race_line="nord", resource="magicka", accent="#f4774b",
    summary="Pure-class flame brawler built around Molten Whip, layered class DoTs, Soul of Flame sustain, and two flexible ultimates.",
    concepts=[
        {"title": "Primary resource", "text": "Put normal attribute points into Magicka. The build still uses daggers because ESO damage scaling is hybrid."},
        {"title": "Flame pressure", "text": "Layer Searing Claw, Disintegrating Dragonfire, Incinerate, and Blockade, then use Molten Whip while the effects run."},
        {"title": "Solo sustain", "text": "Soul of Flame is the safety valve: use it as resources fall and when several enemies are grouped around you."},
        {"title": "Ultimate choice", "text": "Use Take Flight for cheap burst or movement; use Standard of Might when a boss will remain inside it."},
    ], rows=dk,
    phases=[
        {"id": "1-15", "label": "Levels 1–15", "min_level": 1, "max_level": 14, "overview": "Open all three class lines and train daggers. Use Fiery Grip, Earthspike Mantle, and Stonefist as temporary line-leveling slots.", "front": ["Fiery Grip", "Earthspike Mantle", "Stonefist", "Searing Strike", "Any Dual Wield skill"], "back": [], "rotation": ["Earthspike Mantle", "Searing Strike", "basic attacks and available class skills"]},
        {"id": "15-30", "label": "Levels 15–30", "min_level": 15, "max_level": 29, "overview": "Add the Inferno Staff bar, Blockade, Susceptibility, Igneous Weapons, and the first class passives.", "front": ["Searing Claw", "Dragonfire Breath", "Igneous Weapons", "Earthspike Mantle", "class-line leveling slot"], "back": ["Elemental Blockade", "Elemental Susceptibility", "class-line leveling slots"], "rotation": ["Igneous Weapons", "Blockade", "Susceptibility", "Searing Claw", "Dragonfire Breath"]},
        {"id": "30-50", "label": "Levels 30–50", "min_level": 30, "max_level": 49, "overview": "Molten Whip becomes the main direct attack. Add Soul of Flame and Incinerate as their ranks unlock.", "front": ["Molten Whip", "Searing Claw", "Disintegrating Dragonfire", "Soul of Flame", "Incinerate"], "back": ["Shatterspike Mantle", "Elemental Blockade", "Elemental Susceptibility", "Igneous Weapons", "Ulfsild’s Contingency or class DoT"], "rotation": ["buff and armor", "Blockade and Susceptibility", "class DoTs", "Soul of Flame as needed", "Molten Whip"]},
        {"id": "final", "label": "Level 50 / CP160+", "min_level": 50, "max_level": 9999, "overview": "Complete both Class Mastery choices, finish passives, and move through crafted, bridge, and optimized gear without changing the core loop.", "front": ["Molten Whip", "Searing Claw", "Disintegrating Dragonfire", "Soul of Flame", "Incinerate", "Take Flight"], "back": ["Shatterspike Mantle", "Elemental Blockade", "Elemental Susceptibility", "Igneous Weapons", "Ulfsild’s Contingency", "Standard of Might"], "rotation": ["Igneous Weapons and armor", "Blockade and Susceptibility", "refresh class DoTs", "Soul of Flame for sustain/AoE", "Molten Whip until refreshes"]},
    ], bridge_set="Pyrebrand", bridge_source="Dragonknight class set from Infinite Archive", final_set="Pyrebrand", final_source="Infinite Archive",
    dot_heavy=True, extra_tips=["Do not refresh Searing Claw too early; its later ticks are the most valuable.", "Standard of Might loses value when enemies move out of it, so Take Flight is often better in mobile fights."],
)

# ------------------------------- Sorcerer ---------------------------------
sorc = BuildRows()
sorc.family("dark_magic__crystal_shard", "dark_magic__crystal_fragments", notes="Cast the highlighted instant proc; do not hard-cast it repeatedly unless the situation demands it.")
sorc.add("daedric_summoning__summon_unstable_familiar", status="temporary", phase="Leveling", notes="Starter Daedric Summoning leveling slot. This launch build is not pet-dependent.")
sorc.add("storm_calling__mage_s_fury", status="temporary", phase="Leveling", notes="Starter Storm Calling attack; replace it when the final bar takes shape.")
sorc.family("storm_calling__lightning_splash", "storm_calling__liquid_lightning", phase="Middle", notes="Ground DoT for stationary targets and packs.")
sorc.family("daedric_summoning__bound_armor", "daedric_summoning__bound_armaments", phase="Late", notes="Passive bar value plus a timed projectile when enough daggers are stored.")
sorc.family("storm_calling__lightning_form", "storm_calling__hurricane", phase="Early", notes="Armor, mobility, and close-range damage.")
sorc.family("storm_calling__surge", "storm_calling__critical_surge", phase="Middle", notes="Core solo healing and long-duration offensive buff.")
sorc.family("storm_calling__overload", "storm_calling__power_overload", phase="Middle", notes="Flexible front-bar ultimate for sustained single-target pressure.")
sorc.family("daedric_summoning__summon_storm_atronach", "daedric_summoning__charged_atronach", phase="Middle", notes="Back-bar boss ultimate and group synergy.")
sorc.family("destruction_staff__wall_of_elements", "destruction_staff__elemental_blockade", phase="Early", notes="Back-bar ground DoT and Crushing Wall trigger.")
sorc.family("destruction_staff__weakness_to_elements", "destruction_staff__elemental_susceptibility", phase="Middle", notes="Solo penetration and status-effect support.")
sorc.family("fighters_guild__trap_beast", "fighters_guild__barbed_trap", phase="Late", notes="Critical-damage buff and single-target DoT; replace for ranged or defensive needs.")
sorc.add("scribing__traveling_knife", row_id="traveling_knife", phase="Late", notes="Optional Scribing spammable/utility slot; use Force Shock or a class skill until unlocked.")
sorc.add("scribing__ulfsild_s_contingency", row_id="ulfsild_s_contingency", phase="Late", notes="Optional Scribing AoE/utility slot.")
common_finish(sorc, class_lines=["dark_magic", "daedric_summoning", "storm_calling"], race_line="nord", resource="magicka",
              mastery_line="sorcerer_mastery", mastery_ids=["sorcerer_mastery__storm_lashed", "sorcerer_mastery__daedric_reservoir"])

sorc_build = make_build(
    build_id="magicka_sorcerer_solo_duo", name="Magicka Sorcerer Solo / Duo", short_name="Magicka Sorcerer",
    class_name="Sorcerer", race="Nord", race_line="nord", resource="magicka", accent="#8a70ff",
    summary="Pure-class lightning caster with Critical Surge healing, Crystal Fragments procs, Hurricane defense, and flexible Scribing slots.",
    concepts=[
        {"title": "Primary resource", "text": "Put normal attribute points into Magicka; the daggers provide offensive stats while the class abilities supply most attacks."},
        {"title": "Proc discipline", "text": "Crystal Fragments is strongest when its instant proc appears. Continue the normal rotation instead of hard-casting it over and over."},
        {"title": "Self-healing", "text": "Keep Critical Surge active before combat. Critical damage then supplies steady healing while Hurricane adds armor and movement."},
        {"title": "No mandatory pets", "text": "A familiar is used early to level Daedric Summoning, but the final setup avoids double-bar pet pressure."},
    ], rows=sorc,
    phases=[
        {"id": "1-15", "label": "Levels 1–15", "min_level": 1, "max_level": 14, "overview": "Open all three class lines with Crystal Shard, a Familiar, and Mage’s Fury. Train daggers and light armor.", "front": ["Crystal Shard", "Summon Unstable Familiar", "Mage’s Fury", "Any Dual Wield skill", "flex slot"], "back": [], "rotation": ["summon Familiar", "Mage’s Fury", "Crystal Shard or weapon attack"]},
        {"id": "15-30", "label": "Levels 15–30", "min_level": 15, "max_level": 29, "overview": "Add the Inferno Staff bar, Blockade, Susceptibility, Hurricane, and Liquid Lightning.", "front": ["Crystal Fragments", "Hurricane", "class-line leveling slots"], "back": ["Elemental Blockade", "Elemental Susceptibility", "Liquid Lightning", "class-line leveling slot"], "rotation": ["Hurricane", "Blockade", "Susceptibility", "Liquid Lightning", "Crystal Fragments when proc is ready"]},
        {"id": "30-50", "label": "Levels 30–50", "min_level": 30, "max_level": 49, "overview": "Critical Surge completes the solo engine; add Bound Armaments, Barbed Trap, and Scribing options later.", "front": ["Traveling Knife or Force Shock", "Liquid Lightning", "Bound Armaments", "Crystal Fragments", "Ulfsild’s Contingency"], "back": ["Hurricane", "Critical Surge", "Elemental Susceptibility", "Elemental Blockade", "Barbed Trap"], "rotation": ["Critical Surge and Hurricane", "Blockade and Susceptibility", "ground effects", "spammable", "instant Crystal Fragments procs"]},
        {"id": "final", "label": "Level 50 / CP160+", "min_level": 50, "max_level": 9999, "overview": "Finish class passives and Mastery, then use the same proc-based loop while progressing through permanent gear.", "front": ["Traveling Knife", "Liquid Lightning", "Bound Armaments", "Crystal Fragments", "Ulfsild’s Contingency", "Power Overload"], "back": ["Hurricane", "Critical Surge", "Elemental Susceptibility", "Elemental Blockade", "Barbed Trap", "Charged Atronach"], "rotation": ["Critical Surge and Hurricane", "Blockade, Susceptibility, Liquid Lightning, Trap", "Traveling Knife", "instant Fragments", "fire Bound Armaments at full stacks"]},
    ], bridge_set="Beacon of Oblivion", bridge_source="Sorcerer class set from Infinite Archive", final_set="Beacon of Oblivion", final_source="Infinite Archive",
    extra_tips=["Keep Critical Surge active before entering a dangerous pull; it is the build’s main passive healing engine.", "Permanent pets consume a slot on both bars. This launch setup uses them only as optional alternatives."],
)

# ------------------------------- Nightblade -------------------------------
nb = BuildRows()
nb.family("assassination__assassin_s_blade", "assassination__killer_s_blade", notes="Fast execute; begin using it aggressively when the target reaches execute range.")
nb.family("shadow__shadow_cloak", "shadow__shadowy_disguise", notes="Guaranteed critical setup and defensive reset; use it deliberately rather than on cooldown.")
nb.add("siphoning__strife", status="temporary", phase="Leveling", notes="Starter Siphoning attack and line-leveling slot.")
nb.family("shadow__veiled_strike", "shadow__surprise_attack", phase="Early", notes="Primary melee spammable outside execute.")
nb.family("assassination__grim_focus", "assassination__merciless_resolve", phase="Late", notes="Maintain stacks and fire the spectral bow proc when ready.")
nb.family("siphoning__drain_power", "siphoning__power_extraction", phase="Late", notes="AoE damage and offensive buff source.")
nb.family("assassination__death_stroke", "assassination__soul_harvest", phase="Middle", notes="Cheap ultimate with excellent ultimate generation after kills.")
nb.family("shadow__summon_shade", "shadow__dark_shade", phase="Late", notes="Persistent class damage and Shadow-line representation.")
nb.family("siphoning__siphoning_strikes", "siphoning__siphoning_attacks", phase="Middle", notes="Sustain tool; keep it active in long encounters.")
nb.family("destruction_staff__wall_of_elements", "destruction_staff__elemental_blockade", phase="Early", notes="Back-bar ground DoT and Crushing Wall trigger.")
nb.family("destruction_staff__weakness_to_elements", "destruction_staff__elemental_susceptibility", phase="Middle", notes="Solo penetration and status-effect support.")
nb.family("mages_guild__meteor", "mages_guild__shooting_star", phase="Late", notes="Back-bar AoE ultimate and Mages Guild payoff.")
nb.add("scribing__ulfsild_s_contingency", row_id="ulfsild_s_contingency", phase="Late", notes="Optional Scribing AoE/utility slot; use a class DoT until unlocked.")
common_finish(nb, class_lines=["assassination", "shadow", "siphoning"], race_line="khajiit", resource="stamina",
              mastery_line="nightblade_mastery", mastery_ids=["nightblade_mastery__critical_motivation", "nightblade_mastery__bloodied_precision"])

nb_build = make_build(
    build_id="stamina_nightblade_solo_duo", name="Stamina Nightblade Solo / Duo", short_name="Stamina Nightblade",
    class_name="Nightblade", race="Khajiit", race_line="khajiit", resource="stamina", alliance="Aldmeri Dominion", accent="#d85174",
    summary="Pure-class melee assassin using Surprise Attack, Merciless Resolve, Soul Harvest, and a fast Killer’s Blade execute.",
    concepts=[
        {"title": "Primary resource", "text": "Put normal attribute points into Stamina. Magicka remains available for cloak and utility."},
        {"title": "Execute identity", "text": "Use Surprise Attack through most of the fight, then pivot hard into Killer’s Blade as the target drops."},
        {"title": "Spectral bow", "text": "Merciless Resolve rewards steady light-attack weaving. Fire the proc instead of letting full stacks sit unused."},
        {"title": "Defensive control", "text": "Shadowy Disguise can force a critical hit, break pressure, or reposition. Save it for a reason."},
    ], rows=nb,
    phases=[
        {"id": "1-15", "label": "Levels 1–15", "min_level": 1, "max_level": 14, "overview": "Open Assassination, Shadow, and Siphoning immediately. Train daggers and medium armor while using the starter skills.", "front": ["Assassin’s Blade", "Shadow Cloak", "Strife", "Veiled Strike", "Any Dual Wield skill"], "back": [], "rotation": ["Shadow Cloak when useful", "Veiled Strike", "Assassin’s Blade on low-health targets"]},
        {"id": "15-30", "label": "Levels 15–30", "min_level": 15, "max_level": 29, "overview": "Add the Inferno Staff bar, Blockade, Susceptibility, Soul Harvest, and early passives.", "front": ["Surprise Attack", "Killer’s Blade", "Shadowy Disguise", "class-line leveling slots"], "back": ["Elemental Blockade", "Elemental Susceptibility", "class-line leveling slots"], "rotation": ["Blockade and Susceptibility", "Surprise Attack", "Killer’s Blade in execute"]},
        {"id": "30-50", "label": "Levels 30–50", "min_level": 30, "max_level": 49, "overview": "Add Siphoning Attacks, Merciless Resolve, Dark Shade, Power Extraction, and the Scribing slot as they unlock.", "front": ["Surprise Attack", "Killer’s Blade", "Merciless Resolve", "Power Extraction", "Shadowy Disguise"], "back": ["Ulfsild’s Contingency", "Dark Shade", "Elemental Susceptibility", "Elemental Blockade", "Siphoning Attacks"], "rotation": ["Siphoning Attacks", "Shade, Blockade, Susceptibility", "Merciless Resolve", "Surprise Attack", "spectral bow proc", "Killer’s Blade execute"]},
        {"id": "final", "label": "Level 50 / CP160+", "min_level": 50, "max_level": 9999, "overview": "Finish all class passives and Mastery, then refine the same priority loop as gear improves.", "front": ["Surprise Attack", "Killer’s Blade", "Merciless Resolve", "Power Extraction", "Shadowy Disguise", "Soul Harvest"], "back": ["Ulfsild’s Contingency", "Dark Shade", "Elemental Susceptibility", "Elemental Blockade", "Siphoning Attacks", "Shooting Star"], "rotation": ["Siphoning Attacks", "back-bar effects", "Merciless Resolve", "Surprise Attack", "spectral bow", "Killer’s Blade in execute"]},
    ], bridge_set="Tzogvin’s Warband", bridge_source="Frostvault", final_set="Tzogvin’s Warband or Tide-Born Wildstalker", final_source="Frostvault or crafted",
    extra_tips=["Nightblade is timing-sensitive. Missing light attacks delays Merciless Resolve and makes the build feel much weaker.", "Killer’s Blade is not the main attack at full health; reserve it for execute."],
)

# -------------------------------- Warden ----------------------------------
warden = BuildRows()
warden.add("animal_companions__dive", status="temporary", phase="Leveling", notes="Starter Animal Companions attack and line-leveling slot.")
warden.add("green_balance__fungal_growth", status="temporary", phase="Leveling", notes="Starter heal and Green Balance line-leveling slot.")
warden.add("winters_embrace__frost_cloak", status="temporary", phase="Leveling", notes="Starter Winter’s Embrace buff and line-leveling slot.")
warden.family("animal_companions__scorch", "animal_companions__subterranean_assault", phase="Early", notes="Delayed burst; recast on cadence so the second hit is not lost.")
warden.family("animal_companions__betty_netch", "animal_companions__blue_betty", phase="Late", notes="Free sustain, offensive buff, and periodic cleanse.")
warden.family("animal_companions__feral_guardian", "animal_companions__wild_guardian", phase="Middle", notes="Permanent bear ultimate; slot it on both bars to keep the bear active.")
warden.family("green_balance__lotus_flower", "green_balance__lotus_blossom", phase="Late", notes="Critical buff plus healing from light and heavy attacks.")
warden.family("winters_embrace__impaling_shards", "winters_embrace__winter_s_revenge", phase="Early", notes="Primary frost ground DoT.")
warden.family("winters_embrace__arctic_wind", "winters_embrace__arctic_blast", phase="Middle", notes="Burst heal and close-range frost damage/control.")
warden.family("winters_embrace__sleet_storm", "winters_embrace__northern_storm", phase="Middle", notes="Defensive back-bar ultimate alternative when the bear is not needed.")
warden.family("destruction_staff__wall_of_elements", "destruction_staff__elemental_blockade", phase="Early", notes="Back-bar ground DoT and Crushing Wall trigger.")
warden.family("destruction_staff__weakness_to_elements", "destruction_staff__elemental_susceptibility", phase="Middle", notes="Solo penetration and status-effect support.")
warden.add("scribing__wield_soul", row_id="wield_soul", phase="Late", notes="Optional sustain-oriented Scribing spammable; use Dive or Force Shock until unlocked.")
warden.add("scribing__traveling_knife", row_id="traveling_knife", phase="Late", notes="Optional Scribing damage/utility slot.")
warden.add("scribing__ulfsild_s_contingency", row_id="ulfsild_s_contingency", phase="Late", notes="Optional Scribing AoE/utility slot.")
common_finish(warden, class_lines=["animal_companions", "green_balance", "winters_embrace"], race_line="nord", resource="magicka",
              mastery_line="warden_mastery", mastery_ids=["warden_mastery__seasonal_strength", "warden_mastery__winter_s_dominion"])

warden_build = make_build(
    build_id="magicka_warden_solo_duo", name="Magicka Warden Solo / Duo", short_name="Magicka Warden",
    class_name="Warden", race="Nord", race_line="nord", resource="magicka", accent="#72c9aa",
    summary="Pure-class frost-and-animal caster with Subterranean Assault timing, Blue Betty sustain, Arctic Blast safety, and the Wild Guardian bear.",
    concepts=[
        {"title": "Primary resource", "text": "Put normal attribute points into Magicka. Class skills and Scribing supply the attack loop while daggers add offensive stats."},
        {"title": "Delayed burst", "text": "Subterranean Assault is scheduled damage. Recast it on cadence and allow both eruptions to happen."},
        {"title": "Clean sustain", "text": "Blue Betty costs nothing, restores Magicka, supplies an offensive buff, and periodically removes a negative effect."},
        {"title": "Bear rules", "text": "Wild Guardian must be slotted on both bars. Northern Storm is the defensive alternative when the bear is not part of the encounter plan."},
    ], rows=warden,
    phases=[
        {"id": "1-15", "label": "Levels 1–15", "min_level": 1, "max_level": 14, "overview": "Open all three Warden lines with Dive, Fungal Growth, and Frost Cloak, then add Scorch and Impaling Shards.", "front": ["Dive", "Fungal Growth", "Frost Cloak", "Scorch", "Impaling Shards"], "back": [], "rotation": ["Frost Cloak", "Scorch", "Impaling Shards", "Dive"]},
        {"id": "15-30", "label": "Levels 15–30", "min_level": 15, "max_level": 29, "overview": "Add the Inferno Staff bar, Blockade, Susceptibility, Subterranean Assault, Winter’s Revenge, and the bear.", "front": ["Subterranean Assault", "Dive or Force Shock", "class-line leveling slots", "Wild Guardian"], "back": ["Winter’s Revenge", "Elemental Blockade", "Elemental Susceptibility", "class-line leveling slot", "Wild Guardian"], "rotation": ["Subterranean Assault", "Winter’s Revenge and Blockade", "Susceptibility", "spammable"]},
        {"id": "30-50", "label": "Levels 30–50", "min_level": 30, "max_level": 49, "overview": "Blue Betty and Lotus Blossom stabilize sustain; Arctic Blast adds a strong emergency heal while Scribing fills the final slots.", "front": ["Wield Soul or Force Shock", "Subterranean Assault", "Blue Betty", "Traveling Knife", "Arctic Blast", "Wild Guardian"], "back": ["Winter’s Revenge", "Lotus Blossom", "Elemental Susceptibility", "Elemental Blockade", "Ulfsild’s Contingency", "Wild Guardian"], "rotation": ["Blue Betty and Lotus Blossom", "Subterranean Assault", "back-bar ground effects", "spammable", "Arctic Blast as needed"]},
        {"id": "final", "label": "Level 50 / CP160+", "min_level": 50, "max_level": 9999, "overview": "Finish class passives and Mastery, keep the delayed-burst cadence clean, and progress through permanent gear.", "front": ["Wield Soul", "Subterranean Assault", "Blue Betty", "Traveling Knife", "Arctic Blast", "Wild Guardian"], "back": ["Winter’s Revenge", "Lotus Blossom", "Elemental Susceptibility", "Elemental Blockade", "Ulfsild’s Contingency", "Wild Guardian or Northern Storm"], "rotation": ["Blue Betty and Lotus Blossom", "Subterranean Assault", "Winter’s Revenge, Blockade, Susceptibility, Contingency", "Wield Soul", "bear command when ready"]},
    ], bridge_set="Aerie’s Cry", bridge_source="Warden class set from Infinite Archive", final_set="Aerie’s Cry", final_source="Infinite Archive",
    dot_heavy=True, extra_tips=["Wild Guardian disappears if it is not slotted on both bars.", "Blue Betty can remove negative effects, so refresh it deliberately in encounters with purgeable damage-over-time effects."],
)

# ------------------------------ Necromancer -------------------------------
necro = BuildRows()
necro.family("grave_lord__flame_skull", "grave_lord__venom_skull", notes="Primary Stamina spammable when no corpse skill or effect needs refreshing.")
necro.add("bone_tyrant__death_scythe", status="temporary", phase="Leveling", notes="Starter Bone Tyrant damage/heal and line-leveling slot.")
necro.add("living_death__render_flesh", status="temporary", phase="Leveling", notes="Starter emergency heal and Living Death line-leveling slot.")
necro.family("grave_lord__sacrificial_bones", "grave_lord__blighted_blastbones", phase="Early", notes="Core corpse generator and class damage effect.")
necro.family("grave_lord__boneyard", "grave_lord__avid_boneyard", phase="Middle", notes="Ground AoE that consumes and benefits from corpses.")
necro.family("grave_lord__skeletal_mage", "grave_lord__archer", phase="Middle", notes="Persistent summon and repeatable corpse source when it expires.")
necro.family("grave_lord__shocking_siphon", "grave_lord__detonating_siphon", phase="Late", notes="Corpse tether and Corpseburster trigger; requires a nearby corpse.")
necro.family("grave_lord__frozen_colossus", "grave_lord__pestilent_colossus", phase="Middle", notes="Main boss ultimate and group vulnerability tool.")
necro.family("bone_tyrant__bone_armor", "bone_tyrant__summoner_s_armor", phase="Early", notes="Armor buff that also reduces summon costs.")
necro.family("living_death__spirit_mender", "living_death__spirit_guardian", phase="Late", notes="Persistent healing and damage transfer for difficult solo content.")
necro.family("destruction_staff__wall_of_elements", "destruction_staff__elemental_blockade", phase="Early", notes="Back-bar ground DoT and Crushing Wall trigger.")
necro.family("destruction_staff__weakness_to_elements", "destruction_staff__elemental_susceptibility", phase="Middle", notes="Solo penetration and status-effect support.")
necro.family("fighters_guild__trap_beast", "fighters_guild__barbed_trap", phase="Late", notes="Critical-damage buff and single-target DoT.")
necro.family("mages_guild__meteor", "mages_guild__shooting_star", phase="Late", notes="Back-bar AoE ultimate alternative.")
common_finish(necro, class_lines=["grave_lord", "bone_tyrant", "living_death"], race_line="dark_elf", resource="stamina",
              mastery_line="necromancer_mastery", mastery_ids=["necromancer_mastery__death_s_covenant", "necromancer_mastery__corpse_weaver"])

necro_build = make_build(
    build_id="stamina_necromancer_solo_duo", name="Stamina Necromancer Solo / Duo", short_name="Stamina Necromancer",
    class_name="Necromancer", race="Dark Elf", race_line="dark_elf", resource="stamina", accent="#78b67d",
    summary="Pure-class corpse engine using Grave Lord’s Sacrifice, Detonating Siphon, Avid Boneyard, and Corpseburster-style progression.",
    concepts=[
        {"title": "Primary resource", "text": "Put normal attribute points into Stamina. Magicka remains available for armor and support skills."},
        {"title": "Corpses are a resource", "text": "Several abilities need a corpse. Summons, defeated enemies, and Grave Lord’s Sacrifice feed the loop."},
        {"title": "Priority rotation", "text": "Necromancer is less about a rigid script and more about keeping summons and ground effects active, then consuming corpses efficiently."},
        {"title": "Solo safety", "text": "Summoner’s Armor and Spirit Guardian lower incoming pressure while Venom Skull fills empty globals."},
    ], rows=necro,
    phases=[
        {"id": "1-15", "label": "Levels 1–15", "min_level": 1, "max_level": 14, "overview": "Open Grave Lord, Bone Tyrant, and Living Death with Flame Skull, Death Scythe, and Render Flesh. Add Sacrificial Bones quickly.", "front": ["Flame Skull", "Sacrificial Bones", "Death Scythe", "Render Flesh", "Any Dual Wield skill"], "back": [], "rotation": ["Sacrificial Bones", "Flame Skull", "Death Scythe or Render Flesh as needed"]},
        {"id": "15-30", "label": "Levels 15–30", "min_level": 15, "max_level": 29, "overview": "Add the Inferno Staff bar, Blockade, Susceptibility, Summoner’s Armor, Avid Boneyard, and Pestilent Colossus.", "front": ["Venom Skull", "Grave Lord’s Sacrifice", "Avid Boneyard", "class-line leveling slots"], "back": ["Summoner’s Armor", "Elemental Blockade", "Elemental Susceptibility", "class-line leveling slot"], "rotation": ["Armor", "Grave Lord’s Sacrifice", "Blockade and Susceptibility", "Avid Boneyard", "Venom Skull"]},
        {"id": "30-50", "label": "Levels 30–50", "min_level": 30, "max_level": 49, "overview": "Add Skeletal Archer and Spirit Guardian, then Detonating Siphon once the Grave Lord line reaches its final unlock.", "front": ["Detonating Siphon", "Grave Lord’s Sacrifice", "Venom Skull", "Avid Boneyard", "Skeletal Archer"], "back": ["Summoner’s Armor", "Spirit Guardian", "Elemental Susceptibility", "Elemental Blockade", "Barbed Trap"], "rotation": ["Armor and Guardian", "Archer and Sacrifice", "Blockade, Susceptibility, Trap", "Boneyard and Siphon on corpses", "Venom Skull"]},
        {"id": "final", "label": "Level 50 / CP160+", "min_level": 50, "max_level": 9999, "overview": "Finish class passives and Mastery, then preserve the corpse priority while progressing into Corpseburster and optimized supporting sets.", "front": ["Detonating Siphon", "Grave Lord’s Sacrifice", "Venom Skull", "Avid Boneyard", "Skeletal Archer", "Pestilent Colossus"], "back": ["Summoner’s Armor", "Spirit Guardian", "Elemental Susceptibility", "Elemental Blockade", "Barbed Trap", "Shooting Star"], "rotation": ["Armor and Guardian", "Archer and Sacrifice", "back-bar effects", "Boneyard and Siphon when corpses exist", "Venom Skull while waiting"]},
    ], bridge_set="Corpseburster", bridge_source="Necromancer class set from Infinite Archive", final_set="Corpseburster", final_source="Infinite Archive",
    dot_heavy=True, extra_tips=["Detonating Siphon cannot start without a corpse. Do not treat an empty cast as a bug.", "Refresh Skeletal Archer and Spirit Guardian before they expire when you need predictable corpse timing."],
)


# Update the two existing builds with their two recommended U50 Class Mastery choices.
def update_existing_mastery(build: dict, line_id: str, mastery_ids: list[str], extra_tip: str) -> dict:
    if not any(line.get("id") == line_id for line in build.get("relevant_lines", [])):
        build["relevant_lines"].append(relevant([line_id])[0])
    existing = {row.get("catalog_skill_id") for row in build.get("unlock_order", [])}
    priority = max((int(row.get("priority", 0)) for row in build["unlock_order"]), default=0) + 10
    for cid in mastery_ids:
        if cid in existing:
            continue
        line, skill = skill_by_id[cid]
        build["unlock_order"].append({
            "id": slug(skill["name"]), "name": skill["name"], "catalog_skill_id": cid,
            "section": "Passive", "line": line_id, "required_rank": 1, "kind": "Passive",
            "phase": "Final", "status": "final", "priority": priority,
            "notes": "One of the build's two recommended Class Mastery choices. Requires all three native class lines at rank 50; subclassing disables Class Mastery.",
            "morph_from": None, "image": None, "requires": [],
        })
        priority += 10
    if extra_tip not in build.get("tips", []):
        build.setdefault("tips", []).append(extra_tip)
    build["verified_date"] = VERIFIED_DATE
    build["game_version"] = GAME_VERSION
    return build


arcanist = update_existing_mastery(arcanist, "arcanist_mastery",
                                    ["arcanist_mastery__unbound_potential", "arcanist_mastery__ink_scribe_s_verve"],
                                    "Recommended Class Mastery: Unbound Potential + Ink-Scribe’s Verve after all three native class lines reach rank 50; subclassing disables them.")
templar = update_existing_mastery(templar, "templar_mastery",
                                   ["templar_mastery__judgment_s_brand", "templar_mastery__bright_harbinger"],
                                   "Recommended Class Mastery: Judgment’s Brand + Bright Harbinger after all three native class lines reach rank 50; subclassing disables them.")

outputs = {
    arcanist_path: arcanist,
    templar_path: templar,
    BUILD_DIR / "magicka_dragonknight_solo_duo.json": dk_build,
    BUILD_DIR / "magicka_sorcerer_solo_duo.json": sorc_build,
    BUILD_DIR / "stamina_nightblade_solo_duo.json": nb_build,
    BUILD_DIR / "magicka_warden_solo_duo.json": warden_build,
    BUILD_DIR / "stamina_necromancer_solo_duo.json": necro_build,
}

for path, data in outputs.items():
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    print(f"wrote {path.relative_to(ROOT)} ({len(data['unlock_order'])} unlock rows)")

# The authoring helpers above intentionally stay compact; the public bundle is emitted as schema 3.
import runpy
runpy.run_path(str(ROOT / 'tools' / 'upgrade_schema3_builds.py'), run_name='__main__')
