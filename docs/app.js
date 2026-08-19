/* Arrow to the Build marketing site behavior.
   Kept vanilla and dependency-free so GitHub Pages can serve it as-is. */

/* ---------- lightbox ---------- */
const lightbox = document.querySelector('#lightbox')
const lightboxImage = lightbox?.querySelector('img')
const lightboxTitle = document.querySelector('#lightbox-title')

function openLightbox(src, title) {
  if (!lightbox || !lightboxImage || !lightboxTitle) return
  lightboxImage.src = src
  lightboxImage.alt = title || 'ATTB screenshot'
  lightboxTitle.textContent = title || 'ATTB screenshot'
  if (typeof lightbox.showModal === 'function') lightbox.showModal()
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

/* ---------- screenshot gallery ---------- */
const galleryShots = [
  ['assets/v3/hero-basic-info.webp', 'Character Tracker · Basic Info'],
  ['assets/v3/skills-passives.webp', 'Skills & Passives'],
  ['assets/v3/equipment-roadmap.webp', 'Equipment Roadmap'],
  ['assets/v3/champion-points.webp', 'Champion Points'],
  ['assets/v3/companions.webp', 'Companions'],
  ['assets/v3/build-library.webp', 'Build Library'],
  ['assets/v3/create-build.webp', 'Create New Build'],
  ['assets/v3/build-skills.webp', 'Build Editor · Skills & Passives'],
  ['assets/v3/review-save.webp', 'Review & Save'],
  ['assets/v3/help-home.webp', 'Help & Tools'],
  ['assets/v3/theme-deadx.webp', 'Deadx_xSmile Theme'],
  ['assets/v3/theme-editor.webp', 'Visual Theme Editor']
]
const carouselImg = document.querySelector('#carousel-img')
const carouselTitle = document.querySelector('#carousel-title')
const carouselCount = document.querySelector('#carousel-count')
const carouselFrame = document.querySelector('#carousel-frame')
let carouselIndex = 0
function showSlide(i) {
  carouselIndex = (i + galleryShots.length) % galleryShots.length // wrap around both ends
  const [src, title] = galleryShots[carouselIndex]
  if (carouselImg) { carouselImg.src = src; carouselImg.alt = title }
  if (carouselTitle) carouselTitle.textContent = title
  if (carouselCount) carouselCount.textContent = `${carouselIndex + 1} / ${galleryShots.length}`
}
document.querySelector('#carousel-prev')?.addEventListener('click', () => showSlide(carouselIndex - 1))
document.querySelector('#carousel-next')?.addEventListener('click', () => showSlide(carouselIndex + 1))
carouselFrame?.addEventListener('click', () => openLightbox(galleryShots[carouselIndex][0], galleryShots[carouselIndex][1]))
document.querySelector('#carousel')?.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') { event.preventDefault(); showSlide(carouselIndex - 1) }
  else if (event.key === 'ArrowRight') { event.preventDefault(); showSlide(carouselIndex + 1) }
})
if (carouselImg) showSlide(0)

/* ---------- mobile drawer ---------- */
const body = document.body
const navToggle = document.querySelector('#nav-toggle')
const navScrim = document.querySelector('#nav-scrim')

function setDrawer(open) {
  body.classList.toggle('nav-open', open)
  navToggle?.setAttribute('aria-expanded', open ? 'true' : 'false')
  navToggle?.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation')
  if (navScrim) navScrim.hidden = !open
}
navToggle?.addEventListener('click', () => setDrawer(!body.classList.contains('nav-open')))
navScrim?.addEventListener('click', () => setDrawer(false))
// a nav choice on mobile should close the drawer so you land on the section
document.querySelectorAll('.site-sidebar a').forEach(link => {
  link.addEventListener('click', () => { if (window.matchMedia('(max-width: 1024px)').matches) setDrawer(false) })
})
document.addEventListener('keydown', event => { if (event.key === 'Escape') setDrawer(false) })

/* ---------- scroll spy (position based) ----------
   IntersectionObserver ratios skip tall sections and never reach the very top or
   bottom, so instead we pick the last section whose top has passed a line just
   under the fixed bar. That guarantees Overview at the top and Install at the end. */
const navLinks = [...document.querySelectorAll('.sidebar-nav a[href^="#"]')]
const linkById = new Map(navLinks.map(link => [link.getAttribute('href').slice(1), link]))
const spySections = navLinks
  .map(link => document.getElementById(link.getAttribute('href').slice(1)))
  .filter(Boolean)

