'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const sourceRoot = path.join(root, 'src')
const sourceExtensions = ['.js', '.jsx', '.mjs', '.cjs', '.json']

function walk(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (/\.(?:js|jsx|mjs|cjs)$/.test(entry.name)) out.push(full)
  }
  return out
}

function resolveLocal(fromFile, specifier) {
  const base = path.resolve(path.dirname(fromFile), specifier)
  if (path.extname(base)) return fs.existsSync(base) ? base : null
  for (const extension of sourceExtensions) {
    if (fs.existsSync(`${base}${extension}`)) return `${base}${extension}`
  }
  for (const extension of sourceExtensions) {
    const index = path.join(base, `index${extension}`)
    if (fs.existsSync(index)) return index
  }
  return null
}

test('every relative source import and require resolves to a real file', () => {
  const failures = []
  const patterns = [
    /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\bfrom\s*['"]([^'"]+)['"]/g,
    /\bimport\s*['"]([^'"]+)['"]/g,
    /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g
  ]
  for (const file of walk(sourceRoot)) {
    const text = fs.readFileSync(file, 'utf8')
    for (const pattern of patterns) {
      pattern.lastIndex = 0
      for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
        const specifier = match[1]
        if (!specifier.startsWith('.')) continue
        if (!resolveLocal(file, specifier)) failures.push(`${path.relative(root, file)} -> ${specifier}`)
      }
    }
  }
  assert.deepEqual(failures, [], `unresolved local source references:\n${failures.join('\n')}`)
})
