'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')

const root = path.resolve(__dirname, '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')

function loadPreloadApi() {
  let exposed = null
  const originalLoad = Module._load
  const preloadPath = path.join(root, 'src/main/preload.js')
  delete require.cache[require.resolve(preloadPath)]

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'electron') {
      return {
        contextBridge: {
          exposeInMainWorld(name, value) {
            if (name === 'api') exposed = value
          }
        },
        ipcRenderer: {
          invoke() { return Promise.resolve(undefined) },
          on() {},
          removeAllListeners() {}
        }
      }
    }
    return originalLoad.call(this, request, parent, isMain)
  }

  try {
    require(preloadPath)
  } finally {
    Module._load = originalLoad
    delete require.cache[require.resolve(preloadPath)]
  }

  assert.ok(exposed, 'preload must expose window.api')
  return exposed
}

function mainProcessSource() {
  const files = []
  const walk = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.isFile() && entry.name.endsWith('.js')) files.push(full)
    }
  }
  walk(path.join(root, 'src/main'))
  return files.map(file => fs.readFileSync(file, 'utf8')).join('\n')
}

test('preload invoke channels and main-process handlers stay in exact sync', () => {
  const preload = read('src/main/preload.js')
  const main = mainProcessSource()
  const invoked = new Set([...preload.matchAll(/ipcRenderer\.invoke\('([^']+)'/g)].map(match => match[1]))
  const handled = new Set([...main.matchAll(/ipcMain\.handle\('([^']+)'/g)].map(match => match[1]))

  assert.ok(invoked.size > 0, 'preload should invoke IPC channels')
  assert.deepEqual([...invoked].sort(), [...handled].sort(), 'every exposed invoke must have one main handler and vice versa')
})

test('main-to-renderer event channels stay paired with preload listeners', () => {
  const preload = read('src/main/preload.js')
  const main = mainProcessSource()
  const listened = new Set([...preload.matchAll(/ipcRenderer\.on\('([^']+)'/g)].map(match => match[1]))
  const sent = new Set([...main.matchAll(/\.send\('([^']+)'/g)].map(match => match[1]))

  assert.deepEqual([...listened].sort(), [...sent].sort(), 'renderer event listeners and main-process sends must stay paired')
})

test('every renderer window.api call is exposed by preload', () => {
  const api = loadPreloadApi()
  const rendererFiles = []
  const rendererRoot = path.join(root, 'src/renderer')
  const walk = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.isFile() && /\.(?:js|jsx|mjs)$/.test(entry.name)) rendererFiles.push(full)
    }
  }
  walk(rendererRoot)

  const used = new Set()
  for (const file of rendererFiles) {
    const source = fs.readFileSync(file, 'utf8')
    for (const match of source.matchAll(/window\.api\.([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)/g)) {
      used.add(`${match[1]}.${match[2]}`)
    }
  }

  assert.ok(used.size > 0, 'renderer should use preload APIs')
  for (const entry of [...used].sort()) {
    const [group, method] = entry.split('.')
    assert.equal(typeof api[group]?.[method], 'function', `${entry} must be exposed by preload`)
  }
})
