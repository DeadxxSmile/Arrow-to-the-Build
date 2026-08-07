'use strict'
// Main-process modules require('electron') at load time. The suite runs Electron as a plain Node
// runtime, not as an Electron main process, so cache a minimal stand-in before app modules load.
const Module = require('module')
const path = require('path')

const state = { userDataDir: null, appPath: null, documentsDir: null, homeDir: null, openPaths: [], savePath: null, openedDirectory: null, openedExternal: null }
const stub = {
  app: {
    isPackaged: false,
    getPath: name => {
      if (name === 'userData') return state.userDataDir || '/tmp'
      if (name === 'documents') return state.documentsDir || path.join(state.userDataDir || '/tmp', 'Documents')
      if (name === 'home') return state.homeDir || state.userDataDir || '/tmp'
      return path.join(state.userDataDir || '/tmp', name)
    },
    getAppPath: () => state.appPath || path.resolve(__dirname, '..'),
    setPath: () => { },
    setName: () => { },
    setAppUserModelId: () => { }
  },
  dialog: {
    showOpenDialog: async () => state.openPaths.length ? { canceled: false, filePaths: state.openPaths.splice(0, 1) } : { canceled: true, filePaths: [] },
    showSaveDialog: async () => state.savePath ? { canceled: false, filePath: state.savePath } : { canceled: true },
    showErrorBox: () => { }
  },
  ipcMain: null,
  shell: { openExternal: async value => { state.openedExternal = value; return true }, openPath: async value => { state.openedDirectory = value; return '' } },
  BrowserWindow: class BrowserWindow {
    static getAllWindows() { return [] }
    static fromWebContents() { return null }
  },
  Menu: { setApplicationMenu: () => { } },
  nativeImage: { createFromPath: () => ({}) },
  contextBridge: { exposeInMainWorld: () => { } },
  ipcRenderer: { invoke: async () => { }, on: () => { }, removeAllListeners: () => { } }
}

const realResolve = Module._resolveFilename
Module._resolveFilename = function (request, ...rest) {
  if (request === 'electron') return 'electron'
  return realResolve.call(this, request, ...rest)
}
require.cache.electron = { id: 'electron', filename: 'electron', loaded: true, exports: stub }

// Collects ipcMain.handle registrations so tests can call handlers directly.
function makeIpc() {
  const handlers = new Map()
  return {
    handle: (channel, fn) => handlers.set(channel, fn),
    call: (channel, ...args) => {
      const fn = handlers.get(channel)
      if (!fn) throw new Error(`No handler registered for ${channel}`)
      return fn({ sender: {} }, ...args)
    },
    has: channel => handlers.has(channel),
    channels: () => [...handlers.keys()]
  }
}

module.exports = { stub, state, makeIpc }
