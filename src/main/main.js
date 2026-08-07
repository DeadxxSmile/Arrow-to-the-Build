'use strict'
const { app, BrowserWindow, ipcMain, Menu, nativeImage, dialog, shell } = require('electron')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { fileURLToPath } = require('url')

const isDev = !app.isPackaged
const devServerUrl = process.env.ELECTRON_RENDERER_URL || 'http://127.0.0.1:5173'
Menu.setApplicationMenu(null)

function configurePaths() {
  const local = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
  const base = path.join(local, 'ArrowToTheBuild')
  for (const p of [base, path.join(base, 'SessionData'), path.join(base, 'Cache')]) fs.mkdirSync(p, { recursive: true })
  app.setPath('userData', base)
  app.setPath('sessionData', path.join(base, 'SessionData'))
  app.setPath('cache', path.join(base, 'Cache'))
}
app.setName('Arrow to the Build')
app.setAppUserModelId('com.deadxxsmile.attb')
configurePaths()

// Two copies of the app on one WAL database ends badly. Focus the first one instead.
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) app.quit()

function icon() {
  const p = path.join(__dirname, '../../resources/art', 'ATTB.ico')
  return fs.existsSync(p) ? nativeImage.createFromPath(p) : undefined
}

function senderWindow(event) { return BrowserWindow.fromWebContents(event.sender) }

function httpsUrl(value) {
  let url
  try { url = new URL(String(value || '')) } catch { throw new Error('Invalid external URL') }
  if (url.protocol !== 'https:') throw new Error('Only HTTPS links can be opened.')
  if (url.username || url.password) throw new Error('External links must not contain credentials.')
  return url
}

function allowedNavigation(value) {
  try {
    const target = new URL(value)
    if (isDev) return target.origin === new URL(devServerUrl).origin
    if (target.protocol !== 'file:') return false
    const indexFile = path.resolve(__dirname, '../../build/index.html')
    return path.resolve(fileURLToPath(target)) === indexFile
  } catch { return false }
}

function registerWindowHandlers() {
  ipcMain.handle('app:getInfo', () => {
    const pkg = require('../../package.json')
    return {
      version: app.getVersion(),
      repository: typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url,
      issues: typeof pkg.bugs === 'string' ? pkg.bugs : pkg.bugs?.url
    }
  })
  ipcMain.handle('window:minimize', e => senderWindow(e)?.minimize())
  ipcMain.handle('window:maximize', e => {
    const win = senderWindow(e)
    if (!win) return
    win.isMaximized() ? win.unmaximize() : win.maximize()
  })
  ipcMain.handle('window:close', e => senderWindow(e)?.close())
  ipcMain.handle('window:isMaximized', e => !!senderWindow(e)?.isMaximized())
  ipcMain.handle('external:open', (_e, value) => shell.openExternal(httpsUrl(value).toString()))
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1500, height: 930, minWidth: 1100, minHeight: 700,
    frame: false, titleBarStyle: 'hidden', backgroundColor: '#081018', show: false, icon: icon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false
    }
  })
  win.on('maximize', () => win.webContents.send('window:maximized', true))
  win.on('unmaximize', () => win.webContents.send('window:maximized', false))
  if (isDev) win.loadURL(devServerUrl); else win.loadFile(path.join(__dirname, '../../build/index.html'))
  win.once('ready-to-show', () => win.show())
  return win
}

// Nothing in ATTB should ever navigate away or spawn a window. Send real links to the OS browser.
app.on('web-contents-created', (_e, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    try { shell.openExternal(httpsUrl(url).toString()) } catch { }
    return { action: 'deny' }
  })
  contents.on('will-navigate', (event, url) => {
    if (!allowedNavigation(url)) event.preventDefault()
  })
  contents.on('will-attach-webview', event => event.preventDefault())
})

if (gotLock) {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.focus()
  })

  app.whenReady().then(() => {
    try {
      require('./database/db').initialize()
      const buildHandlers = require('./ipc/buildHandlers')
      buildHandlers.seedBundled()
      registerWindowHandlers()
      buildHandlers.register(ipcMain)
      require('./ipc/characterHandlers').register(ipcMain)
      require('./ipc/imageHandlers').register(ipcMain)
      require('./ipc/settingsHandlers').register(ipcMain)
      const addonIntegration = require('./addon/integration')
      addonIntegration.register(ipcMain)
      const win = createWindow()
      win.on('focus', () => addonIntegration.syncNow('focus').catch(() => {}))
      addonIntegration.startWatching()
    } catch (err) {
      dialog.showErrorBox('ATTB startup failed', err.stack || err.message)
      app.quit()
    }
  })
}

app.on('window-all-closed', () => app.quit())
app.on('before-quit', () => {
  try { require('./addon/integration').stopWatching() } catch { }
  try { require('./database/db').close() } catch { }
})
