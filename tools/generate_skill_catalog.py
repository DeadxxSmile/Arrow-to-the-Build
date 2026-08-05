import json, re, os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def slug(s):
    s=s.lower().replace('’',"'")
    s=re.sub(r"[^a-z0-9]+","_",s).strip('_')
    return s

def skill(name, typ='Passive', max_points=1, base=None, morphs=None, required_rank=None, currency='skill_point'):
    return {'id':slug(name),'name':name,'type':typ,'max_points':max_points,'base_id':slug(base) if base else None,'morph_ids':[slug(x) for x in (morphs or [])],'required_rank':required_rank,'currency':currency}

def family(base,m1,m2,typ='Active',rank=None):
    return [skill(base,typ,1,None,[m1,m2],rank), skill(m1,'Morph',1,base,[],rank), skill(m2,'Morph',1,base,[],rank)]

def passives(names,max_points=2,currency='skill_point'):
    out=[]
    for n in names:
        if isinstance(n,(list,tuple)):
            name=n[0]; m=n[1]
        else:name=n;m=max_points
        out.append(skill(name,'Passive',m,None,[],None,currency))
    return out

lines=[]
def add_line(id,name,group,skills,max_rank=50,cls=None,currency='skill_point',source=None,note=None):
    # Prefix item IDs with line ID for global uniqueness.
    for x in skills:
        old=x['id']; x['id']=f'{id}__{old}'
        if x.get('base_id'): x['base_id']=f'{id}__{x["base_id"]}'
        x['morph_ids']=[f'{id}__{m}' for m in x.get('morph_ids',[])]
        if currency!='skill_point': x['currency']=currency
    lines.append({'id':id,'name':name,'group':group,'class':cls,'max_rank':max_rank,'currency':currency,'source':source or f'https://eso-hub.com/en/skills/{group.lower().replace(" ","-")}/{slug(name).replace("_","-")}', 'note':note or '', 'skills':skills})

# ---- Arcanist ----
add_line('curative','Curative Runeforms','Class',
 family('Vitalizing Glyphic','Glyphic of the Tides','Resonating Glyphic','Ultimate',12)+
 family('Runemend','Audacious Runemend','Evolving Runemend','Active',1)+
 family('Remedy Cascade','Cascading Fortune','Curative Surge','Active',4)+
 family('Chakram Shields','Chakram of Destiny','Tidal Chakram','Active',20)+
 family("Arcanist's Domain",'Reconstructive Domain',"Zenas' Empowering Disc",'Active',30)+
 family('Apocryphal Gate','Fleet-Footed Gate','Passage Between Worlds','Active',42)+
 passives(['Healing Tides','Intricate Runeforms','Erudition','Hideous Clarity']),cls='Arcanist',source='https://eso-hub.com/en/skills/arcanist/curative-runeforms')
add_line('herald','Herald of the Tome','Class',
 family('The Unblinking Eye','The Languid Eye',"The Tide King's Gaze",'Ultimate',12)+
 family('Runeblades','Escalating Runeblades','Writhing Runeblades','Active',1)+
 family('Fatecarver','Exhausting Fatecarver','Pragmatic Fatecarver','Active',4)+
 family('Abyssal Impact',"Cephaliarch's Flail",'Tentacular Dread','Active',20)+
 family("Tome-Bearer's Inspiration",'Inspired Scholarship','Recuperative Treatise','Active',30)+
 family('The Imperfect Ring','Fulminating Rune','Rune of Displacement','Active',42)+
 passives(['Fated Fortune','Splintered Secrets','Psychic Lesion','Harnessed Quintessence']),cls='Arcanist',source='https://eso-hub.com/en/skills/arcanist/herald-of-the-tome')
add_line('soldier','Soldier of Apocrypha','Class',
 family('Gibbering Shield','Gibbering Shelter','Sanctum of the Abyssal Sea','Ultimate',12)+
 family('Runic Jolt','Runic Sunder','Runic Embrace','Active',1)+
 family('Runespite Ward','Impervious Runeward','Spiteward of the Lucid Mind','Active',4)+
 family('Fatewoven Armor','Cruxweaver Armor','Unbreakable Fate','Active',20)+
 family('Runic Defense','Runeguard of Freedom','Runeguard of Still Waters','Active',30)+
 family('Rune of Eldritch Horror','Rune of Uncanny Adoration','Rune of the Colorless Pool','Active',42)+
 passives(['Implacable Outcome','Circumvented Fate','Wellspring of the Abyss','Aegis of the Unseen']),cls='Arcanist',source='https://eso-hub.com/en/skills/arcanist/soldier-of-apocrypha')
add_line('arcanist_mastery','Arcanist Class Mastery','Class',passives([('Ink-Scribe\'s Verve',1),('Erudite\'s Rigor',1),('Unbound Potential',1),('Fate Realigned',1),('Abyssal Emergence',1)],currency='class_mastery_point'),max_rank=1,cls='Arcanist',currency='class_mastery_point',source='https://eso-hub.com/en/skills/arcanist/arcanist-class-mastery',note='Choose two after all three native class lines reach 50. These do not cost normal skill points.')

