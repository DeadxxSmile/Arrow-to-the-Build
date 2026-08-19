export const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor'])

export const DEFAULT_LIMITS = Object.freeze({
  maxDepth: 48,
  maxNodes: 75000,
  maxProperties: 50000,
  maxArrayLength: 10000
})

export function assertSafeJsonStructure(value, options = {}) {
  const limits = { ...DEFAULT_LIMITS, ...options }
  const label = String(options.label || 'JSON data')
  const stack = [{ value, depth: 0, path: '$' }]
  let nodes = 0
  let properties = 0

  while (stack.length) {
    const current = stack.pop()
    nodes += 1
    if (nodes > limits.maxNodes) throw new Error(`${label} is too complex (more than ${limits.maxNodes.toLocaleString()} values).`)
    if (current.depth > limits.maxDepth) throw new Error(`${label} is nested too deeply (maximum depth ${limits.maxDepth}).`)

    const item = current.value
    if (item === null || typeof item !== 'object') continue

    if (Array.isArray(item)) {
      if (item.length > limits.maxArrayLength) throw new Error(`${label} contains an array longer than ${limits.maxArrayLength.toLocaleString()} items at ${current.path}.`)
      for (let i = item.length - 1; i >= 0; i--) stack.push({ value: item[i], depth: current.depth + 1, path: `${current.path}[${i}]` })
      continue
    }

    const keys = Object.keys(item)
    properties += keys.length
    if (properties > limits.maxProperties) throw new Error(`${label} has too many object properties (more than ${limits.maxProperties.toLocaleString()}).`)
    for (const key of keys) {
      if (FORBIDDEN_KEYS.has(key)) throw new Error(`${label} contains reserved object key "${key}" at ${current.path}.`)
      stack.push({ value: item[key], depth: current.depth + 1, path: `${current.path}.${key}` })
    }
  }
  return value
}
