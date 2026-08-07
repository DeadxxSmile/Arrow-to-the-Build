'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const appRoot = path.resolve(__dirname, '..')
const testsDir = path.join(appRoot, 'tests')
let electronPath
try {
  electronPath = require('electron')
} catch (error) {
  console.error('Electron test runtime is not installed. Run npm ci --include=dev first, then retry npm test.')
  process.exit(1)
}

const testFiles = fs.readdirSync(testsDir, { withFileTypes: true })
  .filter(entry => entry.isFile() && /\.test\.(?:js|mjs)$/.test(entry.name))
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