# ---- Templar ----
add_line('aedric_spear','Aedric Spear','Class',
 family('Radial Sweep','Empowering Sweep','Everlasting Sweep','Ultimate',12)+family('Puncturing Strikes','Biting Jabs','Puncturing Sweeps','Active',1)+family('Piercing Javelin','Aurora Javelin','Binding Javelin','Active',4)+family('Focused Charge','Explosive Charge','Toppling Charge','Active',20)+family('Spear Shards','Blazing Spear','Luminous Shards','Active',30)+family('Sun Shield','Blazing Shield','Radiant Ward','Active',42)+passives(['Piercing Spear','Spear Wall','Burning Light','Balanced Warrior']),cls='Templar',source='https://eso-hub.com/en/skills/templar/aedric-spear')
add_line('dawns_wrath','Dawn’s Wrath','Class',
 family('Nova','Solar Prison','Solar Disturbance','Ultimate',12)+family('Sun Fire','Reflective Light',"Vampire's Bane",'Active',1)+family('Solar Flare','Dark Flare','Solar Barrage','Active',4)+family('Backlash','Power of the Light','Purifying Light','Active',20)+family('Eclipse','Unstable Core','Living Dark','Active',30)+family('Radiant Destruction','Radiant Glory','Radiant Oppression','Active',42)+passives(['Enduring Rays','Prism','Illuminate','Restoring Spirit']),cls='Templar',source='https://eso-hub.com/en/skills/templar/dawns-wrath')
add_line('restoring_light','Restoring Light','Class',
 family('Rite of Passage','Practiced Incantation','Remembrance','Ultimate',12)+family('Rushed Ceremony','Breath of Life','Honor the Dead','Active',1)+family('Healing Ritual','Hasty Prayer','Ritual of Rebirth','Active',4)+family('Restoring Aura','Radiant Aura','Repentance','Active',20)+family('Cleansing Ritual','Extended Ritual','Ritual of Retribution','Active',30)+family('Rune Focus','Channeled Focus','Restoring Focus','Active',42)+passives(['Mending','Sacred Ground','Light Weaver','Master Ritualist']),cls='Templar',source='https://eso-hub.com/en/skills/templar/restoring-light')
add_line('templar_mastery','Templar Class Mastery','Class',passives([('Bright Harbinger',1),("Judgment's Brand",1),('Divine Refuge',1),('Sunlit Resolve',1),('Sacred Purpose',1)],currency='class_mastery_point'),max_rank=1,cls='Templar',currency='class_mastery_point',source='https://eso-hub.com/en/skills/templar/templar-class-mastery',note='Class Mastery choices do not cost normal skill points.')

# ---- Dragonknight ----
add_line('ardent_flame','Ardent Flame','Class',
 family('Dragonknight Standard','Shifting Standard','Standard of Might','Ultimate',12)+family('Fiery Grip','Unrelenting Grip','Empowering Chains','Active',1)+family('Searing Strike','Venomous Claw','Burning Embers','Active',4)+family('Fiery Breath','Noxious Breath','Engulfing Flames','Active',20)+family('Lava Whip','Flame Lash','Molten Whip','Active',30)+family('Inferno','Flames of Oblivion','Cauterize','Active',42)+passives(['Combustion','Traumatic Burns','Fan the Flames','A Soul Ablaze']),cls='Dragonknight',source='https://eso-hub.com/en/skills/dragonknight/ardent-flame')
add_line('draconic_power','Draconic Power','Class',
 family('Dragon Leap','Take Flight','Ferocious Leap','Ultimate',12)+family('Spiked Armor','Hardened Armor','Volatile Armor','Active',1)+family('Dark Talons','Burning Talons','Choking Talons','Active',4)+family('Dragon Blood','Green Dragon Blood','Coagulating Blood','Active',20)+family('Protective Scale','Protective Plate','Dragon Fire Scale','Active',30)+family('Inhale','Draw Essence','Deep Breath','Active',42)+passives(['Iron Skin','Burning Heart','Elder Dragon','Scaled Armor']),cls='Dragonknight',source='https://eso-hub.com/en/skills/dragonknight/draconic-power')
add_line('earthen_heart','Earthen Heart','Class',
 family('Magma Armor','Magma Shell','Corrosive Armor','Ultimate',12)+family('Stonefist','Stone Giant','Obsidian Shard','Active',1)+family('Molten Weapons','Igneous Weapons','Molten Armaments','Active',4)+family('Obsidian Shield','Fragmented Shield','Igneous Shield','Active',20)+family('Petrify','Shattering Rocks','Fossilize','Active',30)+family('Ash Cloud','Cinder Storm','Eruption','Active',42)+passives(['Eternal Mountain','Battle Roar','Mountain’s Blessing','Helping Hands']),cls='Dragonknight',source='https://eso-hub.com/en/skills/dragonknight/earthen-heart')
add_line('dragonknight_mastery','Dragonknight Class Mastery','Class',passives([('Recursive Flame',1),('Stone-Blooded',1),('Draconic Bulwark',1),('Molten Renewal',1),('Unyielding Heart',1)],currency='class_mastery_point'),max_rank=1,cls='Dragonknight',currency='class_mastery_point',source='https://eso-hub.com/en/skills/dragonknight/dragonknight-class-mastery')

