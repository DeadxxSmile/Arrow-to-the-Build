const screenshots = [
  {
    src: 'assets/screenshots/first-run.webp',
    kicker: 'Start clean',
    title: 'First Run',
    description: 'ATTB remains useful before any character exists, with a clear path to manual creation, addon discovery, backups, or the standalone Build Editor.'
  },
  {
    src: 'assets/screenshots/add-first-character.webp',
    kicker: 'Manual character setup',
    title: 'Add Your First Character',
    description: 'Choose a target build while recording the real character name, level, race, alliance, attributes, and account-wide Champion Point budgets.'
  },
  {
    src: 'assets/screenshots/addon-onboarding.webp',
    kicker: 'Optional local integration',
    title: 'ESO Addon Onboarding',
    description: 'ATTB explains SavedVariables timing, detects the ESO profile, and lets you install the bundled addon or stay fully manual.'
  },
  {
    src: 'assets/screenshots/new-eso-character.webp',
    kicker: 'Explicit discovery',
    title: 'New ESO Character Found',
    description: 'New local snapshots are never silently linked. Choose a compatible saved target, create a new build, defer the decision, or ignore the character.'
  },
  {
    src: 'assets/screenshots/synced-basic-setup.webp',
    kicker: 'CURRENT + TARGET',
    title: 'Synchronized Basic Setup',
    description: 'See the observed ESO character beside the authored build target, then create another plan or adapt a saved target without rewriting the live record.'
  },
  {
    src: 'assets/screenshots/skills-passives.webp',
    kicker: 'Audited progression gates',
    title: 'Skills & Passives',
    description: 'Exact skill-line ranks, passive point gates, prerequisites, morph readiness, and available Skill Points drive the ordered unlock roadmap.'
  },
  {
    src: 'assets/screenshots/current-action-bars.webp',
    kicker: 'Observed in ESO',
    title: 'Current Action Bars',
    description: 'Compare the live front and back bars imported from ESO with the authored progression bars and rotations below them.'
  },
  {
    src: 'assets/screenshots/champion-points.webp',
    kicker: 'Character-specific allocation',
    title: 'Champion Points',
    description: 'Track earned, spent, and unspent points, current slottables, required paths, recommended branches, alternatives, and final bars.'
  },
  {
    src: 'assets/screenshots/companions.webp',
    kicker: 'Combat support',
    title: 'Companion Builds',
    description: 'Pick a companion and setup, then see weapon, armor, traits, five ordered abilities, Ultimate, equipment guidance, and notes in one roomy view.'
  },
  {
    src: 'assets/screenshots/gameplay-tips.webp',
    kicker: 'Build-specific help',
    title: 'Tips & Tricks',
    description: 'Keep practical reminders, warnings, optional systems, and build-specific gameplay guidance beside the character instead of buried in a browser tab.'
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
    src: 'assets/screenshots/guided-build-setup.webp',
    kicker: 'Guided foundation',
    title: 'Guided Build Setup',
    description: 'Choose the important identity, role, resource, progression coverage, class direction, and bar count so ATTB can create a valid editable scaffold.'
  },
  {
    src: 'assets/screenshots/build-editor-overview.webp',
    kicker: 'CURRENT ESO state to editable draft',
    title: 'Build Editor Overview',
    description: 'A build seeded from a synchronized character preserves the imported CURRENT state while leaving future recommendations for the author to decide.'
  },
  {
    src: 'assets/screenshots/build-editor-champion-points.webp',
    kicker: 'Full CP authoring',
    title: 'Build Editor Champion Points',
    description: 'Author required connection paths, optional branches, stage thresholds, slottables, notes, and final Champion bars for all three constellations.'
  },
  {
    src: 'assets/screenshots/settings-default.webp',
    kicker: 'ATTB Default',
    title: 'Application Settings',
    description: 'Manage theme, startup workspace, remote image behavior, local storage, character controls, addon synchronization, and Build Editor defaults.'
  },
  {
    src: 'assets/screenshots/settings-old-scrolls.webp',
    kicker: 'Four coherent themes',
    title: 'Old Scrolls Theme',
    description: 'Switch palettes without moving the interface: all themes share the same typography and layout metrics while changing color and surface treatment.'
  },
  {
    src: 'assets/screenshots/addon-sync-settings.webp',
    kicker: 'Single-addon sync',
    title: 'ESO Addon & Sync',
    description: 'See the configured profile, installed addon version, synchronization state, snapshot count, overrides, repair controls, and the /reloadui reminder together.'
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
