'use strict'
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const net = require('net')
const dns = require('dns').promises
const { app } = require('electron')
const dbModule = require('../database/db')

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const FETCH_TIMEOUT_MS = 8000
const MAX_REDIRECTS = 4
const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif'])
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
const MIME_BY_EXT = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' }

function mimeFor(file) { return MIME_BY_EXT[path.extname(file).toLowerCase()] || 'application/octet-stream' }
function asDataUrl(file, mime = mimeFor(file)) { return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}` }
function assetRoot() { return path.resolve(__dirname, '../../../resources/builds') }
function cacheDir() { return path.join(app.getPath('userData'), 'ImageCache') }

// A build file is untrusted input, so "assets/foo.webp" must not become "../../../etc".
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

function isPrivateIpv4(host) {
  const parts = host.split('.').map(Number)
  if (parts.length !== 4 || parts.some(value => !Number.isInteger(value) || value < 0 || value > 255)) return false
  const [a, b] = parts
  return a === 0 || a === 10 || a === 127 || a >= 224
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && (b === 0 || b === 168))
    || (a === 198 && (b === 18 || b === 19 || b === 51))
    || (a === 203 && b === 0)
}

function isPrivateIpv6(host) {
  const value = host.toLowerCase().split('%')[0]
  const embeddedIpv4 = value.match(/(?:^|:)(\d{1,3}(?:\.\d{1,3}){3})$/)?.[1]
  if (embeddedIpv4 && isPrivateIpv4(embeddedIpv4)) return true
  return value === '::' || value === '::1'
    || value.startsWith('fc') || value.startsWith('fd')
    || /^fe[89ab]/.test(value)
    || value.startsWith('ff')
    || value.startsWith('2001:db8')
}

function isPrivateHost(hostname) {
  const host = String(hostname || '').replace(/^\[|\]$/g, '').toLowerCase()
  if (!host || /^(localhost|.*\.localhost|.*\.local|.*\.internal)$/.test(host)) return true
  const version = net.isIP(host)
  if (version === 4) return isPrivateIpv4(host)
  if (version === 6) return isPrivateIpv6(host)
  return false
}

async function assertPublicHostname(hostname) {
  if (isPrivateHost(hostname)) throw new Error('Image URLs pointing at local or private addresses are not allowed.')
  if (net.isIP(hostname)) return
  let addresses
  try { addresses = await dns.lookup(hostname, { all: true, verbatim: true }) }
  catch { throw new Error('The image host could not be resolved.') }
  if (!addresses.length || addresses.some(entry => isPrivateHost(entry.address))) {
    throw new Error('Image URLs resolving to local or private addresses are not allowed.')
  }
}

function sniffBuffer(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg'
  if (buffer.length >= 3 && buffer.subarray(0, 3).toString('ascii') === 'GIF') return 'image/gif'
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp'
  return null
}

function sniffMime(file) {
  const fd = fs.openSync(file, 'r')
  try {
    const head = Buffer.alloc(12)
    const bytes = fs.readSync(fd, head, 0, 12, 0)
    return sniffBuffer(head.subarray(0, bytes))
  } finally { fs.closeSync(fd) }
}

function resolveDataImage(ref) {
  const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,([a-z0-9+/=\s]+)$/i.exec(ref)
  if (!match) return null
  let buffer
  try { buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64') } catch { return null }
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) return null
  const declared = match[1].toLowerCase()
  return sniffBuffer(buffer) === declared ? ref : null
}

async function fetchImage(url, signal, redirects = 0) {
  const target = new URL(url)
  if (target.protocol !== 'https:') throw new Error('Only https image URLs are allowed.')
  if (target.username || target.password) throw new Error('Image URLs must not contain credentials.')
  await assertPublicHostname(target.hostname)
  const res = await fetch(target, { headers: { 'User-Agent': 'Arrow-to-the-Build' }, redirect: 'manual', signal })
  if (res.status >= 300 && res.status < 400) {
    if (redirects >= MAX_REDIRECTS) throw new Error('Image download followed too many redirects.')
    const location = res.headers.get('location')
    if (!location) throw new Error('Image download returned a redirect without a destination.')
    return fetchImage(new URL(location, target).toString(), signal, redirects + 1)
  }
  return res
}

async function download(url, file) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetchImage(url, controller.signal)
    if (!res.ok) throw new Error(`Image download failed: ${res.status}`)
    const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
    if (!ALLOWED_MIME.has(type)) throw new Error(`Image download returned ${type || 'an unknown type'}, which is not an allowed image format.`)
    const declared = Number(res.headers.get('content-length'))
    if (Number.isFinite(declared) && declared > MAX_IMAGE_BYTES) throw new Error('Image is larger than 5 MB.')
    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length > MAX_IMAGE_BYTES) throw new Error('Image is larger than 5 MB.')
    const detected = sniffBuffer(buffer)
    if (!detected || detected !== type) throw new Error('Image download contents do not match the declared image format.')
    fs.writeFileSync(file, buffer)
  } finally {
    clearTimeout(timer)
  }
}

async function resolve(ref) {
  if (typeof ref !== 'string' || !ref) return null
  if (ref.startsWith('data:')) return resolveDataImage(ref)
  if (!/^https?:\/\//i.test(ref)) {
    const file = resolveBundled(ref)
    return file ? asDataUrl(file) : null
  }
  if (!remoteImagesEnabled()) return null

  let url
  try { url = new URL(ref) } catch { return null }
  if (url.protocol !== 'https:') throw new Error('Only https image URLs are allowed.')
  const dir = cacheDir()
  fs.mkdirSync(dir, { recursive: true })
  // Always cache as opaque bytes. MIME comes from signature sniffing, never a URL suffix.
  const file = path.join(dir, crypto.createHash('sha256').update(ref).digest('hex') + '.img')
  if (!fs.existsSync(file)) await download(url.toString(), file)
  const mime = sniffMime(file)
  if (!mime) { fs.rmSync(file, { force: true }); return null }
  return asDataUrl(file, mime)
}

function register(ipcMain) {
  ipcMain.handle('images:resolve', (_e, ref) => resolve(ref))
  ipcMain.handle('images:clearCache', () => {
    fs.rmSync(cacheDir(), { recursive: true, force: true })
    return true
  })
}
module.exports = { register, resolve, resolveBundled, resolveDataImage, isPrivateHost, assertPublicHostname, sniffBuffer }