# ---- Sorcerer ----
add_line('dark_magic','Dark Magic','Class',family('Negate Magic','Absorption Field','Suppression Field','Ultimate',12)+family('Crystal Shard','Crystal Fragments','Crystal Weapon','Active',1)+family('Encase','Shattering Spines','Restraining Prison','Active',4)+family('Rune Prison','Defensive Rune','Rune Cage','Active',20)+family('Dark Exchange','Dark Conversion','Dark Deal','Active',30)+family('Daedric Mines','Daedric Tomb','Daedric Minefield','Active',42)+passives(['Unholy Knowledge','Blood Magic','Persistence','Exploitation']),cls='Sorcerer',source='https://eso-hub.com/en/skills/sorcerer/dark-magic')
add_line('daedric_summoning','Daedric Summoning','Class',family('Summon Storm Atronach','Greater Storm Atronach','Charged Atronach','Ultimate',12)+family('Summon Unstable Familiar','Summon Unstable Clannfear','Summon Volatile Familiar','Active',1)+family('Daedric Curse','Haunting Curse','Daedric Prey','Active',4)+family('Summon Winged Twilight','Summon Twilight Tormentor','Summon Twilight Matriarch','Active',20)+family('Conjured Ward','Hardened Ward','Regenerative Ward','Active',30)+family('Bound Armor','Bound Aegis','Bound Armaments','Active',42)+passives(['Rebate','Power Stone','Daedric Protection','Expert Summoner']),cls='Sorcerer',source='https://eso-hub.com/en/skills/sorcerer/daedric-summoning')
add_line('storm_calling','Storm Calling','Class',family('Overload','Energy Overload','Power Overload','Ultimate',12)+family("Mage's Fury",'Endless Fury',"Mage's Wrath",'Active',1)+family('Lightning Form','Boundless Storm','Hurricane','Active',4)+family('Lightning Splash','Liquid Lightning','Lightning Flood','Active',20)+family('Surge','Critical Surge','Power Surge','Active',30)+family('Bolt Escape','Streak','Ball of Lightning','Active',42)+passives(['Capacitor','Energized','Amplitude','Expert Mage']),cls='Sorcerer',source='https://eso-hub.com/en/skills/sorcerer/storm-calling')
add_line('sorcerer_mastery','Sorcerer Class Mastery','Class',passives([('Storm-Lashed',1),('Daedric Reservoir',1),('Arcane Momentum',1),('Voltaic Soul',1),('Conjurer’s Dominion',1)],currency='class_mastery_point'),max_rank=1,cls='Sorcerer',currency='class_mastery_point',source='https://eso-hub.com/en/skills/sorcerer/sorcerer-class-mastery')

# ---- Nightblade ----
add_line('assassination','Assassination','Class',family('Death Stroke','Incapacitating Strike','Soul Harvest','Ultimate',12)+family("Assassin's Blade",'Killer’s Blade','Impale','Active',1)+family('Teleport Strike','Lotus Fan','Ambush','Active',4)+family('Blur','Mirage','Phantasmal Escape','Active',20)+family('Mark Target',"Reaper's Mark",'Piercing Mark','Active',30)+family('Grim Focus','Relentless Focus','Merciless Resolve','Active',42)+passives(['Master Assassin','Executioner','Pressure Points','Hemorrhage']),cls='Nightblade',source='https://eso-hub.com/en/skills/nightblade/assassination')
add_line('shadow','Shadow','Class',family('Consuming Darkness','Bolstering Darkness','Veil of Blades','Ultimate',12)+family('Shadow Cloak','Dark Cloak','Shadowy Disguise','Active',1)+family('Veiled Strike','Surprise Attack','Concealed Weapon','Active',4)+family('Path of Darkness','Twisting Path','Refreshing Path','Active',20)+family('Aspect of Terror','Manifestation of Terror','Mass Hysteria','Active',30)+family('Summon Shade','Dark Shade','Shadow Image','Active',42)+passives(['Refreshing Shadows','Shadow Barrier','Dark Vigor','Dark Veil']),cls='Nightblade',source='https://eso-hub.com/en/skills/nightblade/shadow')
add_line('siphoning','Siphoning','Class',family('Soul Shred','Soul Siphon','Soul Tether','Ultimate',12)+family('Strife','Swallow Soul','Funnel Health','Active',1)+family('Malevolent Offering','Shrewd Offering','Healthy Offering','Active',4)+family('Cripple','Debilitate','Crippling Grasp','Active',20)+family('Siphoning Strikes','Leeching Strikes','Siphoning Attacks','Active',30)+family('Drain Power','Power Extraction','Sap Essence','Active',42)+passives(['Catalyst','Magicka Flood','Soul Siphoner','Transfer']),cls='Nightblade',source='https://eso-hub.com/en/skills/nightblade/siphoning')
add_line('nightblade_mastery','Nightblade Class Mastery','Class',passives([('Critical Motivation',1),('Share the Spoils',1),('Nocturnal Guile',1),('Bloodied Precision',1),('Shadowed Intent',1)],currency='class_mastery_point'),max_rank=1,cls='Nightblade',currency='class_mastery_point',source='https://eso-hub.com/en/skills/nightblade/nightblade-class-mastery')

