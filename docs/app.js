const screenshots = [
  {
    src: 'assets/screenshots/first-run.webp',
    kicker: 'Start clean',
    title: 'First Run',
    description: 'ATTB remains useful before any character exists, with direct paths to manual creation, addon discovery, backups, and the standalone Build Editor.'
  },
  {
    src: 'assets/screenshots/add-first-character.webp',
    kicker: 'Manual character setup',
    title: 'Add Your First Character',
    description: 'Choose a target build while recording the character you actually made: name, level, race, alliance, attributes, and account-wide Champion Point budgets.'
  },
  {
    src: 'assets/screenshots/addon-onboarding.webp',
    kicker: 'Optional local integration',
    title: 'ESO Addon Onboarding',
    description: 'ATTB explains SavedVariables timing, detects your ESO profile, and lets you install the bundled addon or stay fully manual.'
  },
  {
    src: 'assets/screenshots/new-eso-character.webp',
    kicker: 'Explicit discovery',
    title: 'New ESO Character Found',
    description: 'New local snapshots are never silently linked. Choose a saved target, create a new build from the character, defer the decision, or ignore it.'
  },
  {
    src: 'assets/screenshots/synced-basic-setup.webp',
    kicker: 'What you have, what you want',
    title: 'Synchronized Basic Setup',
    description: 'Your selected character, target build, and variant stay visible while CURRENT ESO state remains separate from the authored TARGET.'
  },
  {
    src: 'assets/screenshots/skills-passives.webp',
    kicker: 'Audited progression gates',
    title: 'Skills & Passives',
    description: 'Skill-line ranks, prerequisites, morph readiness, passive gates, available Skill Points, and retirement rules drive the ordered unlock roadmap.'
  },
  {
    src: 'assets/screenshots/current-equipment.webp',
    kicker: 'Observed in ESO',
    title: 'Equipment Roadmap',
    description: 'See the gear ESO currently reports first, then work through the separate build-acquisition roadmap without confusing CURRENT equipment with TARGET gear.'
  },
  {
    src: 'assets/screenshots/current-action-bars.webp',
    kicker: 'Observed in ESO',
    title: 'Skill Bars & Rotations',
    description: 'Your real front and back bars from ESO sit above the build progression bands, hotbars, and rotation guidance.'
  },
  {
    src: 'assets/screenshots/champion-points.webp',
    kicker: 'Character-specific allocation',
    title: 'Champion Points',
    description: 'Track earned points, required connection paths, recommended branches, alternatives, and exactly which node the build wants next.'
  },
  {
    src: 'assets/screenshots/companions.webp',
    kicker: 'Combat support',
    title: 'Companion Builds',
    description: 'Pick a companion and setup, then see weapon, armor, traits, five ordered abilities, Ultimate, equipment guidance, and notes in one roomy view.'
  },
  {
    src: 'assets/screenshots/gameplay-tips.webp',
    kicker: 'Character-aware guidance',
    title: 'Tips & Tricks',
    description: 'Build-specific reminders, progression goals, warnings, and practical ESO advice stay one click away from the character you are playing.'
  },
  {
    src: 'assets/screenshots/build-library.webp',
    kicker: 'Authoring workspace',
    title: 'Build Library',
    description: 'Browse protected bundled builds and user-owned builds, inspect recovery drafts, fork a foundation, export JSON, or begin something new.'
  },
  {
    src: 'assets/screenshots/create-new-build.webp',
    kicker: 'Four starting paths',
    title: 'Create New Build',
    description: 'Start guided, begin from the complete advanced template, fork an existing foundation, or import a community Schema 4 JSON file.'
  },
  {
    src: 'assets/screenshots/build-editor-skills-passives.webp',
    kicker: 'Full visual authoring',
    title: 'Build Editor Skills & Passives',
    description: 'Choose relevant lines, search the audited catalog, author final, temporary, and optional purchases, and define when leveling picks should retire.'
  },
  {
    src: 'assets/screenshots/review-save.webp',
    kicker: 'Validate before you commit',
    title: 'Review & Save',
    description: 'Run validation, review blocking errors, warnings, suggestions, and patch compatibility, then save the next permanent build revision.'
  },
  {
    src: 'assets/screenshots/help-home.webp',
    kicker: 'Dedicated third workspace',
    title: 'Help & Tools',
    description: 'Gear, Combat, Progression, Companions, and general reference material now live in a full workspace beside Character Tracker and Build Editor.'
  },
  {
    src: 'assets/screenshots/equipment-traits.webp',
    kicker: 'Practical ESO reference',
    title: 'Equipment Traits',
    description: 'Decode armor, weapon, and jewelry traits while shopping, including what matters now, what can be transmuted later, and what a build is actually asking for.'
  },
  {
    src: 'assets/screenshots/build-glossary.webp',
    kicker: 'Plain-English reference',
    title: 'Build Glossary',
    description: 'AoE, DoT, proc, uptime, front bar, back bar, bridge, flex, comfort, stat stick, and other build shorthand explained inside ATTB.'
  },
  {
    src: 'assets/screenshots/settings-default.webp',
    kicker: 'ATTB Default',
    title: 'Application Settings',
    description: 'Manage theme, startup workspace, remote image behavior, local storage, character controls, addon synchronization, and Build Editor defaults.'
  },
  {
    src: 'assets/screenshots/settings-old-scrolls.webp',
    kicker: 'Six coherent themes',
    title: 'Old Scrolls Theme',
    description: 'Switch palettes without moving the interface: ATTB Default, Deep Dark, Light, Old Scrolls, SkyTrim, and Woodland share the same layout and behavior.'
  }
]