function activationLine() {
  const bar = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--bar')) || 40
  return bar + 120
}
function setActiveSection(id) {
  navLinks.forEach(link => link.classList.remove('is-active'))
  linkById.get(id)?.classList.add('is-active')
}
function updateSpy() {
  if (!spySections.length) return
  const line = activationLine()
  if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 2) {
    setActiveSection(spySections[spySections.length - 1].id) // tail reachable at the very bottom
    return
  }
  // Pick the section whose top is closest to the line from above (largest top still <= line).
  // This is order-independent, so a section like #json that is nested inside #build
  // does not throw off the result the way an ordered scan did.
  let currentId = spySections[0].id
  let best = -Infinity
  for (const section of spySections) {
    const top = section.getBoundingClientRect().top
    if (top <= line && top > best) { best = top; currentId = section.id }
  }
  setActiveSection(currentId)
}
let spyQueued = false
function queueSpy() {
  if (spyQueued) return
  spyQueued = true
  requestAnimationFrame(() => { spyQueued = false; updateSpy() })
}
window.addEventListener('scroll', queueSpy, { passive: true })
window.addEventListener('resize', queueSpy)
updateSpy()

/* ---------- theme previewer ----------
   Data driven so adding a theme is one array entry plus one image. Swatches are
   built from each theme's real token colors, so they are always accurate. */
const THEMES = [
  { name: "ATTB Default", sub: "Navy · bronze · cyan", shot: "assets/themes/theme-default.webp", sw: ["#071018", "#12232E", "#D4934E", "#6FB6CF", "#E2B45E"] },
  { name: "Carbon Crimson", sub: "Graphite · crimson · steel", shot: "assets/themes/theme-carbon-crimson.webp", sw: ["#0E0E10", "#252527", "#D84B59", "#8DA7C1", "#E8A458"] },
  { name: "Deadx_xSmile", sub: "Near-black · pink · blue", shot: "assets/themes/theme-deadx.webp", sw: ["#080A0F", "#171717", "#ED2490", "#2078E2", "#41D6D0"] },
  { name: "Deep Dark", sub: "Near-black · green · blue", shot: "assets/themes/theme-deep-dark.webp", sw: ["#020508", "#0A1720", "#58D987", "#59BCE8", "#E3C15D"] },
  { name: "Emberbox", sub: "Warm brown · burnt orange", shot: "assets/themes/theme-emberbox.webp", sw: ["#191613", "#2F2C29", "#D66A1E", "#83A598", "#E0A72D"] },
  { name: "Latte Rose", sub: "Cream · rose · lavender", shot: "assets/themes/theme-latte-rose.webp", sw: ["#F1ECE7", "#F6F3F0", "#A84E72", "#6977A6", "#A96F3D"] },
  { name: "Light", sub: "Off-white · blue-gray · copper", shot: "assets/themes/theme-light.webp", sw: ["#DDE4E6", "#E4EAEB", "#A76537", "#3F7F99", "#A57A2D"] },
  { name: "Midnight Blurple", sub: "Charcoal-blue · blurple · cyan", shot: "assets/themes/theme-midnight-blurple.webp", sw: ["#0D0E14", "#24252A", "#7C83FF", "#55D6BE", "#F3B562"] },
  { name: "Old Scrolls", sub: "Black · gold · parchment", shot: "assets/themes/theme-old-scrolls.webp", sw: ["#0C0D0D", "#171817", "#D3A62B", "#C2A15D", "#D9AD32"] },
  { name: "OLED Aurora", sub: "True black · cyan · teal neon", shot: "assets/themes/theme-oled-aurora.webp", sw: ["#000000", "#181818", "#00BFD9", "#00D89D", "#FFD166"] },
  { name: "Paper Azure", sub: "Cool light · azure · teal", shot: "assets/themes/theme-paper-azure.webp", sw: ["#E8EDF3", "#F1F4F8", "#2F6FAD", "#218C88", "#A96F2E"] },
  { name: "Polar Night", sub: "Slate · icy cyan · glacier", shot: "assets/themes/theme-polar-night.webp", sw: ["#11151C", "#282B32", "#88C0D0", "#81A1C1", "#EBCB8B"] },
  { name: "Rainbow Dark", sub: "Deep neutrals · full spectrum", shot: "assets/themes/theme-rainbow-dark.webp", sw: ["#090D14", "#172231", "#C9788D", "#6D9BB5", "#D2A65D"] },
  { name: "Rainbow Light", sub: "Light neutrals · full spectrum", shot: "assets/themes/theme-rainbow-light.webp", sw: ["#E7E5E5", "#E9ECEB", "#A95F73", "#4F7F97", "#B18A45"] },
  { name: "Sage Fog", sub: "Sage-gray · forest · terracotta", shot: "assets/themes/theme-sage-fog.webp", sw: ["#9FA8A4", "#B7BEBB", "#315F50", "#3F6178", "#925B3F"] },
  { name: "SkyTrim", sub: "Monochrome · Skyrim menu", shot: "assets/themes/theme-skytrim.webp", sw: ["#08090A", "#15171A", "#E2E2DF", "#C0C3C5", "#F7F7F3"] },
  { name: "Tokyo Dusk", sub: "Navy · blue · cyan · violet", shot: "assets/themes/theme-tokyo-dusk.webp", sw: ["#0B1020", "#222735", "#7AA2F7", "#2AC3DE", "#E0AF68"] },
  { name: "Velvet Plum", sub: "Aubergine · violet · mint", shot: "assets/themes/theme-velvet-plum.webp", sw: ["#120D18", "#29242E", "#C678DD", "#7FD6C2", "#F0A66E"] },
  { name: "Watermelon", sub: "Rind green · coral · cream", shot: "assets/themes/theme-watermelon.webp", sw: ["#07110D", "#13271F", "#E26772", "#5C9A72", "#E9C77E"] },
  { name: "Woodland", sub: "Hunter green · sage · natural", shot: "assets/themes/theme-woodland.webp", sw: ["#08110E", "#12241D", "#6F9A82", "#A3B9AD", "#D3B687"] }
]

