'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('./electron-stub')

const root = path.join(__dirname, '..')
const template = () => JSON.parse(fs.readFileSync(path.join(root, 'docs/reference/BUILD_TEMPLATE.json'), 'utf8'))
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'resources/data/eso-skill-catalog.json'), 'utf8'))

test('Review & Save separates errors, warnings, suggestions, preview, compatibility, and revision comparison', () => {
  const page = fs.readFileSync(path.join(root, 'src/renderer/pages/BuildReviewPage.jsx'), 'utf8')
  const preview = fs.readFileSync(path.join(root, 'src/renderer/components/BuildPreviewModal.jsx'), 'utf8')
  assert.match(page, /Blocking errors/)
  assert.match(page, /Quality suggestions/)
  assert.match(page, /Game-update compatibility/)
  assert.match(page, /Revision comparison/)
  assert.match(page, /Go to section/)
  assert.match(page, /Preview Build/)
  assert.match(preview, /Recovery draft preview/)
  assert.match(preview, /Champion bars/)
})

test('build review logic identifies patch mismatches and maps validation errors to editor sections', async () => {
  const { createBuildReview } = await import('../src/renderer/utils/buildReviewLogic.mjs')
  const build = template()
  build.game_version = 'Update 49'
  const result = createBuildReview(build, catalog, ['cp_plans.warfare.final_slots contains an invalid star id.'])
  assert.equal(result.errors.length, 1)
  assert.equal(result.errors[0].route, '/build-editor/champion-points')
  assert.equal(result.compatibility.status, 'review')
  assert.ok(result.warnings.some(row => /Update 49/.test(row.message)))
})

test('revision comparison reports top-level changes and stable-id array changes', async () => {
  const { compareBuildData } = await import('../src/renderer/utils/buildReviewLogic.mjs')
  const before = template()
  const after = structuredClone(before)
  after.name = 'Changed Name'
  after.tips.push('New tip')
  const result = compareBuildData(before, after)
  assert.ok(result.total >= 2)
  assert.ok(result.groups.name)
  assert.ok(result.groups.tips)
})

test('main process exposes revision payloads for comparison', () => {
  const handlers = fs.readFileSync(path.join(root, 'src/main/ipc/buildHandlers.js'), 'utf8')
  const preload = fs.readFileSync(path.join(root, 'src/main/preload.js'), 'utf8')
  assert.match(handlers, /builds:getRevision/)
  assert.match(preload, /getRevision/)
  assert.doesNotMatch(handlers, /ipcMain\.handle\('builds:import'[\s\S]{0,80}ipcMain\.handle\('builds:import'/)
})
