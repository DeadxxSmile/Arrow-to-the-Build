'use strict'

const MAX_BYTES = 8 * 1024 * 1024
const MAX_DEPTH = 96

class Lexer {
  constructor(input) {
    this.input = String(input || '').replace(/^\uFEFF/, '')
    this.index = 0
    this.current = null
  }

  peek() {
    if (!this.current) this.current = this.readToken()
    return this.current
  }

  next() {
    const token = this.peek()
    this.current = null
    return token
  }

  skipIgnored() {
    const s = this.input
    while (this.index < s.length) {
      const ch = s[this.index]
      if (/\s/.test(ch)) { this.index += 1; continue }
      if (ch === '-' && s[this.index + 1] === '-') {
        if (s[this.index + 2] === '[' && s[this.index + 3] === '[') {
          const end = s.indexOf(']]', this.index + 4)
          this.index = end < 0 ? s.length : end + 2
        } else {
          const end = s.indexOf('\n', this.index + 2)
          this.index = end < 0 ? s.length : end + 1
        }
        continue
      }
      break
    }
  }

  readToken() {
    this.skipIgnored()
    const s = this.input
    const start = this.index
    if (start >= s.length) return { type: 'eof', value: '', start }
    const ch = s[this.index++]

    if ('{}[]=,;'.includes(ch)) return { type: ch, value: ch, start }

    if (ch === '"' || ch === "'") {
      let out = ''
      while (this.index < s.length) {
        const c = s[this.index++]
        if (c === ch) return { type: 'string', value: out, start }
        if (c !== '\\') { out += c; continue }
        if (this.index >= s.length) break
        const esc = s[this.index++]
        const map = { a: '\x07', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v', '\\': '\\', '"': '"', "'": "'" }
        if (map[esc] !== undefined) { out += map[esc]; continue }
        if (esc === 'z') {
          while (this.index < s.length && /\s/.test(s[this.index])) this.index += 1
          continue
        }
        if (esc === 'x') {
          const hex = s.slice(this.index, this.index + 2)
          if (/^[0-9a-f]{2}$/i.test(hex)) { out += String.fromCharCode(parseInt(hex, 16)); this.index += 2; continue }
        }
        if (/\d/.test(esc)) {
          let digits = esc
          while (digits.length < 3 && /\d/.test(s[this.index] || '')) digits += s[this.index++]
          out += String.fromCharCode(Number(digits))
          continue
        }
        out += esc
      }
      throw new Error(`Unterminated Lua string at offset ${start}`)
    }

    if (/[0-9.+-]/.test(ch)) {
      const rest = s.slice(start)
      const match = rest.match(/^[+-]?(?:0[xX][0-9a-fA-F]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/)
      if (match) {
        this.index = start + match[0].length
        const raw = match[0]
        const value = /^[-+]?0x/i.test(raw) ? Number.parseInt(raw, 16) : Number(raw)
        if (!Number.isFinite(value)) throw new Error(`Invalid Lua number at offset ${start}`)
        return { type: 'number', value, start }
      }
    }

    if (/[A-Za-z_]/.test(ch)) {
      while (this.index < s.length && /[A-Za-z0-9_]/.test(s[this.index])) this.index += 1
      return { type: 'identifier', value: s.slice(start, this.index), start }
    }

    throw new Error(`Unsupported Lua token "${ch}" at offset ${start}`)
  }
}

class Parser {
  constructor(input) { this.lexer = new Lexer(input) }

  expect(type) {
    const token = this.lexer.next()
    if (token.type !== type) throw new Error(`Expected ${type} at offset ${token.start}, found ${token.type}`)
    return token
  }

  parseDocument() {
    const name = this.expect('identifier').value
    this.expect('=')
    const value = this.parseValue(0)
    let tail = this.lexer.peek()
    if (tail.type === ';') { this.lexer.next(); tail = this.lexer.peek() }
    if (tail.type !== 'eof') throw new Error(`Unexpected token after SavedVariables table at offset ${tail.start}`)
    return { name, value }
  }

  parseValue(depth) {
    if (depth > MAX_DEPTH) throw new Error('Lua table nesting is too deep')
    const token = this.lexer.peek()
    if (token.type === '{') return this.parseTable(depth + 1)
    if (token.type === 'string' || token.type === 'number') return this.lexer.next().value
    if (token.type === 'identifier') {
      const word = this.lexer.next().value
      if (word === 'true') return true
      if (word === 'false') return false
      if (word === 'nil') return null
      throw new Error(`Unsupported Lua identifier value "${word}" at offset ${token.start}`)
    }
    throw new Error(`Expected Lua value at offset ${token.start}`)
  }

  parseTable(depth) {
    this.expect('{')
    const output = Object.create(null)
    let implicit = 1
    while (this.lexer.peek().type !== '}') {
      const first = this.lexer.peek()
      let key
      let value
      if (first.type === '[') {
        this.lexer.next()
        key = this.parseValue(depth)
        if (key && typeof key === 'object') throw new Error(`Lua table keys must be scalar values at offset ${first.start}`)
        this.expect(']')
        this.expect('=')
        value = this.parseValue(depth)
      } else if (first.type === 'identifier') {
        const ident = this.lexer.next()
        if (this.lexer.peek().type === '=') {
          this.lexer.next()
          key = ident.value
          value = this.parseValue(depth)
        } else {
          if (ident.value === 'true') value = true
          else if (ident.value === 'false') value = false
          else if (ident.value === 'nil') value = null
          else throw new Error(`Unsupported bare Lua identifier "${ident.value}" at offset ${ident.start}`)
          key = implicit++
        }
      } else {
        key = implicit++
        value = this.parseValue(depth)
      }
      if (key !== null && key !== undefined) output[String(key)] = value
      const separator = this.lexer.peek().type
      if (separator === ',' || separator === ';') this.lexer.next()
      else if (separator !== '}') throw new Error(`Expected table separator at offset ${this.lexer.peek().start}`)
    }
    this.expect('}')
    return output
  }
}

function parseSavedVariables(text, expectedName = 'ArrowToTheBuildSavedVariables') {
  const source = String(text || '')
  if (Buffer.byteLength(source, 'utf8') > MAX_BYTES) throw new Error('SavedVariables file is larger than the supported 8 MB safety limit')
  const parsed = new Parser(source).parseDocument()
  if (parsed.name !== expectedName) throw new Error(`Expected ${expectedName}, found ${parsed.name}`)
  return parsed.value
}

function normalizeLuaTables(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  const entries = Object.entries(value)
  const normalized = Object.fromEntries(entries.map(([key, item]) => [key, normalizeLuaTables(item)]))
  if (!entries.length) return normalized
  const numeric = entries.map(([key]) => Number(key))
  if (numeric.every(Number.isInteger) && numeric.every(n => n >= 1)) {
    const sorted = numeric.slice().sort((a, b) => a - b)
    if (sorted.every((n, index) => n === index + 1)) return sorted.map(n => normalized[String(n)])
  }
  return normalized
}

module.exports = { parseSavedVariables, normalizeLuaTables }
