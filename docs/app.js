const screenshots = [
  {
    src: 'assets/screenshots/welcome.webp',
    kicker: 'First launch',
    title: 'Welcome to ATTB',
    description: 'A clean empty state explains the app before any character, sidebar, or build pages appear.'
  },
  {
    src: 'assets/screenshots/character-setup.webp',
    kicker: 'Character setup',
    title: 'Create the first character',
    description: 'Choose a bundled build while recording the name, level, race, and alliance the player actually selected.'
  },
  {
    src: 'assets/screenshots/current-levels.webp',
    kicker: 'Live profile',
    title: 'Current Levels',
    description: 'See the selected character, current progression band, Skill Point accounting, and the build\'s next priorities.'
  },
  {
    src: 'assets/screenshots/basic-setup.webp',
    kicker: 'Foundation',
    title: 'Basic Setup',
    description: 'Compare the character profile with the build recommendation, review setup explanations, and track the recorded attribute split.'
  },
  {
    src: 'assets/screenshots/skills-passives.webp',
    kicker: 'Full-line tracking',
    title: 'Skills & Passives',
    description: 'Browse real skill lines with icons, base abilities, morph branches, passive ranks, unlock requirements, and build badges.'
  },
  {
    src: 'assets/screenshots/equipment.webp',
    kicker: 'Piece-by-piece tracking',
    title: 'Equipment Roadmap',
    description: 'Track armor, jewelry, and weapons individually across leveling, starter, intermediate, and final gear stages.'
  },
  {
    src: 'assets/screenshots/rotations.webp',
    kicker: 'Bars by progression band',
    title: 'Skill Bars & Rotations',
    description: 'See the five front-bar skills, five back-bar skills, ultimates, temporary slots, and the practical rotation beneath them.'
  },
  {
    src: 'assets/screenshots/tips-tools.webp',
    kicker: 'Gameplay help',
    title: 'Tips & Tricks',
    description: 'Keep build-specific warnings, progression reminders, ESO resources, backups, and JSON tools close to the character.'
  },
  {
    src: 'assets/screenshots/character-settings.webp',
    kicker: 'Editable profile',
    title: 'Character Settings',
    description: 'Correct profile details, adjust attributes, add personal skill lines, change builds, and remove the local ATTB profile when needed.'
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
let currentSlide = 2

function renderSlide(index) {
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

screenshots.forEach((shot, index) => {
  const button = document.createElement('button')
  button.type = 'button'
  button.title = shot.title
  button.setAttribute('aria-label', `Show ${shot.title}`)
  const image = document.createElement('img')
  image.src = shot.src
  image.alt = ''
  button.append(image)
  button.addEventListener('click', () => renderSlide(index))
  carouselThumbs.append(button)
})

document.querySelector('.carousel-arrow.previous')?.addEventListener('click', () => renderSlide(currentSlide - 1))
document.querySelector('.carousel-arrow.next')?.addEventListener('click', () => renderSlide(currentSlide + 1))
carouselMain?.addEventListener('click', () => {
  const shot = screenshots[currentSlide]
  openLightbox(shot.src, shot.title)
})

renderSlide(currentSlide)
