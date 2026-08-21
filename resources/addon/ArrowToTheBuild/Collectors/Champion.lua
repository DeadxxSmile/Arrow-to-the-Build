local ATTB = ArrowToTheBuild
local Util = ATTB.Util
local Collector = {}
ATTB.Collectors.Champion = Collector

local function collectChampionBar()
    local startSlot, endSlot = GetAssignableChampionBarStartAndEndSlots()
    local result = { supported = true, slots = {} }

    for slotIndex = startSlot, endSlot do
        local skillId = GetSlotBoundId(slotIndex, HOTBAR_CATEGORY_CHAMPION)
        local disciplineId = GetRequiredChampionDisciplineIdForSlot(slotIndex, HOTBAR_CATEGORY_CHAMPION)
        table.insert(result.slots, {
            position = slotIndex - startSlot + 1,
            disciplineId = disciplineId,
            disciplineName = Util.CleanName(GetChampionDisciplineName(disciplineId)),
            skillId = skillId,
            name = skillId > 0 and Util.CleanName(GetChampionSkillName(skillId)) or "Empty",
        })
    end
    return result
end

local function collectLinks(skillId)
    if not GetChampionSkillLinkIds then return {} end
    return { GetChampionSkillLinkIds(skillId) }
end

local function collectJumpPoints(skillId)
    if not DoesChampionSkillHaveJumpPoints or not GetChampionSkillJumpPoints then return {} end
    if not DoesChampionSkillHaveJumpPoints(skillId) then return {} end
    return { GetChampionSkillJumpPoints(skillId) }
end

local function collectPosition(skillId)
    if not GetChampionSkillPosition then return nil, nil, nil, nil, nil, nil end
    local rawX, rawY = GetChampionSkillPosition(skillId)
    local constellationX, constellationY = rawX, rawY
    local offsetX, offsetY = 0, 0
    if IsChampionSkillClusterRoot and GetChampionClusterRootOffset and IsChampionSkillClusterRoot(skillId) then
        offsetX, offsetY = GetChampionClusterRootOffset(skillId)
        constellationX = (rawX or 0) + (offsetX or 0)
        constellationY = (rawY or 0) + (offsetY or 0)
    end
    return rawX, rawY, constellationX, constellationY, offsetX, offsetY
end

local function buildClusterMembership(disciplineIndex)
    local rootBySkillId = {}
    if not IsChampionSkillClusterRoot or not GetChampionClusterSkillIds then return rootBySkillId end

    for skillIndex = 1, GetNumChampionDisciplineSkills(disciplineIndex) do
        local skillId = GetChampionSkillId(disciplineIndex, skillIndex)
        if IsChampionSkillClusterRoot(skillId) then
            rootBySkillId[skillId] = skillId
            for _, childSkillId in ipairs({ GetChampionClusterSkillIds(skillId) }) do
                rootBySkillId[childSkillId] = skillId
            end
        end
    end
    return rootBySkillId
end

function Collector.Collect()
    local result = {
        totalEarned = GetPlayerChampionPointsEarned(),
        graphSchemaVersion = 2,
        disciplines = {},
        slotted = collectChampionBar(),
    }

    for disciplineIndex = 1, GetNumChampionDisciplines() do
        local disciplineId = GetChampionDisciplineId(disciplineIndex)
        local discipline = {
            disciplineId = disciplineId,
            name = Util.CleanName(GetChampionDisciplineName(disciplineId)),
            spent = GetNumSpentChampionPoints(disciplineId),
            unspent = GetNumUnspentChampionPoints(disciplineId),
            stars = {},
        }

        -- Capture every star, not only invested stars. The desktop app uses this as a
        -- live ESO truth overlay for max points, stages, slottable state, graph links,
        -- roots, constellation coordinates, and nested cluster membership.
        local clusterRootBySkillId = buildClusterMembership(disciplineIndex)
        for skillIndex = 1, GetNumChampionDisciplineSkills(disciplineIndex) do
            local skillId = GetChampionSkillId(disciplineIndex, skillIndex)
            local points = GetNumPointsSpentOnChampionSkill(skillId)
            local skillType = GetChampionSkillType(skillId)
            local rawX, rawY, constellationX, constellationY, clusterOffsetX, clusterOffsetY = collectPosition(skillId)
            local clusterRootSkillId = clusterRootBySkillId[skillId] or 0
            table.insert(discipline.stars, {
                skillId = skillId,
                name = Util.CleanName(GetChampionSkillName(skillId)),
                points = points,
                maximumPoints = GetChampionSkillMaxPoints(skillId),
                skillType = skillType,
                slottable = CanChampionSkillTypeBeSlotted(skillType),
                jumpPoints = collectJumpPoints(skillId),
                linkedSkillIds = collectLinks(skillId),
                -- rawX/rawY are the coordinates ESO uses inside the current constellation
                -- or nested cluster. constellationX/constellationY place cluster portals on
                -- the outer constellation using the same root offset ESO applies.
                rawX = rawX,
                rawY = rawY,
                constellationX = constellationX,
                constellationY = constellationY,
                clusterOffsetX = clusterOffsetX,
                clusterOffsetY = clusterOffsetY,
                clusterRootSkillId = clusterRootSkillId,
                root = IsChampionSkillRootNode and IsChampionSkillRootNode(skillId) or false,
                clusterRoot = IsChampionSkillClusterRoot and IsChampionSkillClusterRoot(skillId) or false,
            })
        end
        table.insert(result.disciplines, discipline)
    end
    return result
end