const lightbox = document.querySelector('#lightbox')
const lightboxImage = lightbox?.querySelector('img')
const lightboxTitle = document.querySelector('#lightbox-title')

function openLightbox(src, title) {
  if (!lightbox || !lightboxImage || !lightboxTitle) return
  lightboxImage.src = src
  lightboxImage.alt = title || 'ATTB screenshot'
  lightboxTitle.textContent = title || 'ATTB screenshot'
  lightbox.showModal()
}

function closeLightbox() {
  if (!lightbox?.open) return
  lightbox.close()
  if (lightboxImage) lightboxImage.src = ''
}

document.querySelectorAll('[data-lightbox]').forEach(button => {
  button.addEventListener('click', () => openLightbox(button.dataset.lightbox, button.dataset.title))
})

lightbox?.querySelector(':scope > button')?.addEventListener('click', closeLightbox)
lightbox?.addEventListener('click', event => { if (event.target === lightbox) closeLightbox() })
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeLightbox() })

const carouselImage = document.querySelector('#carousel-image')
const carouselTitle = document.querySelector('#carousel-title')
const carouselKicker = document.querySelector('#carousel-kicker')
const carouselDescription = document.querySelector('#carousel-description')
const carouselThumbs = document.querySelector('#carousel-thumbs')
const carouselMain = document.querySelector('.carousel-main')
let currentSlide = 0

function renderSlide(index) {
  if (!carouselImage || !carouselTitle || !carouselKicker || !carouselDescription || !carouselThumbs) return
  currentSlide = (index + screenshots.length) % screenshots.length
  const shot = screenshots[currentSlide]
  carouselImage.src = shot.src
  carouselImage.alt = `${shot.title} screenshot`
  carouselTitle.textContent = shot.title
  carouselKicker.textContent = shot.kicker
  carouselDescription.textContent = shot.description
  carouselThumbs.querySelectorAll('button').forEach((button, buttonIndex) => {
    button.classList.toggle('active', buttonIndex === currentSlide)
    button.setAttribute('aria-current', buttonIndex === currentSlide ? 'true' : 'false')
  })
}

if (carouselThumbs) {
  screenshots.forEach((shot, index) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.title = shot.title
    button.setAttribute('aria-label', `Show ${shot.title}`)
    const image = document.createElement('img')
    image.src = shot.src
    image.alt = ''
    image.loading = 'lazy'
    button.append(image)
    button.addEventListener('click', () => renderSlide(index))
    carouselThumbs.append(button)
  })
}

document.querySelector('.carousel-arrow.previous')?.addEventListener('click', () => renderSlide(currentSlide - 1))
document.querySelector('.carousel-arrow.next')?.addEventListener('click', () => renderSlide(currentSlide + 1))
carouselMain?.addEventListener('click', () => {
  const shot = screenshots[currentSlide]
  openLightbox(shot.src, shot.title)
})

renderSlide(currentSlide)
