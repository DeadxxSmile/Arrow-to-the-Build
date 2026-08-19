import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

import { assertSafeJsonStructure as assertSafeEsm } from '../src/shared/jsonSafety.mjs'
import { mergeOverrides as mergeEsm } from '../src/shared/variantLogic.mjs'

const require = createRequire(import.meta.url)
const { assertSafeJsonStructure: assertSafeCjs } = require('../src/shared/jsonSafety.cjs')
const { mergeOverrides: mergeCjs } = require('../src/shared/variantLogic.cjs')
const { normalizeBuild } = require('../src/main/ipc/buildValidation.js')
const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..')

function hostileObject() {
  return JSON.parse('{"safe":1,"__proto__":{"polluted":true}}')
}

for (const [label, assertSafe] of [['CJS', assertSafeCjs], ['ESM', assertSafeEsm]]) {
  test(`${label} JSON safety rejects prototype-manipulation keys`, () => {
    assert.throws(() => assertSafe(hostileObject(), { label: 'Import' }), /reserved object key "__proto__"/)
    assert.throws(() => assertSafe(JSON.parse('{"constructor":{"prototype":{"polluted":true}}}'), { label: 'Import' }), /reserved object key "constructor"/)
  })

  test(`${label} JSON safety rejects pathological nesting and arrays`, () => {
    let nested = {}
    let cursor = nested
    for (let i = 0; i < 10; i++) { cursor.next = {}; cursor = cursor.next }
    assert.throws(() => assertSafe(nested, { label: 'Import', maxDepth: 5 }), /nested too deeply/)
    assert.throws(() => assertSafe({ rows: Array.from({ length: 6 }, () => 1) }, { label: 'Import', maxArrayLength: 5 }), /array longer than 5 items/)
  })
}

for (const [label, merge] of [['CJS', mergeCjs], ['ESM', mergeEsm]]) {
  test(`${label} override merging strips reserved keys without prototype pollution`, () => {
    const override = hostileObject()
    const merged = merge({ safe: 0 }, override)
    assert.equal(merged.safe, 1)
    assert.equal(Object.prototype.hasOwnProperty.call(merged, '__proto__'), false)
    assert.equal(merged.polluted, undefined)
    assert.equal(({}).polluted, undefined)

    const arrayOverride = JSON.parse('[{"id":"new-row","name":"Okay","__proto__":{"polluted":true}}]')
    const arrayMerged = merge([{ id: 'base-row', name: 'Base' }], arrayOverride)
    assert.equal(arrayMerged.length, 2)
    assert.equal(Object.prototype.hasOwnProperty.call(arrayMerged[1], '__proto__'), false)
    assert.equal(({}).polluted, undefined)
  })
}

test('build normalization rejects reserved keys before recursive clone/validation work', () => {
  const result = normalizeBuild(JSON.parse('{"schema_version":4,"id":"safe-build","__proto__":{"polluted":true}}'))
  assert.ok(result.errors.some(error => /reserved object key/.test(error)))
  assert.equal(({}).polluted, undefined)
})

test('current bundled builds and public template remain within the structural safety budget', () => {
  const buildDir = path.join(root, 'resources', 'builds')
  const files = fs.readdirSync(buildDir).filter(name => name.endsWith('.json'))
  files.push(path.join('..', '..', 'docs', 'reference', 'BUILD_TEMPLATE.json'))
  for (const entry of files) {
    const file = entry.endsWith('BUILD_TEMPLATE.json') ? path.join(root, 'docs', 'reference', 'BUILD_TEMPLATE.json') : path.join(buildDir, entry)
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    assert.doesNotThrow(() => assertSafeCjs(data, { label: path.basename(file) }))
  }
})
