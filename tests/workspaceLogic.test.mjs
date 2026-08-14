import test from 'node:test'
import assert from 'node:assert/strict'
import { fallbackForWorkspace, isWorkspaceContentPath, workspaceForPath } from '../src/renderer/utils/workspaceLogic.mjs'

test('workspace routing rejects stale routes from the old Help-inside-Character layout', () => {
  assert.equal(workspaceForPath('/help'), 'help')
  assert.equal(isWorkspaceContentPath('/help', 'character'), false)
  assert.equal(isWorkspaceContentPath('/tips', 'character'), false)
  assert.equal(isWorkspaceContentPath('/setup', 'character'), true)
  assert.equal(isWorkspaceContentPath('/gameplay-tips', 'character'), true)
  assert.equal(isWorkspaceContentPath('/character-data', 'character'), true)
  assert.equal(fallbackForWorkspace('character'), '/setup')
})

test('settings pages do not replace the remembered content page for a workspace', () => {
  assert.equal(isWorkspaceContentPath('/settings', 'character'), false)
  assert.equal(isWorkspaceContentPath('/build-editor/settings', 'build-editor'), false)
  assert.equal(isWorkspaceContentPath('/help/settings', 'help'), false)
  assert.equal(isWorkspaceContentPath('/build-editor/skills', 'build-editor'), true)
  assert.equal(isWorkspaceContentPath('/help/topic/traits', 'help'), true)
})
