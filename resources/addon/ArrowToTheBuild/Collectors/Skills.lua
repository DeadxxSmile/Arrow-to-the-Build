local ATTB = ArrowToTheBuild
local Util = ATTB.Util
local Collector = {}
ATTB.Collectors.Skills = Collector

local function getCurrentAbilityIds(skillType, lineIndex, abilityIndex, progressionIndex, currentMorph, currentRank)
    local baseAbilityId = GetSkillAbilityId(skillType, lineIndex, abilityIndex, false)
    local progressionId = GetProgressionSkillProgressionId(skillType, lineIndex, abilityIndex)
    local morphAbilityId = nil
    if currentMorph > 0 and progressionId then
        morphAbilityId = GetProgressionSkillMorphSlotAbilityId(progressionId, currentMorph)
    end

    local rankedAbilityId = nil
    if progressionIndex and progressionIndex > 0 then
        rankedAbilityId = GetAbilityProgressionAbilityId(
            progressionIndex,
            currentMorph or 0,
            math.max(1, currentRank or 1)
        )
    end

    return {
        abilityId = morphAbilityId or rankedAbilityId or baseAbilityId,
        baseAbilityId = baseAbilityId,
        morphAbilityId = morphAbilityId,
        rankedAbilityId = rankedAbilityId,
        progressionId = progressionId,
    }
end

local function collectAbility(skillType, lineIndex, abilityIndex, lineId)
    local abilityName, _, _, passive, ultimate, purchased, progressionIndex, rankIndex =
        GetSkillAbilityInfo(skillType, lineIndex, abilityIndex)

    if not abilityName or not purchased then
        return nil, nil
    end

    local currentMorph = 0
    local currentRank = rankIndex or 0
    if progressionIndex and progressionIndex > 0 then
        local _, morph, rank = GetAbilityProgressionInfo(progressionIndex)
        currentMorph = morph or 0
        currentRank = rank or currentRank
    end

    local passiveRank, passiveMaxRank = nil, nil
    if passive then
        passiveRank, passiveMaxRank = GetSkillAbilityUpgradeInfo(skillType, lineIndex, abilityIndex)
    end

    local ids = getCurrentAbilityIds(skillType, lineIndex, abilityIndex, progressionIndex, currentMorph, currentRank)
    local compact = {
        abilityId = ids.abilityId,
        baseAbilityId = ids.baseAbilityId,
        progressionId = ids.progressionId,
        name = Util.CleanName(abilityName),
        currentRank = currentRank,
        currentMorph = currentMorph,
        passiveRank = passiveRank,
        passiveMaxRank = passiveMaxRank,
        isPassive = passive == true,
        isUltimate = ultimate == true,
    }

    return compact, {
        ability = compact,
        skillLineId = lineId,
        ids = { ids.abilityId, ids.baseAbilityId, ids.morphAbilityId, ids.rankedAbilityId },
    }
end

local function addLookup(byId, byName, lookup)
    if not lookup then
        return
    end
    for _, value in ipairs(lookup.ids) do
        if value and value ~= 0 then
            byId[tostring(value)] = lookup
        end
    end

    local nameKey = Util.NormalizeName(lookup.ability.name)
    if byName[nameKey] == nil then
        byName[nameKey] = lookup
    else
        byName[nameKey] = false
    end
end

local function collectActionBar(hotbarCategory, label, byId, byName)
    local firstSlot, lastSlot = GetAssignableAbilityBarStartAndEndSlots()
    local slots = {}

    for slotIndex = firstSlot, lastSlot do
        local abilityId = GetSlotBoundId(slotIndex, hotbarCategory)
        local slotType = GetSlotType(slotIndex, hotbarCategory)
        local name = abilityId > 0 and GetSlotName(slotIndex, hotbarCategory) or "Empty"

        local match = abilityId > 0 and byId[tostring(abilityId)] or nil
        local matchMethod = match and "ability-id" or nil
        if not match and abilityId > 0 then
            local nameKey = Util.NormalizeName(name)
            if nameKey and byName[nameKey] then
                match = byName[nameKey]
                matchMethod = "name"
            end
        end

        local slot = {
            position = slotIndex - firstSlot + 1,
            abilityId = abilityId,
            name = Util.CleanName(name),
            slotType = slotType,
            isUltimate = slotIndex == lastSlot,
        }
        if match then
            slot.skillAbilityId = match.ability.abilityId
            slot.progressionId = match.ability.progressionId
            slot.skillLineId = match.skillLineId
            slot.currentMorph = match.ability.currentMorph
            slot.currentRank = match.ability.currentRank
            slot.matchMethod = matchMethod
        end
        table.insert(slots, slot)
    end

    return { category = hotbarCategory, label = label, slots = slots }
end

function Collector.Collect()
    local result = { lines = {}, actionBars = {}, activeWeaponPair = nil }
    local byId = {}
    local byName = {}

    for skillType = 1, GetNumSkillTypes() do
        for lineIndex = 1, GetNumSkillLines(skillType) do
            local rank, _, _, discovered = GetSkillLineDynamicInfo(skillType, lineIndex)
            if discovered then
                local lineId = GetSkillLineId(skillType, lineIndex)
                local lineName = GetSkillLineNameById(lineId)
                local _, nextRankXp, currentXp = GetSkillLineXPInfo(skillType, lineIndex)
                local line = {
                    skillType = skillType,
                    skillTypeName = Util.CleanName(GetString(SI_SKILLTYPE, skillType)),
                    skillLineId = lineId,
                    name = Util.CleanName(lineName),
                    rank = rank,
                    xp = { nextRank = nextRankXp, current = currentXp },
                    abilities = {},
                }

                for abilityIndex = 1, GetNumSkillAbilities(skillType, lineIndex) do
                    local ability, lookup = collectAbility(skillType, lineIndex, abilityIndex, lineId)
                    if ability then
                        table.insert(line.abilities, ability)
                        addLookup(byId, byName, lookup)
                    end
                end
                table.insert(result.lines, line)
            end
        end
    end

    table.insert(result.actionBars, collectActionBar(HOTBAR_CATEGORY_PRIMARY, "Primary", byId, byName))
    table.insert(result.actionBars, collectActionBar(HOTBAR_CATEGORY_BACKUP, "Backup", byId, byName))

    local activePair, locked = GetActiveWeaponPairInfo()
    result.activeWeaponPair = { pair = activePair, locked = locked == true }
    return result
end
