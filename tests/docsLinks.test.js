'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')

function markdownFiles() {
  const files = [path.join(root, 'README.md')]
  for (const folder of ['reference', 'maintenance']) {
    const docsRoot = path.join(root, 'docs', folder)
    for (const entry of fs.readdirSync(docsRoot, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.md')) files.push(path.join(docsRoot, entry.name))
    }
  }
  return files
}

function localMarkdownLinks(source) {
  const links = []
  for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const raw = match[1].trim().replace(/^<|>$/g, '')
    if (!raw || raw.startsWith('#') || /^(?:https?:|mailto:)/i.test(raw)) continue
    links.push(raw.split('#')[0].split('?')[0])
  }
  return links.filter(Boolean)
}

test('all local Markdown links point at files that still exist', () => {
  const broken = []
  for (const file of markdownFiles()) {
    const source = fs.readFileSync(file, 'utf8')
    for (const link of localMarkdownLinks(source)) {
      const target = path.resolve(path.dirname(file), decodeURIComponent(link))
      if (!fs.existsSync(target)) broken.push(`${path.relative(root, file)} -> ${link}`)
    }
  }
  assert.deepEqual(broken, [], `broken local documentation links:\n${broken.join('\n')}`)
})
