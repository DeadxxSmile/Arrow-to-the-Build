'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const exists = relative => fs.existsSync(path.join(root, relative))

function publicVersion() {
  const match = read('README.md').match(/Current public release:\s*\*\*v([^*]+)\*\*/)
  assert.ok(match, 'README public release version was not found')
  return match[1]
}

function jsonLdBlocks(html) {
  return [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)]
    .map(match => JSON.parse(match[1]))
}

test('public website advertises the canonical custom domain and remains indexable', () => {
  const html = read('docs/index.html')
  assert.match(html, /<link rel="canonical" href="https:\/\/arrowtothebuild\.com\/">/)
  assert.match(html, /<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">/)
  assert.doesNotMatch(html, /noindex/i)
  assert.equal(JSON.parse(read('package.json')).homepage, 'https://arrowtothebuild.com/')
})

test('robots and sitemap point at the canonical public site', () => {
  const robots = read('docs/robots.txt')
  const sitemap = read('docs/sitemap.xml')
  assert.match(robots, /User-agent:\s*\*/)
  assert.match(robots, /Allow:\s*\//)
  assert.match(robots, /Sitemap:\s*https:\/\/arrowtothebuild\.com\/sitemap\.xml/)
  assert.match(sitemap, /<loc>https:\/\/arrowtothebuild\.com\/<\/loc>/)
})

test('SEO and social assets referenced by the site are packaged', () => {
  for (const relative of [
    'docs/favicon.ico',
    'docs/apple-touch-icon.png',
    'docs/assets/logo/favicon-16x16.png',
    'docs/assets/logo/favicon-32x32.png',
    'docs/assets/logo/icon-192.png',
    'docs/assets/logo/icon-512.png',
    'docs/assets/social/attb-og.jpg',
    'docs/site.webmanifest',
    'docs/404.html',
    'docs/.nojekyll'
  ]) assert.ok(exists(relative), `missing website SEO asset: ${relative}`)

  const html = read('docs/index.html')
  assert.match(html, /og:image" content="https:\/\/arrowtothebuild\.com\/assets\/social\/attb-og\.jpg"/)
  assert.match(html, /og:image:width" content="1200"/)
  assert.match(html, /og:image:height" content="630"/)
})

test('web manifest is valid and every declared icon exists', () => {
  const manifest = JSON.parse(read('docs/site.webmanifest'))
  assert.equal(manifest.start_url, '/')
  assert.equal(manifest.scope, '/')
  for (const icon of manifest.icons || []) {
    const relative = `docs/${icon.src.replace(/^\//, '')}`
    assert.ok(exists(relative), `manifest icon is missing: ${relative}`)
  }
})

test('structured data parses and follows the public release rather than development version', () => {
  const blocks = jsonLdBlocks(read('docs/index.html'))
  assert.ok(blocks.length >= 2, 'expected SoftwareApplication and WebSite JSON-LD blocks')
  const software = blocks.find(block => block['@type'] === 'SoftwareApplication')
  const website = blocks.find(block => block['@type'] === 'WebSite')
  assert.ok(software, 'SoftwareApplication JSON-LD is missing')
  assert.ok(website, 'WebSite JSON-LD is missing')
  assert.equal(software.softwareVersion, publicVersion())
  assert.equal(software.url, 'https://arrowtothebuild.com/')
  assert.equal(website.url, 'https://arrowtothebuild.com/')
  assert.equal(software.offers?.price, '0')
})

test('404 page stays out of the index while linking back home', () => {
  const html = read('docs/404.html')
  assert.match(html, /<meta name="robots" content="noindex, follow">/)
  assert.match(html, /href="\/"/)
})
