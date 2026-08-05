import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const catalogPath = path.join(root, 'resources', 'data', 'eso-skill-catalog.json')
const buildsDir = path.join(root, 'resources', 'builds')
const outputDir = path.join(root, 'public', 'skill-icons')
const apiUrl = 'https://en.uesp.net/w/api.php'
const refresh = process.argv.includes('--refresh')
const strict = process.argv.includes('--strict')
const batchSize = 40
const downloadConcurrency = 8

function normalizedTitle(value) {
  return String(value || '').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim()
}

function fileTitle(lineName, skillName) {
  return `ON-icon-skill-${normalizedTitle(lineName)}-${normalizedTitle(skillName)}.png`
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'))
}

function collectCatalogIds(value, ids = new Set()) {
  if (Array.isArray(value)) for (const child of value) collectCatalogIds(child, ids)
  else if (value && typeof value === 'object') {
    if (typeof value.catalog_skill_id === 'string' && value.catalog_skill_id) ids.add(value.catalog_skill_id)
    for (const child of Object.values(value)) collectCatalogIds(child, ids)
  }
  return ids
}

async function collectTargets(catalog) {
  const lineMap = new Map((catalog.lines || []).map(line => [line.id, line]))
  const relevantLineIds = new Set()
  const directlyReferenced = new Set()
  const files = (await fs.readdir(buildsDir)).filter(file => file.endsWith('.json'))
  for (const file of files) {
    const build = await readJson(path.join(buildsDir, file))
    for (const line of build.relevant_lines || []) if (line?.id) relevantLineIds.add(line.id)
    collectCatalogIds(build, directlyReferenced)
  }

  const targets = new Map()
  for (const lineId of relevantLineIds) {
    const line = lineMap.get(lineId)
    if (!line) continue
    for (const skill of line.skills || []) targets.set(skill.id, { id: skill.id, name: skill.name, line: line.name, title: fileTitle(line.name, skill.name), direct: false })
  }
  for (const line of catalog.lines || []) {
    for (const skill of line.skills || []) {
      if (directlyReferenced.has(skill.id)) targets.set(skill.id, { id: skill.id, name: skill.name, line: line.name, title: fileTitle(line.name, skill.name), direct: true })
    }
  }
  return [...targets.values()].sort((a, b) => a.id.localeCompare(b.id))
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal, headers: { 'User-Agent': 'Arrow-to-the-Build/skill-icon-fetcher (non-commercial fan project)', ...(options.headers || {}) } })
  } finally {
    clearTimeout(timer)
  }
}

async function queryImageUrls(targets) {
  const found = new Map()
  for (let start = 0; start < targets.length; start += batchSize) {
    const batch = targets.slice(start, start + batchSize)
    const targetByTitle = new Map(batch.map(target => [`file:${target.title}`.toLowerCase(), target]))
    const body = new URLSearchParams({
      action: 'query', format: 'json', formatversion: '2', prop: 'imageinfo', iiprop: 'url|mime',
      titles: batch.map(target => `File:${target.title}`).join('|')
    })
    const response = await fetchWithTimeout(apiUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body
    })
    if (!response.ok) throw new Error(`UESP icon lookup failed with HTTP ${response.status}`)
    const data = await response.json()
    for (const page of data?.query?.pages || []) {
      const target = targetByTitle.get(String(page.title || '').toLowerCase())
      const info = page.imageinfo?.[0]
      if (target && info?.url && String(info.mime || '').startsWith('image/')) found.set(target.id, info.url)
    }
    process.stdout.write(`\r[icons] Looked up ${Math.min(start + batch.length, targets.length)}/${targets.length} catalog entries`)
  }
  process.stdout.write('\n')
  return found
}

function searchKey(value) {
  return normalizedTitle(value).toLowerCase().replace(/[^a-z0-9]+/g, '')
}

