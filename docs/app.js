const screenshots = [
  {
    src: 'assets/screenshots/create-build-from-character.webp',
    kicker: 'Live character to editable build',
    title: 'Create Build from Character',
    description: 'Use the latest synchronized ESO snapshot as the truthful CURRENT starting point for a new editable Schema 4 build.'
  },
  {
    src: 'assets/screenshots/new-eso-character.webp',
    kicker: 'Explicit synchronization',
    title: 'New ESO Character Found',
    description: 'ATTB discovers characters locally but never silently adds or links them. You choose how the new character should enter the app.'
  },
  {
    src: 'assets/screenshots/synced-basic-setup.webp',
    kicker: 'Current reality + target guidance',
    title: 'Synchronized Basic Setup',
    description: 'See the observed character profile alongside the build defaults and concepts without allowing sync to overwrite authored planning.'
  },
  {
    src: 'assets/screenshots/skills-passives.webp',
    kicker: 'Build-directed progression',
    title: 'Skills & Passives',
    description: 'Track whole skill lines, current purchases and morphs, curated passive priorities, and the next useful build-directed steps.'
  },
  {
    src: 'assets/screenshots/current-action-bars.webp',
    kicker: 'What ESO sees right now',
    title: 'Observed Action Bars',
    description: 'Compare the live front and back bars imported from ESO with the authored progression bars and rotations below them.'
  },
  {
    src: 'assets/screenshots/champion-points.webp',
    kicker: 'Detailed Champion planning',
    title: 'Champion Points',
    description: 'Track earned, spent, unspent, connected paths, recommended branches, alternatives, and the final Craft, Warfare, and Fitness bars.'
  },
  {
    src: 'assets/screenshots/build-library.webp',
    kicker: 'Two-workspace authoring',
    title: 'Build Library',
    description: 'Browse bundled and user builds, create guided drafts, fork immutable bundled builds, and return to saved revisions.'
  },
  {
    src: 'assets/screenshots/review-save.webp',
    kicker: 'Schema 4 authoring',
    title: 'Review & Save',
    description: 'Validate the complete build, review warnings and suggestions, then save an immutable revision and readable JSON mirror.'
  }
]

const lightbox = document.querySelector('#lightbox')
const lightboxImage = lightbox?.querySelector('img')
const lightboxTitle = document.querySelector('#lightbox-title')

function openLightbox(src, title) {
  if (!lightbox || !lightboxImage) return
  lightboxImage.src = src
  lightboxImage.alt = title || 'ATTB screenshot'
  lightboxTitle.textContent = title || 'ATTB screenshot'
  lightbox.showModal()
}

document.querySelectorAll('[data-lightbox]').forEach(button => {
  button.addEventListener('click', () => openLightbox(button.dataset.lightbox, button.dataset.title))
})

lightbox?.querySelector('button')?.addEventListener('click', () => lightbox.close())
lightbox?.addEventListener('click', event => { if (event.target === lightbox) lightbox.close() })
document.addEventListener('keydown', event => { if (event.key === 'Escape' && lightbox?.open) lightbox.close() })

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
