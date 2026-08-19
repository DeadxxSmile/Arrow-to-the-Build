'use strict'
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const net = require('net')
const dns = require('dns').promises
const { app, dialog, nativeImage } = require('electron')
const dbModule = require('../database/db')

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_CHARACTER_IMAGE_BYTES = 12 * 1024 * 1024
const MAX_CHARACTER_IMAGE_PIXELS = 50 * 1000 * 1000
const MAX_CHARACTER_IMAGE_DIMENSION = 12000
const CHARACTER_IMAGE_OUTPUT_MAX = 1800
const FETCH_TIMEOUT_MS = 8000
const MAX_REDIRECTS = 4
const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif'])
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
const MIME_BY_EXT = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' }

function mimeFor(file) { return MIME_BY_EXT[path.extname(file).toLowerCase()] || 'application/octet-stream' }
function asDataUrl(file, mime = mimeFor(file)) { return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}` }
function assetRoot() { return path.resolve(__dirname, '../../../resources/builds') }
function cacheDir() { return path.join(app.getPath('userData'), 'ImageCache') }
function characterImageDir() { return path.join(app.getPath('userData'), 'CharacterImages') }
function characterImageRef(characterId) { return `character-image:${String(characterId || '')}` }
function characterImageFile(characterId) { return path.join(characterImageDir(), `${crypto.createHash('sha256').update(String(characterId || '')).digest('hex')}.png`) }
function characterIdFromRef(ref) { const match = /^character-image:([a-z0-9-]{8,80})$/i.exec(String(ref || '')); return match ? match[1] : null }

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

function imageDimensionsFromBuffer(buffer, mime = sniffBuffer(buffer)) {
  if (!Buffer.isBuffer(buffer) || !mime) return null
  if (mime === 'image/png') {
    if (buffer.length < 24 || buffer.subarray(12, 16).toString('ascii') !== 'IHDR') return null
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
  }
  if (mime === 'image/jpeg') {
    let offset = 2
    while (offset + 3 < buffer.length) {
      if (buffer[offset] !== 0xff) { offset += 1; continue }
      while (offset < buffer.length && buffer[offset] === 0xff) offset += 1
      const marker = buffer[offset++]
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) continue
      if (offset + 2 > buffer.length) return null
      const length = buffer.readUInt16BE(offset)
      if (length < 2 || offset + length > buffer.length) return null
      if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
        if (length < 7) return null
        return { width: buffer.readUInt16BE(offset + 5), height: buffer.readUInt16BE(offset + 3) }
      }
      offset += length
    }
    return null
  }
  if (mime === 'image/webp') {
    if (buffer.length < 30) return null
    const chunk = buffer.subarray(12, 16).toString('ascii')
    if (chunk === 'VP8X') {
      const width = 1 + buffer.readUIntLE(24, 3)
      const height = 1 + buffer.readUIntLE(27, 3)
      return { width, height }
    }
    if (chunk === 'VP8 ') {
      if (buffer.length < 30 || buffer[23] !== 0x9d || buffer[24] !== 0x01 || buffer[25] !== 0x2a) return null
      return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff }
    }
    if (chunk === 'VP8L') {
      if (buffer.length < 25 || buffer[20] !== 0x2f) return null
      const b1 = buffer[21], b2 = buffer[22], b3 = buffer[23], b4 = buffer[24]
      return { width: 1 + b1 + ((b2 & 0x3f) << 8), height: 1 + (b2 >> 6) + (b3 << 2) + ((b4 & 0x0f) << 10) }
    }
  }
  return null
}

function assertCharacterImageDimensions(size) {
  if (!size?.width || !size?.height || size.width > MAX_CHARACTER_IMAGE_DIMENSION || size.height > MAX_CHARACTER_IMAGE_DIMENSION || size.width * size.height > MAX_CHARACTER_IMAGE_PIXELS) {
    throw new Error('The selected screenshot has unsupported image dimensions.')
  }
  return size
}

function sniffMime(file) {
  const fd = fs.openSync(file, 'r')
  try {
    const head = Buffer.alloc(12)
    const bytes = fs.readSync(fd, head, 0, 12, 0)
    return sniffBuffer(head.subarray(0, bytes))
  } finally { fs.closeSync(fd) }
}

function resolveCharacterImage(ref) {
  const id = characterIdFromRef(ref)
  if (!id) return null
  const file = characterImageFile(id)
  if (!fs.existsSync(file)) return null
  const mime = sniffMime(file)
  return mime === 'image/png' ? asDataUrl(file, mime) : null
}

function deleteCharacterImageFile(characterId) {
  if (!characterId) return false
  fs.rmSync(characterImageFile(characterId), { force: true })
  return true
}

async function chooseCharacterImage(characterId) {
  const id = String(characterId || '')
  if (!id || !dbModule.getDb().prepare('SELECT 1 FROM characters WHERE id=?').get(id)) throw new Error('Character not found.')
  const result = await dialog.showOpenDialog({
    title: 'Choose Character Screenshot',
    properties: ['openFile'],
    filters: [{ name: 'Character Screenshot', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
  })
  if (result.canceled || !result.filePaths[0]) return null
  const source = result.filePaths[0]
  const stat = fs.statSync(source)
  if (!stat.isFile()) throw new Error('The selected screenshot is not a file.')
  if (stat.size > MAX_CHARACTER_IMAGE_BYTES) throw new Error('Character screenshots must be 12 MB or smaller.')
  const sourceBuffer = fs.readFileSync(source)
  const detected = sniffBuffer(sourceBuffer)
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(detected)) throw new Error('Character screenshots must be PNG, JPEG, or WebP images.')
  const declaredSize = imageDimensionsFromBuffer(sourceBuffer, detected)
  if (!declaredSize) throw new Error('The selected screenshot has an unreadable or unsupported image header.')
  assertCharacterImageDimensions(declaredSize)

  const image = nativeImage.createFromPath(source)
  if (image.isEmpty()) throw new Error('The selected screenshot could not be decoded as an image.')
  const size = assertCharacterImageDimensions(image.getSize())
  const scale = Math.min(1, CHARACTER_IMAGE_OUTPUT_MAX / Math.max(size.width, size.height))
  const prepared = scale < 1
    ? image.resize({ width: Math.max(1, Math.round(size.width * scale)), height: Math.max(1, Math.round(size.height * scale)), quality: 'best' })
    : image
  const png = prepared.toPNG()
  if (!png.length || png.length > MAX_CHARACTER_IMAGE_BYTES) throw new Error('The screenshot could not be stored safely within the image-size limit.')

  const dir = characterImageDir()
  fs.mkdirSync(dir, { recursive: true })
  const target = characterImageFile(id)
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`
  fs.writeFileSync(temp, png)
  try {
    fs.rmSync(target, { force: true })
    fs.renameSync(temp, target)
  } finally { fs.rmSync(temp, { force: true }) }
  const ref = characterImageRef(id)
  dbModule.getDb().prepare("UPDATE characters SET portrait_ref=?,updated_at=datetime('now') WHERE id=?").run(ref, id)
  return ref
}

function removeCharacterImage(characterId) {
  const id = String(characterId || '')
  if (!id || !dbModule.getDb().prepare('SELECT 1 FROM characters WHERE id=?').get(id)) throw new Error('Character not found.')
  dbModule.getDb().prepare("UPDATE characters SET portrait_ref='',updated_at=datetime('now') WHERE id=?").run(id)
  deleteCharacterImageFile(id)
  return true
}

function clearCharacterImages() {
  fs.rmSync(characterImageDir(), { recursive: true, force: true })
  return true
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
  if (ref.startsWith('character-image:')) return resolveCharacterImage(ref)
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
  ipcMain.handle('images:chooseCharacterImage', (_e, characterId) => chooseCharacterImage(characterId))
  ipcMain.handle('images:removeCharacterImage', (_e, characterId) => removeCharacterImage(characterId))
}
module.exports = { register, resolve, resolveBundled, resolveDataImage, resolveCharacterImage, chooseCharacterImage, removeCharacterImage, deleteCharacterImageFile, clearCharacterImages, characterImageRef, characterIdFromRef, isPrivateHost, assertPublicHostname, sniffBuffer, imageDimensionsFromBuffer, assertCharacterImageDimensions }
