'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const appRoot = path.resolve(__dirname, '..')
const testsDir = path.join(appRoot, 'tests')
const electronPath = require('electron')

const testFiles = fs.readdirSync(testsDir, { withFileTypes: true })
  .filter(entry => entry.isFile() && entry.name.endsWith('.test.js'))
  .map(entry => path.join(testsDir, entry.name))
  .sort((a, b) => a.localeCompare(b))

if (testFiles.length === 0) {
  console.error('No test files were found in the tests folder.')
  process.exit(1)
}

// npm's postinstall rebuilds native modules for Electron. Running the suite through
// Electron's embedded Node keeps better-sqlite3 on that same ABI instead of requiring
// a second rebuild for the developer's separately installed Node version.
const result = spawnSync(electronPath, ['--test', ...testFiles], {
  cwd: appRoot,
  env: {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1'
  },
  stdio: 'inherit',
  windowsHide: false
})

if (result.error) {
  console.error(`Unable to start the Electron test runtime: ${result.error.message}`)
  process.exit(1)
}

process.exit(result.status ?? 1)