# ---- Warden ----
add_line('animal_companions','Animal Companions','Class',family('Feral Guardian','Eternal Guardian','Wild Guardian','Ultimate',12)+family('Dive','Cutting Dive','Screaming Cliff Racer','Active',1)+family('Scorch','Subterranean Assault','Deep Fissure','Active',4)+family('Swarm','Growing Swarm','Fetcher Infection','Active',20)+family('Betty Netch','Bull Netch','Blue Betty','Active',30)+family('Falcon’s Swiftness','Deceptive Predator','Bird of Prey','Active',42)+passives(['Bond With Nature','Savage Beast','Flourish','Advanced Species']),cls='Warden',source='https://eso-hub.com/en/skills/warden/animal-companions')
add_line('green_balance','Green Balance','Class',family('Secluded Grove','Healing Thicket','Enchanted Forest','Ultimate',12)+family('Fungal Growth','Enchanted Growth','Soothing Spores','Active',1)+family('Healing Seed','Budding Seeds','Corrupting Pollen','Active',4)+family('Living Vines','Leeching Vines','Living Trellis','Active',20)+family('Lotus Flower','Green Lotus','Lotus Blossom','Active',30)+family('Nature’s Grasp','Bursting Vines','Nature’s Embrace','Active',42)+passives(['Accelerated Growth','Nature’s Gift','Emerald Moss','Maturation']),cls='Warden',source='https://eso-hub.com/en/skills/warden/green-balance')
add_line('winters_embrace','Winter’s Embrace','Class',family('Sleet Storm','Northern Storm','Permafrost','Ultimate',12)+family('Frost Cloak','Expansive Frost Cloak','Ice Fortress','Active',1)+family('Impaling Shards','Winter’s Revenge','Gripping Shards','Active',4)+family('Arctic Wind','Arctic Blast','Polar Wind','Active',20)+family('Crystallized Shield','Crystallized Slab','Shimmering Shield','Active',30)+family('Frozen Gate','Frozen Device','Frozen Retreat','Active',42)+passives(['Glacial Presence','Frozen Armor','Icy Aura','Piercing Cold']),cls='Warden',source='https://eso-hub.com/en/skills/warden/winters-embrace')
add_line('warden_mastery','Warden Class Mastery','Class',passives([("Green-Keeper's Hide",1),('Bountiful Harvest',1),('Winter’s Dominion',1),('Wild Communion',1),('Seasonal Strength',1)],currency='class_mastery_point'),max_rank=1,cls='Warden',currency='class_mastery_point',source='https://eso-hub.com/en/skills/warden/warden-class-mastery')

# ---- Necromancer ----
add_line('grave_lord','Grave Lord','Class',family('Frozen Colossus','Pestilent Colossus','Glacial Colossus','Ultimate',12)+family('Flame Skull','Venom Skull','Ricochet Skull','Active',1)+family('Sacrificial Bones','Blighted Blastbones','Stalking Blastbones','Active',4)+family('Boneyard','Avid Boneyard','Unnerving Boneyard','Active',20)+family('Skeletal Mage','Skeletal Arcanist','Archer','Active',30)+family('Shocking Siphon','Detonating Siphon','Mystic Siphon','Active',42)+passives(['Reusable Parts','Death Knell','Dismember','Rapid Rot']),cls='Necromancer',source='https://eso-hub.com/en/skills/necromancer/grave-lord')
add_line('bone_tyrant','Bone Tyrant','Class',family('Bone Goliath Transformation','Pummeling Goliath','Ravenous Goliath','Ultimate',12)+family('Death Scythe','Ruinous Scythe','Hungry Scythe','Active',1)+family('Bone Armor','Beckoning Armor','Summoner’s Armor','Active',4)+family('Bitter Harvest','Deaden Pain','Necrotic Potency','Active',20)+family('Bone Totem','Agony Totem','Remote Totem','Active',30)+family('Grave Grasp','Empowering Grasp','Ghostly Embrace','Active',42)+passives(['Death Gleaning','Disdain Harm','Health Avarice','Last Gasp']),cls='Necromancer',source='https://eso-hub.com/en/skills/necromancer/bone-tyrant')
add_line('living_death','Living Death','Class',family('Reanimate','Renewing Animation','Animate Blastbones','Ultimate',12)+family('Render Flesh','Resistant Flesh','Blood Sacrifice','Active',1)+family('Expunge','Expunge and Modify','Hexproof','Active',4)+family('Life amid Death','Enduring Undeath','Renewing Undeath','Active',20)+family('Spirit Mender','Spirit Guardian','Intensive Mender','Active',30)+family('Restoring Tether','Braided Tether','Mortal Coil','Active',42)+passives(['Curative Curse','Near-Death Experience','Corpse Consumption','Undead Confederate']),cls='Necromancer',source='https://eso-hub.com/en/skills/necromancer/living-death')
add_line('necromancer_mastery','Necromancer Class Mastery','Class',passives([('Death’s Covenant',1),('Corpse Weaver',1),('Grave Resolve',1),('Undying Purpose',1),('Soul Collector',1)],currency='class_mastery_point'),max_rank=1,cls='Necromancer',currency='class_mastery_point',source='https://eso-hub.com/en/skills/necromancer/necromancer-class-mastery')

