'use strict'
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const net = require('net')
const { app } = require('electron')
const dbModule = require('../database/db')

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const FETCH_TIMEOUT_MS = 8000
const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif'])
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

const MIME_BY_EXT = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' }
function mimeFor(file) { return MIME_BY_EXT[path.extname(file).toLowerCase()] || 'application/octet-stream' }
function asDataUrl(file) { return `data:${mimeFor(file)};base64,${fs.readFileSync(file).toString('base64')}` }

function assetRoot() { return path.resolve(__dirname, '../../../resources/builds') }
function cacheDir() { return path.join(app.getPath('userData'), 'ImageCache') }

// A build file is untrusted input, so "assets/foo.webp" must not be allowed to become "../../../etc".
function resolveBundled(ref) {
  const root = assetRoot()
  const full = path.resolve(root, ref)
  if (full !== root && !full.startsWith(root + path.sep)) return null
  if (!ALLOWED_EXT.has(path.extname(full).toLowerCase())) return null
  return fs.existsSync(full) ? full : null
}

function remoteImagesEnabled() {
  try {
    const row = dbModule.getDb().prepare('SELECT value FROM settings WHERE key=?').get('remote_images')
    return row?.value === 'true'
  } catch { return false }
}

function isPrivateHost(hostname) {
  const host = hostname.replace(/^\[|\]$/g, '')
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(host)) return true
  const version = net.isIP(host)
  if (version === 4) {
    const [a, b] = host.split('.').map(Number)
    return a === 127 || a === 10 || a === 0 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168
  }
  if (version === 6) return /^(::1?$|fc|fd|fe80)/i.test(host)
  return false
}

async function download(url, file) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Arrow-to-the-Build' }, redirect: 'follow', signal: controller.signal })
    if (!res.ok) throw new Error(`Image download failed: ${res.status}`)
    const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
    if (!ALLOWED_MIME.has(type)) throw new Error(`Image download returned ${type || 'an unknown type'}, which is not an allowed image format.`)
    const declared = Number(res.headers.get('content-length'))
    if (Number.isFinite(declared) && declared > MAX_IMAGE_BYTES) throw new Error('Image is larger than 5 MB.')
    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length > MAX_IMAGE_BYTES) throw new Error('Image is larger than 5 MB.')
    fs.writeFileSync(file, buffer)
  } finally {
    clearTimeout(timer)
  }
}

async function resolve(ref) {
  if (typeof ref !== 'string' || !ref) return null
  if (ref.startsWith('data:image/')) return ref
  if (!/^https?:\/\//i.test(ref)) {
    const file = resolveBundled(ref)
    return file ? asDataUrl(file) : null
  }
  if (!remoteImagesEnabled()) return null

  let url
  try { url = new URL(ref) } catch { return null }
  if (url.protocol !== 'https:') throw new Error('Only https image URLs are allowed.')
  if (isPrivateHost(url.hostname)) throw new Error('Image URLs pointing at local or private addresses are not allowed.')

  let ext = path.extname(url.pathname).toLowerCase()
  if (!ALLOWED_EXT.has(ext)) ext = '.img'
  const dir = cacheDir()
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, crypto.createHash('sha256').update(ref).digest('hex') + ext)
  if (!fs.existsSync(file)) await download(url.toString(), file)
  // Cached files can land as .img when the URL had no useful extension; trust the sniffed header instead.
  return ext === '.img'
    ? `data:${sniffMime(file) || 'image/png'};base64,${fs.readFileSync(file).toString('base64')}`
    : asDataUrl(file)
}

function sniffMime(file) {
  const head = Buffer.alloc(12)
  const fd = fs.openSync(file, 'r')
  try { fs.readSync(fd, head, 0, 12, 0) } finally { fs.closeSync(fd) }
  if (head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (head[0] === 0xff && head[1] === 0xd8) return 'image/jpeg'
  if (head.subarray(0, 3).toString('ascii') === 'GIF') return 'image/gif'
  if (head.subarray(0, 4).toString('ascii') === 'RIFF' && head.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp'
  return null
}

function register(ipcMain) {
  ipcMain.handle('images:resolve', (_e, ref) => resolve(ref))
  ipcMain.handle('images:clearCache', () => {
    fs.rmSync(cacheDir(), { recursive: true, force: true })
    return true
  })
}
module.exports = { register, resolve, resolveBundled, isPrivateHost }
