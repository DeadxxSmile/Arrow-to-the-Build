export const WORKSPACE_IDS = ['character', 'build-editor', 'help']

export function workspaceForPath(pathname = '') {
  if (pathname.startsWith('/build-editor')) return 'build-editor'
  if (pathname.startsWith('/help')) return 'help'
  return 'character'
}

export function fallbackForWorkspace(workspace) {
  if (workspace === 'build-editor') return '/build-editor/library'
  if (workspace === 'help') return '/help'
  return '/setup'
}

export function isWorkspaceContentPath(pathname = '', workspace) {
  if (!pathname || pathname === '/') return false

  if (workspace === 'build-editor') {
    return pathname.startsWith('/build-editor') && pathname !== '/build-editor/settings'
  }

  if (workspace === 'help') {
    return pathname.startsWith('/help') && !['/help/settings', '/help/import-export'].includes(pathname)
  }

  return [
    '/setup', '/status', '/equipment', '/rotations', '/companions', '/consumables', '/gameplay-tips', '/character-data'
  ].includes(pathname) || pathname.startsWith('/skills') || pathname.startsWith('/champion-points')
}