# ---- Weapons ----
add_line('two_handed','Two-Handed','Weapon',family('Berserker Strike','Berserker Rage','Onslaught','Ultimate',50)+[skill('Smash','Scribing',0,currency='none')]+family('Uppercut','Dizzying Swing','Wrecking Blow','Active',2)+family('Critical Charge','Stampede','Critical Rush','Active',4)+family('Cleave','Carve','Brawler','Active',14)+family('Reverse Slash','Reverse Slice','Executioner','Active',20)+family('Momentum','Forward Momentum','Rally','Active',38)+passives(['Forceful','Heavy Weapons','Balanced Blade','Follow Up','Battle Rush']),source='https://eso-hub.com/en/skills/weapon/two-handed')
add_line('one_hand_and_shield','One Hand and Shield','Weapon',family('Shield Wall','Spell Wall','Shield Discipline','Ultimate',50)+[skill('Shield Throw','Scribing',0,currency='none')]+family('Puncture','Pierce Armor','Ransack','Active',2)+family('Low Slash','Heroic Slash','Deep Slash','Active',4)+family('Defensive Posture','Defensive Stance','Absorb Missile','Active',14)+family('Shield Charge','Shielded Assault','Invasion','Active',20)+family('Power Bash','Power Slam','Reverberating Bash','Active',38)+passives(['Fortress','Sword and Board','Deadly Bash','Deflect Bolts','Battlefield Mobility']),source='https://eso-hub.com/en/skills/weapon/one-hand-and-shield')
add_line('dual_wield','Dual Wield','Weapon',family('Lacerate','Thrive in Chaos','Rend','Ultimate',50)+[skill('Traveling Knife','Scribing',0,currency='none')]+family('Flurry','Rapid Strikes','Bloodthirst','Active',2)+family('Twin Slashes','Rending Slashes','Blood Craze','Active',4)+family('Whirlwind','Whirling Blades','Steel Tornado','Active',14)+family('Blade Cloak','Quick Cloak','Deadly Cloak','Active',20)+family('Hidden Blade','Shrouded Daggers','Flying Blade','Active',38)+passives(['Focused Killer','Ambidextrous','Controlled Fury','Ruffian','Twin Blade and Blunt']),source='https://eso-hub.com/en/skills/weapon/dual-wield')
add_line('bow','Bow','Weapon',family('Rapid Fire','Toxic Barrage','Ballista','Ultimate',50)+[skill('Vault','Scribing',0,currency='none')]+family('Snipe','Lethal Arrow','Focused Aim','Active',2)+family('Volley','Endless Hail','Arrow Barrage','Active',4)+family('Scatter Shot','Magnum Shot','Draining Shot','Active',14)+family('Arrow Spray','Bombard','Acid Spray','Active',20)+family('Poison Arrow','Poison Injection','Venom Arrow','Active',38)+passives(['Long Shots','Accuracy','Ranger','Hawk Eye','Hasty Retreat']),source='https://eso-hub.com/en/skills/weapon/bow')
add_line('destruction_staff','Destruction Staff','Weapon',family('Elemental Storm','Elemental Rage','Eye of the Storm','Ultimate',50)+[skill('Elemental Explosion','Scribing',0,currency='none')]+family('Force Shock','Crushing Shock','Force Pulse','Active',2)+family('Wall of Elements','Elemental Blockade','Unstable Wall of Elements','Active',4)+family('Destructive Touch','Destructive Reach','Destructive Clench','Active',14)+family('Weakness to Elements','Elemental Drain','Elemental Susceptibility','Active',20)+family('Impulse','Elemental Ring','Pulsar','Active',38)+passives(['Tri Focus','Penetrating Magic','Elemental Force','Ancient Knowledge','Destruction Expert']),source='https://eso-hub.com/en/skills/weapon/destruction-staff')
add_line('restoration_staff','Restoration Staff','Weapon',family('Panacea','Life Giver','Light’s Champion','Ultimate',50)+[skill("Mender's Bond",'Scribing',0,currency='none')]+family('Grand Healing','Healing Springs','Illustrious Healing','Active',2)+family('Regeneration','Radiating Regeneration','Rapid Regeneration','Active',4)+family('Blessing of Protection','Combat Prayer','Blessing of Restoration','Active',14)+family('Steadfast Ward','Healing Ward','Ward Ally','Active',20)+family('Force Siphon','Siphon Spirit','Quick Siphon','Active',38)+passives(['Essence Drain','Restoration Expert','Cycle of Life','Absorb','Restoration Master']),source='https://eso-hub.com/en/skills/weapon/restoration-staff')

# ---- Armor ----
add_line('light_armor','Light Armor','Armor',[skill('Annulment','Active',1,None,['Dampen Magic','Harness Magicka'],22),skill('Dampen Magic','Morph',1,'Annulment',[],22),skill('Harness Magicka','Morph',1,'Annulment',[],22)]+passives([('Grace',3),('Evocation',2),('Spell Warding',2),('Prodigy',2),('Concentration',2)]),source='https://eso-hub.com/en/skills/armor/light-armor')
add_line('medium_armor','Medium Armor','Armor',[skill('Evasion','Active',1,None,['Elude','Shuffle'],22),skill('Elude','Morph',1,'Evasion',[],22),skill('Shuffle','Morph',1,'Evasion',[],22)]+passives([('Dexterity',3),('Wind Walker',2),('Improved Sneak',2),('Agility',2),('Athletics',2)]),source='https://eso-hub.com/en/skills/armor/medium-armor')
add_line('heavy_armor','Heavy Armor','Armor',[skill('Immovable','Active',1,None,['Immovable Brute','Unstoppable'],22),skill('Immovable Brute','Morph',1,'Immovable',[],22),skill('Unstoppable','Morph',1,'Immovable',[],22)]+passives([('Resolve',3),('Constitution',2),('Juggernaut',2),('Revitalize',2),('Rapid Mending',2)]),source='https://eso-hub.com/en/skills/armor/heavy-armor')