async function searchImageUrl(target) {
  const body = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', generator: 'search',
    gsrsearch: `intitle:ON-icon-skill "${target.name}"`, gsrnamespace: '6', gsrlimit: '10',
    prop: 'imageinfo', iiprop: 'url|mime'
  })
  const response = await fetchWithTimeout(apiUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body
  })
  if (!response.ok) return null
  const pages = (await response.json())?.query?.pages || []
  const skillKey = searchKey(target.name)
  const lineKey = searchKey(target.line)
  const candidates = pages.filter(page => page.imageinfo?.[0]?.url && String(page.imageinfo[0].mime || '').startsWith('image/'))
    .map(page => ({ page, titleKey: searchKey(String(page.title || '').replace(/^File:/i, '')) }))
    .sort((a, b) => {
      const score = item => (item.titleKey.endsWith(`${skillKey}png`) ? 4 : 0) + (item.titleKey.includes(skillKey) ? 2 : 0) + (item.titleKey.includes(lineKey) ? 1 : 0)
      return score(b) - score(a)
    })
  return candidates[0]?.page?.imageinfo?.[0]?.url || null
}

async function isUsablePng(file) {
  try {
    const handle = await fs.open(file, 'r')
    try {
      const header = Buffer.alloc(8)
      const { bytesRead } = await handle.read(header, 0, 8, 0)
      return bytesRead === 8 && header.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    } finally { await handle.close() }
  } catch { return false }
}

async function downloadIcon(target, url) {
  const output = path.join(outputDir, `${target.id}.png`)
  if (!refresh && await isUsablePng(output)) return 'cached'
  const response = await fetchWithTimeout(url, {}, 25000)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const type = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
  if (type !== 'image/png') throw new Error(`expected image/png, received ${type || 'unknown content'}`)
  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.length < 64 || buffer.length > 512 * 1024 || !buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    throw new Error('download was not a valid PNG')
  }
  const temporary = `${output}.tmp`
  await fs.writeFile(temporary, buffer)
  await fs.rm(output, { force: true })
  await fs.rename(temporary, output)
  return 'downloaded'
}

async function runPool(items, worker, concurrency) {
  let cursor = 0
  const results = []
  async function next() {
    while (cursor < items.length) {
      const index = cursor++
      try { results[index] = { ok: true, value: await worker(items[index]) } }
      catch (error) { results[index] = { ok: false, error } }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, next))
  return results
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true })
  const catalog = await readJson(catalogPath)
  const targets = await collectTargets(catalog)
  const missing = []
  for (const target of targets) if (refresh || !(await isUsablePng(path.join(outputDir, `${target.id}.png`)))) missing.push(target)

  console.log(`[icons] ${targets.length} skills are used by the bundled builds and their tracked lines.`)
  if (!missing.length) {
    console.log('[icons] Local skill icon cache is already complete.')
    return
  }

  let urls
  try { urls = await queryImageUrls(missing) }
  catch (error) {
    console.warn(`[icons] Could not reach UESP: ${error.message}`)
    console.warn('[icons] Continuing with ATTB letter fallbacks. Run npm run fetch:icons later when online.')
    if (strict) process.exitCode = 1
    return
  }

  const directMisses = missing.filter(target => target.direct && !urls.has(target.id))
  if (directMisses.length) {
    console.log(`[icons] Searching for ${directMisses.length} renamed or differently filed build skills...`)
    const searched = await runPool(directMisses, searchImageUrl, 4)
    searched.forEach((result, index) => { if (result?.ok && result.value) urls.set(directMisses[index].id, result.value) })
  }

  const downloadable = missing.filter(target => urls.has(target.id))
  const results = await runPool(downloadable, target => downloadIcon(target, urls.get(target.id)), downloadConcurrency)
  let downloaded = 0, cached = 0, failed = 0
  results.forEach((result, index) => {
    if (!result?.ok) {
      failed++
      console.warn(`[icons] ${downloadable[index].name}: ${result?.error?.message || 'download failed'}`)
    } else if (result.value === 'downloaded') downloaded++
    else cached++
  })
  const unresolved = missing.length - downloadable.length
  console.log(`[icons] Downloaded ${downloaded}; cached ${cached}; unavailable on UESP ${unresolved}; failed ${failed}.`)
  console.log('[icons] Missing files automatically use ATTB initials, so the app remains usable offline.')
  if (strict && downloaded + cached === 0) process.exitCode = 1
}

main().catch(error => {
  console.error(`[icons] Fatal error: ${error.stack || error.message}`)
  if (strict) process.exitCode = 1
})