const themeRail = document.querySelector('.theme-rail')
const themeShot = document.querySelector('#theme-shot')
const themeStageBtn = document.querySelector('#theme-stage-btn')
const themeCaption = document.querySelector('#theme-caption')
let themeChips = []

function swatchGradient(sw) {
  // even five-stop band from the theme's real token colors
  const stops = sw.map((c, i) => `${c} ${i * 20}% ${(i + 1) * 20}%`).join(', ')
  return `linear-gradient(90deg, ${stops})`
}
function buildThemeChips() {
  if (!themeRail) return
  themeRail.innerHTML = ''
  THEMES.forEach((t, i) => {
    const chip = document.createElement('button')
    chip.type = 'button'
    chip.className = 'theme-chip' + (i === 0 ? ' is-active' : '')
    chip.setAttribute('role', 'tab')
    chip.setAttribute('aria-selected', i === 0 ? 'true' : 'false')
    chip.dataset.shot = t.shot
    chip.dataset.name = t.name
    chip.dataset.sub = t.sub
    const swatch = document.createElement('span')
    swatch.className = 'chip-swatch'
    swatch.style.background = swatchGradient(t.sw)
    swatch.setAttribute('aria-hidden', 'true')
    const text = document.createElement('span')
    text.className = 'chip-text'
    text.innerHTML = '<b></b><small></small>'
    text.querySelector('b').textContent = t.name
    text.querySelector('small').textContent = t.sub
    chip.append(swatch, text)
    chip.addEventListener('click', () => selectTheme(chip, false))
    chip.addEventListener('keydown', event => {
      const forward = event.key === 'ArrowDown' || event.key === 'ArrowRight'
      const back = event.key === 'ArrowUp' || event.key === 'ArrowLeft'
      if (!forward && !back) return
      event.preventDefault()
      const next = (i + (forward ? 1 : -1) + THEMES.length) % THEMES.length
      selectTheme(themeChips[next], true)
    })
    themeRail.append(chip)
  })
  themeChips = [...themeRail.querySelectorAll('.theme-chip')]
}

function selectTheme(chip, focus) {
  if (!chip || !themeShot) return
  themeChips.forEach(c => { c.classList.remove('is-active'); c.setAttribute('aria-selected', 'false') })
  chip.classList.add('is-active')
  chip.setAttribute('aria-selected', 'true')
  if (focus) chip.focus()

  const { shot, name, sub } = chip.dataset
  if (themeCaption) { themeCaption.innerHTML = '<b></b> <span></span>'; themeCaption.querySelector('b').textContent = name; themeCaption.querySelector('span').textContent = sub }

  // preload first so the crossfade lands on a ready image with no flash of nothing
  themeStageBtn?.classList.add('is-swapping')
  const pre = new Image()
  pre.onload = () => {
    themeShot.src = shot
    themeShot.alt = `ATTB main page shown in the ${name} theme`
    requestAnimationFrame(() => themeStageBtn?.classList.remove('is-swapping'))
  }
  pre.src = shot
}
buildThemeChips()
// clicking the preview opens it full size at the current theme
themeStageBtn?.addEventListener('click', () => {
  const active = themeRail?.querySelector('.theme-chip.is-active')
  openLightbox(themeShot?.src, active ? `${active.dataset.name} theme` : 'ATTB theme')
})