# ---- World ----
add_line('soul_magic','Soul Magic','World',family('Soul Strike','Soul Assault','Shatter Soul','Ultimate',6)+family('Soul Trap','Consuming Trap','Soul Splitting Trap','Active',1)+passives([('Soul Shatter',2),('Soul Summons',2),('Soul Lock',2)]),max_rank=6,source='https://eso-hub.com/en/skills/world/soul-magic')
add_line('vampire','Vampire','World',family('Blood Scion','Swarming Scion','Perfect Scion','Ultimate',5)+family('Eviscerate','Blood for Blood','Arterial Burst','Active',1)+family('Blood Frenzy','Simmering Frenzy','Sated Fury','Active',2)+family('Vampiric Drain','Exhilarating Drain','Drain Vigor','Active',3)+family('Mesmerize','Hypnosis','Stupefy','Active',4)+family('Mist Form','Elusive Mist','Blood Mist','Active',5)+passives(['Feed','Dark Stalker','Strike from the Shadows','Undeath','Unnatural Movement']),max_rank=10,source='https://eso-hub.com/en/skills/world/vampire')
add_line('werewolf','Werewolf','World',family('Werewolf Transformation','Pack Leader','Werewolf Berserker','Ultimate',1)+family('Pounce','Brutal Pounce','Feral Pounce','Active',1)+family('Hircine’s Bounty','Hircine’s Fortitude','Hircine’s Rage','Active',2)+family('Roar','Ferocious Roar','Deafening Roar','Active',3)+family('Piercing Howl','Howl of Despair','Howl of Agony','Active',4)+family('Infectious Claws','Claws of Life','Claws of Anguish','Active',5)+passives(['Devour','Pursuit','Blood Rage','Bloodmoon','Savage Strength','Call of the Pack']),max_rank=10,source='https://eso-hub.com/en/skills/world/werewolf')
add_line('legerdemain','Legerdemain','World',passives([('Improved Hiding',4),('Light Fingers',4),('Trafficker',4),('Locksmith',4),('Kickback',4)]),max_rank=20,source='https://eso-hub.com/en/skills/world/legerdemain')
add_line('scrying','Scrying','World',passives([('Antiquarian Insight',5),('Scrier’s Patience',2),('Coalescence',2),('Future Focus',2),('Dilation',2),('Farsight',2),('Preemptive Power',1)]),max_rank=10,source='https://eso-hub.com/en/skills/world/scrying')
add_line('excavation','Excavation','World',passives([('Hand Brush',2),('Augur',2),('Trowel',2),('Keen Eye: Dig Sites',2),('Excavator’s Reserves',2),('Heavy Shovel',2)]),max_rank=10,source='https://eso-hub.com/en/skills/world/excavation')

# ---- Guild ----
add_line('fighters_guild','Fighters Guild','Guild',family('Dawnbreaker','Flawless Dawnbreaker','Dawnbreaker of Smiting','Ultimate',10)+family('Silver Bolts','Silver Shards','Silver Leash','Active',2)+family('Circle of Protection','Turn Evil','Ring of Preservation','Active',4)+family('Expert Hunter','Camouflaged Hunter','Evil Hunter','Active',6)+family('Trap Beast','Barbed Trap','Lightweight Beast Trap','Active',8)+passives(['Intimidating Presence','Slayer','Banish the Wicked','Skilled Tracker','Bounty Hunter']),max_rank=10,source='https://eso-hub.com/en/skills/guild/fighters-guild')
add_line('mages_guild','Mages Guild','Guild',family('Meteor','Ice Comet','Shooting Star','Ultimate',10)+family('Magelight','Inner Light','Radiant Magelight','Active',2)+family('Entropy','Degeneration','Structured Entropy','Active',4)+family('Fire Rune','Scalding Rune','Volcanic Rune','Active',6)+family('Equilibrium','Balance','Spell Symmetry','Active',8)+passives(['Persuasive Will','Mage Adept','Everlasting Magic','Magicka Controller','Might of the Guild']),max_rank=10,source='https://eso-hub.com/en/skills/guild/mages-guild')
add_line('undaunted','Undaunted','Guild',family('Blood Altar','Overflowing Altar','Sanguine Altar','Active',1)+family('Trapping Webs','Shadow Silk','Tangling Webs','Active',2)+family('Inner Fire','Inner Beast','Inner Rage','Active',3)+family('Bone Shield','Spiked Bone Shield','Bone Surge','Active',4)+family('Necrotic Orb','Mystic Orb','Energy Orb','Active',5)+passives(['Undaunted Command','Undaunted Mettle']),max_rank=9,source='https://eso-hub.com/en/skills/guild/undaunted')
add_line('psijic_order','Psijic Order','Guild',family('Undo','Precognition','Temporal Guard','Ultimate',10)+family('Time Stop','Time Freeze','Borrowed Time','Active',1)+family('Imbue Weapon','Crushing Weapon','Elemental Weapon','Active',3)+family('Accelerate','Race Against Time','Channeled Acceleration','Active',5)+family('Mend Wounds','Symbiosis','Mend Spirit','Active',7)+family('Meditate','Introspection','Deep Thoughts','Active',9)+passives(['See the Unseen','Clairvoyance','Spell Orb','Deliberation','Concentrated Barrier']),max_rank=10,source='https://eso-hub.com/en/skills/guild/psijic-order')
add_line('thieves_guild','Thieves Guild','Guild',passives([('Finders Keepers',1),('Swiftly Forgotten',4),('Haggling',4),('Clemency',1),('Timely Escape',1),('Veil of Shadows',4)]),max_rank=12,source='https://eso-hub.com/en/skills/guild/thieves-guild')
add_line('dark_brotherhood','Dark Brotherhood','Guild',[skill('Blade of Woe','Active',1)]+passives([('Scales of Pitiless Justice',4),('Padomaic Sprint',1),('Shadowy Supplier',1),('Shadow Rider',1),('Spectral Assassin',1)]),max_rank=12,source='https://eso-hub.com/en/skills/guild/dark-brotherhood')

