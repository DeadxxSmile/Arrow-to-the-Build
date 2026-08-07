import { useApp } from '../App'
import AttributeAllocationEditor from '../components/AttributeAllocationEditor'
import ChoiceChips from '../components/ChoiceChips'
import { FieldLabel } from '../components/GuidancePopover'
import {
  buildEditorGuidance, races, raceGuidance, resourceGuidance, roleGuidance, recommendedAttributes, recommendedRace, roleDefaults
} from '../utils/buildEditorGuidance'

const roleOptions = ['damage', 'healer', 'tank', 'support', 'solo'].map(value => ({ value, label: buildEditorGuidance.roles[value].label }))
const resourceOptions = [{ value: 'magicka', label: 'Magicka' }, { value: 'stamina', label: 'Stamina' }, { value: 'health', label: 'Health-focused' }, { value: 'hybrid', label: 'Hybrid' }]

function emptyPage() {
  return <div className="page"><div className="page-title"><span className="eyebrow">Current build</span><h1>Character Setup</h1><p>Open or create a draft before editing this section.</p></div><section className="panel quiet-box">No editable build is currently open.</section></div>
}

export default function BuildCharacterSetupPage() {
  const { editor, appSettings } = useApp()
  const draft = editor.draft
  if (!draft) return emptyPage()
  const data = draft.data
  const defaults = data.defaults || {}
  const metadata = data.metadata || {}
  const role = defaults.role || metadata.roles?.[0] || 'damage'
  const resource = defaults.resource || metadata.resource || 'stamina'
  const resourceHelp = resourceGuidance(resource)
  const recommended = recommendedAttributes(resource)
  const showGuidance = appSettings.build_editor_show_guidance !== 'false'
  const patch = updater => editor.updateDraft(current => updater(current))
  const patchDefaults = value => patch(current => ({ ...current, defaults: { ...(current.defaults || {}), ...value } }))
  const patchMetadata = value => patch(current => ({ ...current, metadata: { ...(current.metadata || {}), ...value } }))
  const changeRole = next => {
    const value = next[0]
    const common = roleDefaults(value)
    patch(current => ({
      ...current,
      defaults: { ...(current.defaults || {}), role: value },
      metadata: {
        ...(current.metadata || {}), roles: [...new Set([value, ...(value === 'damage' ? [] : ['support'])])],
        content: current.metadata?.content?.length ? current.metadata.content : common.content,
        group_sizes: current.metadata?.group_sizes?.length ? current.metadata.group_sizes : common.group_sizes
      }
    }))
  }
  const changeResource = next => {
    const value = next[0]
    patch(current => ({
      ...current,
      defaults: { ...(current.defaults || {}), resource: value },
      metadata: { ...(current.metadata || {}), resource: value }
    }))
  }
  const applyCommonSetup = () => {
    const race = recommendedRace(resource, role)
    const roleCommon = roleDefaults(role)
    patch(current => ({
      ...current,
      defaults: {
        ...(current.defaults || {}), role, resource, race,
        alliance: buildEditorGuidance.races[race]?.alliance || current.defaults?.alliance || 'Any Alliance',
        attributes: recommendedAttributes(resource), mundus: roleCommon.mundus || resourceHelp.mundus?.[0] || current.defaults?.mundus,
        front_weapon: resourceHelp.front_weapons?.[0] || current.defaults?.front_weapon,
        back_weapon: Number(current.metadata?.bar_count || 2) === 1 ? 'One-bar setup' : resourceHelp.back_weapons?.[0] || current.defaults?.back_weapon,
        leveling_armor: resourceHelp.armor || current.defaults?.leveling_armor,
        endgame_armor: resourceHelp.armor || current.defaults?.endgame_armor
      }
    }))
  }
  const raceInfo = raceGuidance(defaults.race)

  return <div className="page build-character-setup-page">
    <div className="page-title"><span className="eyebrow">Current build</span><h1>Character Setup</h1><p>Define the recommended foundation. These are build targets; the Character Tracker stores what a player actually chose and spent separately.</p></div>

    {showGuidance && <section className="panel contextual-guidance-banner"><div><span className="eyebrow">Contextual guidance</span><h2>{buildEditorGuidance.roles[role]?.label || role} · {resource}</h2><p>{roleGuidance(role)?.summary} {resourceHelp.summary}</p></div><button type="button" className="btn secondary" onClick={applyCommonSetup}>Apply Common Starting Setup</button></section>}

    <section className="panel section-block"><div className="section-head"><div><span className="eyebrow">Build direction</span><h2>Role and resource</h2></div><small>These choices drive recommendations; they do not prevent unusual builds.</small></div>
      <div className="guided-question"><FieldLabel guidance={showGuidance ? { title: 'Primary role', summary: roleGuidance(role)?.summary } : null}>Primary role</FieldLabel><ChoiceChips name="Primary role" single values={[role]} options={roleOptions} onChange={changeRole} /></div>
      <div className="guided-question"><FieldLabel guidance={showGuidance ? { title: 'Primary resource', summary: resourceHelp.summary, common: resourceHelp.races?.map(name => `Common race: ${name}`) || [] } : null}>Primary resource</FieldLabel><ChoiceChips name="Primary resource" single values={[resource]} options={resourceOptions} onChange={changeResource} /></div>
    </section>

    <section className="panel section-block"><div className="section-head"><div><span className="eyebrow">Identity recommendations</span><h2>Race and alliance</h2></div><small>Race has passive bonuses, but it is not a hard class restriction.</small></div>
      <div className="form-grid two">
        <label><FieldLabel guidance={showGuidance ? { title: defaults.race || 'Race', summary: raceInfo?.summary, common: raceInfo?.common_for || [], notes: ['Choose what you enjoy unless the build is intended for tightly optimized score pushing.'] } : null}>Recommended race</FieldLabel><select value={defaults.race || ''} onChange={event => patchDefaults({ race: event.target.value, alliance: buildEditorGuidance.races[event.target.value]?.alliance || defaults.alliance })}><option value="">No recommendation</option>{races.map(name => <option key={name}>{name}</option>)}</select></label>
        <label><FieldLabel guidance={showGuidance ? { title: 'Alliance', summary: 'Alliance affects PvP identity and starting faction. It usually does not change ordinary PvE combat performance.' } : null}>Recommended alliance</FieldLabel><select value={defaults.alliance || ''} onChange={event => patchDefaults({ alliance: event.target.value })}><option value="">No recommendation</option>{buildEditorGuidance.alliances.map(name => <option key={name}>{name}</option>)}</select></label>
      </div>
    </section>

    <section className="panel section-block"><div className="section-head"><div><span className="eyebrow">Attributes</span><h2>Level 50 target</h2></div><small>ATTB validates that the combined target does not exceed 64 points.</small></div>
      <AttributeAllocationEditor value={defaults.attributes} recommended={recommended} onChange={attributes => patchDefaults({ attributes })} onApplyRecommendation={() => patchDefaults({ attributes: recommended })} />
    </section>

    <section className="panel section-block"><div className="section-head"><div><span className="eyebrow">Combat foundation</span><h2>Mundus, weapons, and armor</h2></div></div>
      <div className="form-grid three">
        <label><FieldLabel guidance={showGuidance ? { title: 'Mundus Stone', summary: 'Pick a general recommendation, then explain encounter-specific alternatives in loadouts or notes.', common: resourceHelp.mundus || [] } : null}>Mundus</FieldLabel><select value={defaults.mundus || ''} onChange={event => patchDefaults({ mundus: event.target.value })}><option value="">No recommendation</option>{buildEditorGuidance.mundus_options.map(name => <option key={name}>{name}</option>)}</select></label>
        <label><FieldLabel guidance={showGuidance ? { title: 'Front weapon', summary: 'The front bar usually holds the build’s primary repeatable actions and short-duration effects.', common: resourceHelp.front_weapons || [] } : null}>Front weapon</FieldLabel><select value={defaults.front_weapon || ''} onChange={event => patchDefaults({ front_weapon: event.target.value })}><option value="">Custom / undecided</option>{buildEditorGuidance.weapon_options.map(name => <option key={name}>{name}</option>)}</select></label>
        <label><FieldLabel guidance={showGuidance ? { title: 'Back weapon', summary: 'Weapon swapping unlocks at level 15. One-bar builds should state that the back bar is intentionally unavailable.', common: resourceHelp.back_weapons || [] } : null}>Back weapon</FieldLabel><select value={defaults.back_weapon || ''} onChange={event => patchDefaults({ back_weapon: event.target.value })}><option value="">Custom / undecided</option><option>One-bar setup</option>{buildEditorGuidance.weapon_options.map(name => <option key={name}>{name}</option>)}</select></label>
        <label><span>Leveling armor</span><select value={defaults.leveling_armor || ''} onChange={event => patchDefaults({ leveling_armor: event.target.value })}><option value="">Custom mix</option>{buildEditorGuidance.armor_options.map(name => <option key={name}>{name}</option>)}</select></label>
        <label><span>Endgame armor</span><select value={defaults.endgame_armor || ''} onChange={event => patchDefaults({ endgame_armor: event.target.value })}><option value="">Custom mix</option>{buildEditorGuidance.armor_options.map(name => <option key={name}>{name}</option>)}</select></label>
        <label><span>Leveling trait</span><input value={defaults.leveling_trait || ''} onChange={event => patchDefaults({ leveling_trait: event.target.value })} placeholder="Training" /></label>
        <label><span>Permanent gear begins</span><input value={defaults.gear_cap || ''} onChange={event => patchDefaults({ gear_cap: event.target.value })} placeholder="Level 50 / CP160" /></label>
        <label className="toggle-label"><span><b>Assumes ESO Plus</b><small>Used for access guidance; it does not change the player’s account.</small></span><input type="checkbox" checked={!!defaults.eso_plus} onChange={event => patchDefaults({ eso_plus: event.target.checked })} /></label>
        <label><span>Transformation / curse</span><select value={defaults.curse || 'none'} onChange={event => patch(current => ({ ...current, defaults: { ...(current.defaults || {}), curse: event.target.value }, transformations: { ...(current.transformations || {}), curse: event.target.value, notes: current.transformations?.notes || [] } }))}><option value="none">None</option><option value="vampire">Vampire</option><option value="werewolf">Werewolf</option></select></label>
      </div>
    </section>

    <section className="panel section-block"><div className="section-head"><div><span className="eyebrow">Use cases</span><h2>Content and group sizes</h2></div></div>
      <div className="guided-question"><span>Content</span><ChoiceChips name="Content" values={metadata.content || []} options={buildEditorGuidance.content_options} onChange={content => patchMetadata({ content })} /></div>
      <div className="guided-question"><span>Group sizes</span><ChoiceChips name="Group sizes" values={metadata.group_sizes || []} options={buildEditorGuidance.group_size_options} onChange={group_sizes => patchMetadata({ group_sizes })} /></div>
      <div className="guided-question"><span>Ability bars</span><ChoiceChips name="Ability bars" single values={[String(metadata.bar_count || 2)]} options={[{ value: '2', label: 'Two bars' }, { value: '1', label: 'One bar' }]} onChange={next => patchMetadata({ bar_count: Number(next[0]) })} /></div>
    </section>
  </div>
}
