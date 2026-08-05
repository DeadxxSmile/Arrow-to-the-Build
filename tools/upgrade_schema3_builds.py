"""Upgrade the bundled Mighty Seven files to ATTB schema 3.

Schema 3 is intentionally the first supported public build format. It adds explicit character-setup
help, five-slot hotbars plus ultimates, structured rotations, and individual equipment pieces grouped
under acquisition-aware sets.
"""
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILD_DIR = ROOT / "resources" / "builds"
CATALOG = json.loads((ROOT / "resources" / "data" / "eso-skill-catalog.json").read_text(encoding="utf8"))
SKILLS = {skill["id"]: (line, skill) for line in CATALOG["lines"] for skill in line.get("skills", [])}


def norm(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", str(value).lower().replace("’", "'").replace("‘", "'"))


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", str(value).lower().replace("’", "'")).strip("_")


def available_variants(build: dict) -> list[dict]:
    return [variant for variant in build.get("variants", []) if variant.get("available", True)]


def skill_lookup(build: dict):
    by_name: dict[str, list[dict]] = defaultdict(list)
    by_catalog = {}
    for row in build.get("unlock_order", []):
        by_name[norm(row.get("name", ""))].append(row)
        if row.get("catalog_skill_id"):
            by_catalog[row["catalog_skill_id"]] = row
    return by_name, by_catalog


def match_skill(value: str, by_name: dict[str, list[dict]]) -> dict | None:
    candidates = [str(value).strip()]
    if "/" in str(value):
        candidates.extend(part.strip() for part in str(value).split("/")[::-1])
    candidates.extend(re.split(r"\s+or\s+|\s+and\s+", str(value), flags=re.I))
    for candidate in candidates:
        key = norm(candidate)
        rows = by_name.get(key, [])
        if rows:
            row = sorted(rows, key=lambda item: (item.get("kind") != "Morph", item.get("kind") != "Ultimate", item.get("priority", 9999)))[0]
            return {
                "name": row.get("name") or candidate,
                "catalog_skill_id": row.get("catalog_skill_id"),
                **({"image": row["image"]} if row.get("image") else {}),
                **({"temporary": True} if row.get("status") == "temporary" else {}),
            }
    return None


def slot_from_text(text: str, by_name: dict[str, list[dict]]) -> dict:
    hit = match_skill(text, by_name)
    if hit:
        return hit
    placeholder = any(token in str(text).lower() for token in ["any ", "slot", "leveling", "class-line", "available"])
    return {"name": str(text), **({"placeholder": True} if placeholder else {})}


def phase_v3(build: dict, phase: dict) -> dict:
    by_name, _ = skill_lookup(build)
    front_raw, back_raw = list(phase.get("front", [])), list(phase.get("back", []))

    def split_bar(values: list[str], weapon: str, locked: str | None = None) -> dict:
        items = [slot_from_text(value, by_name) for value in values]
        ultimate = None
        if items:
            last = items[-1]
            hit = SKILLS.get(last.get("catalog_skill_id"))
            if len(items) > 5 or hit and hit[1].get("type") == "Ultimate":
                ultimate = items.pop()
        return {"weapon": weapon, "slots": items[:5], "ultimate": ultimate, **({"locked": locked} if locked else {})}

    resource = "Magicka" if build.get("defaults", {}).get("attributes", {}).get("magicka", 0) else "Stamina"
    class_name = build.get("defaults", {}).get("class", "")
    rotation_type = "priority" if class_name in {"Necromancer", "Nightblade", "Warden"} else "sequence"
    rotation_steps = []
    for value in phase.get("rotation", []):
        hit = match_skill(value, by_name)
        rotation_steps.append(hit or {"name": str(value)})

    return {
        "id": phase["id"], "label": phase.get("label", phase["id"]),
        "min_level": phase.get("min_level", 1), "max_level": phase.get("max_level", 9999),
        "overview": phase.get("overview", ""),
        "front_bar": split_bar(front_raw, build.get("defaults", {}).get("front_weapon", "Front weapon")),
        "back_bar": split_bar(back_raw, build.get("defaults", {}).get("back_weapon", "Back weapon"), "Unlocks at character level 15" if not back_raw else None),
        "rotation": {
            "type": rotation_type,
            "title": "Main priority" if rotation_type == "priority" else "Main sequence",
            "summary": f"Use this as a practical {resource.lower()} {class_name} starting point; refresh effects early rather than letting them fall off.",
            "steps": rotation_steps,
            "notes": ["Light-attack weave when comfortable, but learn the order and survival tools before chasing speed."],
        },
    }


ARMOR = ["Head", "Shoulders", "Chest", "Hands", "Waist", "Legs", "Feet"]
JEWELRY = ["Necklace", "Ring 1", "Ring 2"]
PRIMARY_BODY = ["Shoulders", "Hands", "Waist", "Legs", "Feet"]


def weapon_slots(build: dict) -> list[str]:
    front = build.get("defaults", {}).get("front_weapon", "")
    if "dagger" in front.lower() or "dual" in front.lower():
        return ["Front Weapon 1", "Front Weapon 2", "Back Weapon"]
    return ["Front Weapon", "Back Weapon"]


def all_slots(build: dict) -> list[str]:
    return ARMOR + JEWELRY + weapon_slots(build)


def source_info(raw: str, set_name: str) -> dict:
    text = str(raw or "Build guide recommendation")
    lower = text.lower()
    source = {"location": text}
    if "craft" in lower or "trait" in lower or "hammer and saw" in lower or "foundry" in lower or "granary" in lower:
        source.update(type="Crafted", tradeable="Yes — another player can craft or trade it")
        match = re.search(r"(\d+)\s*traits?", text, re.I)
        if match: source["requirement"] = f"Crafter must know {match.group(1)} traits for the item"
    elif "infinite archive" in lower:
        source.update(type="Infinite Archive class set", tradeable="No — collect from Infinite Archive rewards", access="Infinite Archive")
    elif "maelstrom" in lower:
        source.update(type="Arena weapon", zone="Wrothgar", access="Maelstrom Arena / Orsinium access", tradeable="No — account-bound collection")
    elif "frostvault" in lower or "wayrest" in lower or "city of ash" in lower or "dungeon" in lower:
        source.update(type="Dungeon", tradeable="Group-bound briefly, then account-bound")
    elif "rockgrove" in lower or "sanity" in lower or "trial" in lower:
        source.update(type="Trial", tradeable="Group-bound briefly, then account-bound")
    elif "antiquit" in lower or "greymoor" in lower:
        source.update(type="Antiquity / Mythic", access="Antiquities system", tradeable="No")
    elif "cyrodiil" in lower:
        source.update(type="PvP vendor / guild trader", zone="Cyrodiil", tradeable="Usually yes before binding")
    elif "quest" in lower or "drop" in lower:
        source.update(type="Quest / drop", tradeable="Varies")
    else:
        source.update(type="Activity reward", tradeable="Check the item collection rules")
    if "high isle" in lower: source["zone"] = "High Isle"
    elif "western solstice" in lower: source["zone"] = "Western Solstice"
    elif "west weald" in lower: source["zone"] = "West Weald"
    elif "frostvault" in lower: source.update(zone="Eastmarch", access="Wrathstone DLC or ESO Plus")
    elif "rockgrove" in lower: source.update(zone="Blackwood", access="Blackwood trial access")
    elif "sanity" in lower: source.update(zone="Telvanni Peninsula", access="Necrom chapter trial access")
    elif "wayrest" in lower: source.update(zone="Stormhaven", access="Base game")
    elif "city of ash" in lower: source.update(zone="Greenshade", access="Base game")
    if "optional" in lower or "alternative" in lower: source["notes"] = text
    return source


def weights(build: dict, stage_id: str) -> dict[str, str]:
    descriptor = build.get("defaults", {}).get("leveling_armor" if stage_id == "leveling" else "endgame_armor", "")
    counts = {kind: int(number) for number, kind in re.findall(r"(\d+)\s+(Light|Medium|Heavy)", descriptor, re.I)}
    order = ["Light", "Medium", "Heavy"]
    result = {}
    index = 0
    for kind in order:
        for _ in range(counts.get(kind, 0)):
            if index < len(ARMOR): result[ARMOR[index]] = kind; index += 1
    while index < len(ARMOR): result[ARMOR[index]] = "Any"; index += 1
    return result


def piece_details(build: dict, stage_id: str, slot: str, raw: dict) -> dict:
    is_leveling = stage_id == "leveling"
    resource = "Max Magicka" if build.get("defaults", {}).get("attributes", {}).get("magicka", 0) else "Max Stamina"
    harm = "Magical Harm" if resource == "Max Magicka" else "Physical Harm"
    result = {"id": slug(f"{raw.get('set', 'gear')}_{slot}_{stage_id}"), "slot": slot}
    if slot in ARMOR:
        result.update(weight=weights(build, stage_id).get(slot, "Any"), trait="Training" if is_leveling else "Divines", enchantment=resource)
    elif slot in JEWELRY:
        result.update(trait="Bloodthirsty" if not is_leveling else "Healthy / Arcane / Robust", enchantment=harm)
    elif slot == "Front Weapon 1":
        result.update(weapon_type="Dagger", trait="Training" if is_leveling else "Charged", enchantment="Poison Damage")
    elif slot == "Front Weapon 2":
        result.update(weapon_type="Dagger", trait="Training" if is_leveling else "Charged", enchantment="Shock Damage")
    elif slot == "Front Weapon":
        result.update(weapon_type=build.get("defaults", {}).get("front_weapon", "Staff"), trait="Training" if is_leveling else "Charged", enchantment="Flame or Shock Damage", set_slots=2)
    elif slot == "Back Weapon":
        result.update(weapon_type=build.get("defaults", {}).get("back_weapon", "Staff"), trait="Training" if is_leveling else "Infused", enchantment="Weapon and Spell Damage", set_slots=2)
    result["quality"] = "Current level" if is_leveling else ("Gold weapons first" if "Weapon" in slot else "Purple or better")
    return result


def requested_slots(build: dict, stage_id: str, raw: dict, assigned: set[str]) -> list[str]:
    text = raw.get("slot", "").lower().replace("belt", "waist")
    front = weapon_slots(build)[:-1]
    if stage_id == "leveling":
        if text == "armor" or "remaining armor" in text: return [slot for slot in ARMOR if slot not in assigned]
        if "weapons" in text: return [slot for slot in weapon_slots(build) if slot not in assigned]
    direct = []
    names = {"head":"Head", "shoulders":"Shoulders", "chest":"Chest", "hands":"Hands", "waist":"Waist", "legs":"Legs", "feet":"Feet", "necklace":"Necklace", "ring 1":"Ring 1", "ring 2":"Ring 2"}
    for token, slot in names.items():
        if re.search(rf"\b{re.escape(token)}\b", text): direct.append(slot)
    if "both staves" in text: direct += ["Front Weapon", "Back Weapon"]
    if "daggers" in text: direct += front
    if "back bar" in text or "back weapon" in text: direct += ["Back Weapon"]
    if "front bar" in text or "front weapon" in text: direct += front
    if direct: return [slot for slot in dict.fromkeys(direct) if slot not in assigned]
    if "five body" in text or text == "body" or "body set" in text or "primary five" in text or "body or weapons" in text:
        return [slot for slot in PRIMARY_BODY if slot not in assigned]
    if "other five" in text or "second five" in text or "weapons / jewelry" in text or "weapons and jewelry" in text or "weapons / jewelry" in text:
        return [slot for slot in ["Chest", "Necklace", "Ring 1", *front] if slot not in assigned]
    if "head or shoulder" in text: return [slot for slot in ["Head", "Shoulders"] if slot not in assigned][:1]
    if text == "ring": return [slot for slot in ["Ring 2", "Ring 1"] if slot not in assigned][:1]
    if "remaining armor or jewelry" in text:
        return [slot for slot in ARMOR + JEWELRY if slot not in assigned]
    if text == "armor": return [slot for slot in ARMOR if slot not in assigned]
    return []


def gear_stage_v3(build: dict, stage: dict) -> dict:
    assigned: set[str] = set()
    groups: dict[str, dict] = {}
    raw_rows = stage.get("pieces", [])
    for raw in raw_rows:
        set_name = raw.get("set", "Flexible gear")
        group = groups.setdefault(set_name, {"id": slug(f"{stage['id']}_{set_name}"), "name": set_name, "role": raw.get("slot", "Equipment"), "source": source_info(raw.get("source", ""), set_name), "pieces": []})
        for slot in requested_slots(build, stage["id"], raw, assigned):
            group["pieces"].append(piece_details(build, stage["id"], slot, raw)); assigned.add(slot)
    missing = [slot for slot in all_slots(build) if slot not in assigned]
    if missing:
        raw = raw_rows[-1] if raw_rows else {"set": "Flexible / remaining gear", "source": "Use the build summary and accessible alternatives"}
        set_name = raw.get("set", "Flexible / remaining gear")
        group = groups.setdefault(set_name, {"id": slug(f"{stage['id']}_{set_name}"), "name": set_name, "role": "Remaining slots", "source": source_info(raw.get("source", ""), set_name), "pieces": []})
        for slot in missing:
            group["pieces"].append(piece_details(build, stage["id"], slot, raw)); assigned.add(slot)
    return {"id": stage["id"], "name": stage.get("name", stage["id"]), "min_level": stage.get("min_level", 1), "max_level": stage.get("max_level", 9999), "summary": stage.get("summary", ""), "sets": list(groups.values())}


def setup_help(build: dict) -> dict:
    defaults = build.get("defaults", {})
    magicka = defaults.get("attributes", {}).get("magicka", 0) > 0
    race_pool = (["High Elf", "Dark Elf", "Khajiit", "Breton"] if magicka else ["Dark Elf", "Orc", "Khajiit", "Wood Elf"])
    alternatives = [race for race in race_pool if race != defaults.get("race")][:3]
    return {
        "class": {"summary": f"This build keeps all three native {defaults.get('class')} skill lines for pure-class progression and Class Mastery access."},
        "race": {"summary": "Race changes damage, sustain, and utility slightly, but ordinary PvE content does not require the recommended option.", "recommended": defaults.get("race"), "alternatives": alternatives, "notes": ["Record the race you actually chose; ATTB keeps it separate from the build recommendation."]},
        "alliance": {"summary": "Alliance primarily determines PvP faction and some story context. It does not change this PvE combat setup.", "recommended": defaults.get("alliance"), "notes": ["Any Race, Any Alliance and Alliance Change Tokens can make race and alliance independent."]},
        "mundus": {"summary": "The Thief increases Critical Chance and is the default damage Mundus for this launch build.", "locations": ["Malabal Tor (Aldmeri Dominion)", "Alik’r Desert (Daggerfall Covenant)", "Eastmarch (Ebonheart Pact)", "Cyrodiil"], "notes": ["Activate a different Mundus stone at any time to replace the current blessing."]},
        "front_weapon": {"summary": "The front bar holds the main spammable, class burst, and offensive passives."},
        "back_weapon": {"summary": "The second weapon bar unlocks at character level 15 and normally carries longer-duration effects and support skills."},
        "leveling_armor": {"summary": "Mixed armor weights level multiple armor skill lines while Training traits accelerate experience gain."},
        "endgame_armor": {"summary": "The final weight mix balances damage passives, penetration, sustain, and Undaunted Mettle."},
        "leveling_trait": {"summary": "Training increases experience gained from kills. Replace leveling pieces freely rather than upgrading them heavily."},
        "gear_cap": {"summary": "Equipment stops scaling at Level 50 / CP160, so that is the first point where farming and upgrading permanent sets makes sense."},
    }


def upgrade(path: Path) -> None:
    build = json.loads(path.read_text(encoding="utf8"))
    if build.get("schema_version") == 3:
        return
    build["schema_version"] = 3
    build["setup_help"] = setup_help(build)
    build["phases"] = [phase_v3(build, phase) for phase in build.get("phases", [])]
    build["gear_stages"] = [gear_stage_v3(build, stage) for stage in build.get("gear_stages", [])]
    build.setdefault("format_notes", []).append("Schema 3: explicit hotbars, structured rotations, individual equipment slots, and acquisition-aware set groups.")
    path.write_text(json.dumps(build, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    print(f"upgraded {path.relative_to(ROOT)}")


if __name__ == "__main__":
    for build_path in sorted(BUILD_DIR.glob("*.json")):
        upgrade(build_path)