# ---- Alliance War ----
add_line('assault','Assault','Alliance War',family('War Horn','Aggressive Horn','Sturdy Horn','Ultimate',10)+family('Vigor','Echoing Vigor','Resolving Vigor','Active',2)+family('Caltrops','Razor Caltrops','Anti-Cavalry Caltrops','Active',4)+family('Magicka Detonation','Inevitable Detonation','Proximity Detonation','Active',6)+family('Rapid Maneuver','Charging Maneuver','Retreating Maneuver','Active',8)+passives(['Continuous Attack','Reach','Combat Frenzy']),max_rank=10,source='https://eso-hub.com/en/skills/alliance-war/assault')
add_line('support','Support','Alliance War',family('Barrier','Replenishing Barrier','Reviving Barrier','Ultimate',10)+family('Siege Shield','Siege Weapon Shield','Propelling Shield','Active',2)+family('Purge','Efficient Purge','Cleanse','Active',4)+family('Guard','Stalwart Guard','Mystic Guard','Active',6)+family('Revealing Flare','Blinding Flare','Lingering Flare','Active',8)+passives(['Magicka Aid','Combat Medic','Battle Resurrection']),max_rank=10,source='https://eso-hub.com/en/skills/alliance-war/support')
add_line('emperor','Emperor','Alliance War',passives([('Domination',1),('Authority',1),('Monarch',1),('Tactician',1),('Emperor',1)]),max_rank=1,source='https://eso-hub.com/en/skills/alliance-war/emperor')

# ---- Races ----
races={
 'dark_elf':('Dark Elf Skills',['Ashlander',('Dynamic',3),('Resist Flame',3),('Ruination',3)]),
 'high_elf':('High Elf Skills',['Highborn',('Spell Recharge',3),('Syrabane’s Boon',3),('Elemental Talent',3)]),
 'wood_elf':('Wood Elf Skills',['Acrobat',('Y’ffre’s Endurance',3),('Resist Affliction',3),('Hunter’s Eye',3)]),
 'breton':('Breton Skills',['Opportunist',('Gift of Magnus',3),('Spell Attunement',3),('Magicka Mastery',3)]),
 'orc':('Orc Skills',['Craftsman',('Brawny',3),('Unflinching Rage',3),('Swift Warrior',3)]),
 'redguard':('Redguard Skills',['Wayfarer',('Martial Training',3),('Conditioning',3),('Adrenaline Rush',3)]),
 'nord':('Nord Skills',['Reveler',('Stalwart',3),('Resist Frost',3),('Rugged',3)]),
 'argonian':('Argonian Skills',['Amphibian',('Resourceful',3),('Argonian Resistance',3),('Life Mender',3)]),
 'khajiit':('Khajiit Skills',['Cutpurse',('Robustness',3),('Lunar Blessings',3),('Feline Ambush',3)]),
 'imperial':('Imperial Skills',['Diplomat',('Tough',3),('Imperial Mettle',3),('Red Diamond',3)])
}
for rid,(name,ps) in races.items(): add_line(rid,name,'Racial',passives(ps),max_rank=50,source=f'https://eso-hub.com/en/skills/racial/{rid.replace("_","-")}')

# ---- Craft ----
add_line('blacksmithing','Blacksmithing','Craft',passives([('Metalworking',10),('Keen Eye: Ore',3),('Miner Hireling',3),('Metal Extraction',3),('Metallurgy',4),('Temper Expertise',3)]),max_rank=50,source='https://eso-hub.com/en/skills/craft/blacksmithing')
add_line('clothing','Clothing','Craft',passives([('Tailoring',10),('Keen Eye: Cloth',3),('Outfitter Hireling',3),('Unraveling',3),('Stitching',4),('Tannin Expertise',3)]),max_rank=50,source='https://eso-hub.com/en/skills/craft/clothing')
add_line('woodworking','Woodworking','Craft',passives([('Woodworking',10),('Keen Eye: Wood',3),('Lumberjack Hireling',3),('Wood Extraction',3),('Carpentry',4),('Resin Expertise',3)]),max_rank=50,source='https://eso-hub.com/en/skills/craft/woodworking')
add_line('jewelry_crafting','Jewelry Crafting','Craft',passives([('Engraver',5),('Keen Eye: Jewelry',3),('Jewelry Extraction',3),('Lapidary Research',4),('Platings Expertise',3)]),max_rank=50,source='https://eso-hub.com/en/skills/craft/jewelry-crafting')
add_line('alchemy','Alchemy','Craft',passives([('Solvent Proficiency',8),('Keen Eye: Reagents',3),('Medicinal Use',3),('Chemistry',3),('Laboratory Use',1),('Snakeblood',3)]),max_rank=50,source='https://eso-hub.com/en/skills/craft/alchemy')
add_line('enchanting','Enchanting','Craft',passives([('Potency Improvement',10),('Aspect Improvement',4),('Keen Eye: Rune Stones',3),('Hireling',3),('Runestone Extraction',3)]),max_rank=50,source='https://eso-hub.com/en/skills/craft/enchanting')
add_line('provisioning','Provisioning','Craft',passives([('Recipe Quality',6),('Recipe Improvement',6),('Gourmand',3),('Connoisseur',3),('Chef',3),('Brewer',3),('Hireling',3)]),max_rank=50,source='https://eso-hub.com/en/skills/craft/provisioning')

# ---- System / scribing tracker ----
add_line('scribing','Scribing','System',[skill(x,'Scribing',0,currency='none') for x in ['Wield Soul','Soul Burst',"Ulfsild's Contingency",'Traveling Knife','Vault','Smash','Elemental Explosion',"Mender's Bond",'Shield Throw','Trample','Torchbearer','Banner Bearer']],max_rank=1,currency='none',source='https://eso-hub.com/en/scribing',note='Scribing unlocks and Grimoires are tracked, but they do not use ordinary skill points in this ledger.')

# Update 50 renamed several class abilities, passives, and Class Mastery choices.
# Preserve the existing catalog IDs so character backups and build JSON remain stable; only
# the player-facing display names change.
display_name_overrides = {
    # Dragonknight refresh
    'ardent_flame__venomous_claw': 'Searing Claw',
    'ardent_flame__fiery_breath': 'Dragonfire Breath',
    'ardent_flame__noxious_breath': 'Disintegrating Dragonfire',
    'ardent_flame__flames_of_oblivion': 'Incinerate',
    'draconic_power__spiked_armor': 'Earthspike Mantle',
    'draconic_power__volatile_armor': 'Shatterspike Mantle',
    'draconic_power__inhale': 'Core of Flame',
    'draconic_power__deep_breath': 'Soul of Flame',
    'draconic_power__iron_skin': 'Burnished Scales',
    'draconic_power__burning_heart': 'World in Ruin',
    'draconic_power__scaled_armor': 'The Storm Voice',
    'earthen_heart__eternal_mountain': 'Heart of Stone',
    'earthen_heart__battle_roar': 'Landslide',
    'earthen_heart__mountain_s_blessing': 'Blessing at the Peak',
    'earthen_heart__helping_hands': 'Mountain Giant',

    # Necromancer refresh
    'grave_lord__blighted_blastbones': "Grave Lord's Sacrifice",
    'grave_lord__archer': 'Skeletal Archer',

    # Class Mastery final names
    'dragonknight_mastery__recursive_flame': 'Inexorable Descent',
    'dragonknight_mastery__stone_blooded': 'Wildfire Embers',
    'dragonknight_mastery__draconic_bulwark': 'Resolute Defense',
    'dragonknight_mastery__molten_renewal': 'Booming Voice',
    'dragonknight_mastery__unyielding_heart': 'Lead From the Front',
    'templar_mastery__divine_refuge': 'Devout Guardian',
    'templar_mastery__sunlit_resolve': 'Steadfast Candescence',
    'templar_mastery__sacred_purpose': 'Bastion of Light',
    'sorcerer_mastery__storm_lashed': 'Static Reverberation',
    'sorcerer_mastery__daedric_reservoir': 'Conservation of Energy',
    'sorcerer_mastery__arcane_momentum': 'Calculated Defense',
    'sorcerer_mastery__voltaic_soul': 'Font of Power',
    'sorcerer_mastery__conjurer_s_dominion': 'Sphere of Influence',
    'nightblade_mastery__critical_motivation': 'An Eye for Exploitation',
    'nightblade_mastery__bloodied_precision': 'Above and Beyond',
    'nightblade_mastery__nocturnal_guile': 'Nocturnal Inspiration',
    'nightblade_mastery__shadowed_intent': "Cutthroat's Focus",
    'warden_mastery__seasonal_strength': 'Wild Adaptation',
    'warden_mastery__winter_s_dominion': 'Glacial Obstinance',
    'warden_mastery__wild_communion': "Tundra's Maw",
    'necromancer_mastery__death_s_covenant': 'Nothing Wasted',
    'necromancer_mastery__corpse_weaver': 'Cycle Unending',
    'necromancer_mastery__grave_resolve': 'Pound of Flesh',
    'necromancer_mastery__undying_purpose': "Veil's Forfeit",
    'necromancer_mastery__soul_collector': 'Malevolent Promise',
}
for line in lines:
    for entry in line['skills']:
        if entry['id'] in display_name_overrides:
            entry['name'] = display_name_overrides[entry['id']]

# Keep deterministic order and metadata.
catalog={
 'schema_version':1,
 'catalog_version':'0.4.0-u50',
 'game_version':'Update 50',
 'verified_date':'2026-08-05',
 'notes':['Bundled offline tracking catalog. Build JSON supplies recommendation order and build-specific status badges.','Class Mastery entries use Class Mastery choices rather than normal skill points.','Scribing rows are tracking-only and do not count against the ordinary skill-point ledger.'],
 'categories':['Class','Weapon','Armor','World','Guild','Alliance War','Racial','Craft','System'],
 'lines':lines
}
# Single copy only. The renderer reaches it through the "#catalog" import in package.json, so a second
# file under src/ would just be one more thing to forget to regenerate.
path=f'{ROOT}/resources/data/eso-skill-catalog.json'
os.makedirs(os.path.dirname(path),exist_ok=True)
with open(path,'w',encoding='utf8') as f:
    json.dump(catalog,f,ensure_ascii=False,indent=2)
    f.write('\n')

seen=set()
for line in lines:
    assert line['id'] not in seen, f"duplicate line id {line['id']}"
    seen.add(line['id'])
by_id={s['id']:s for l in lines for s in l['skills']}
assert len(by_id)==sum(len(l['skills']) for l in lines), 'duplicate skill id'
for l in lines:
    for s in l['skills']:
        for m in s['morph_ids']: assert by_id[m]['base_id']==s['id'], f"{m} does not point back at {s['id']}"
        if s['base_id']: assert s['id'] in by_id[s['base_id']]['morph_ids'], f"{s['id']} missing from its base"
print('lines',len(lines),'skills',len(by_id),'-> ',path)
