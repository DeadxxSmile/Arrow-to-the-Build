import { useMemo, useState } from 'react'

function inlineParts(text, keyPrefix = 'inline') {
  const source = String(text || '')
  const parts = []
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g
  let cursor = 0
  let match
  while ((match = pattern.exec(source))) {
    if (match.index > cursor) parts.push(source.slice(cursor, match.index))
    const token = match[0]
    if (token.startsWith('`')) parts.push(<code key={`${keyPrefix}-${match.index}`}>{token.slice(1, -1)}</code>)
    else if (token.startsWith('**')) parts.push(<strong key={`${keyPrefix}-${match.index}`}>{token.slice(2, -2)}</strong>)
    else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)
      const label = link?.[1] || token
      const href = link?.[2] || ''
      if (/^https:\/\//i.test(href)) parts.push(<button type="button" className="markdown-link" key={`${keyPrefix}-${match.index}`} onClick={() => window.api.external.open(href)}>{label}</button>)
      else parts.push(<span className="markdown-local-link" key={`${keyPrefix}-${match.index}`} title={href}>{label}</span>)
    }
    cursor = pattern.lastIndex
  }
  if (cursor < source.length) parts.push(source.slice(cursor))
  return parts
}

function parseTable(lines, start) {
  const header = lines[start].split('|').slice(1, -1).map(cell => cell.trim())
  const rows = []
  let index = start + 2
  while (index < lines.length && /^\s*\|.*\|\s*$/.test(lines[index])) {
    rows.push(lines[index].split('|').slice(1, -1).map(cell => cell.trim()))
    index += 1
  }
  return { block: { type: 'table', header, rows }, next: index }
}

function parseMarkdown(markdown) {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n')
  const blocks = []
  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) { index += 1; continue }
    if (line.startsWith('```')) {
      const language = line.slice(3).trim()
      const code = []
      index += 1
      while (index < lines.length && !lines[index].startsWith('```')) code.push(lines[index++])
      if (index < lines.length) index += 1
      blocks.push({ type: 'code', language, text: code.join('\n') })
      continue
    }
    const heading = /^(#{1,4})\s+(.+)$/.exec(line)
    if (heading) { blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] }); index += 1; continue }
    if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|?\s*:?-+/.test(lines[index + 1] || '')) {
      const parsed = parseTable(lines, index); blocks.push(parsed.block); index = parsed.next; continue
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items = []
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) items.push(lines[index++].replace(/^\s*[-*]\s+/, ''))
      blocks.push({ type: 'list', ordered: false, items }); continue
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = []
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) items.push(lines[index++].replace(/^\s*\d+\.\s+/, ''))
      blocks.push({ type: 'list', ordered: true, items }); continue
    }
    if (/^>\s?/.test(line)) {
      const quote = []
      while (index < lines.length && /^>\s?/.test(lines[index])) quote.push(lines[index++].replace(/^>\s?/, ''))
      blocks.push({ type: 'quote', text: quote.join(' ') }); continue
    }
    if (/^---+$/.test(line.trim())) { blocks.push({ type: 'rule' }); index += 1; continue }
    const paragraph = [line.trim()]
    index += 1
    while (index < lines.length && lines[index].trim() && !/^(#{1,4})\s+/.test(lines[index]) && !lines[index].startsWith('```') && !/^\s*[-*]\s+/.test(lines[index]) && !/^\s*\d+\.\s+/.test(lines[index]) && !/^>\s?/.test(lines[index]) && !/^\s*\|.*\|\s*$/.test(lines[index])) paragraph.push(lines[index++].trim())
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') })
  }
  return blocks
}

function CodeBlock({ block }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(block.text)
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    } catch { setCopied(false) }
  }
  return <div className="markdown-code"><div><span>{block.language || 'text'}</span><button type="button" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button></div><pre><code>{block.text}</code></pre></div>
}

export default function MarkdownDocument({ markdown, search = '' }) {
  const blocks = useMemo(() => parseMarkdown(markdown), [markdown])
  const query = search.trim().toLowerCase()
  const visible = query ? blocks.filter(block => JSON.stringify(block).toLowerCase().includes(query) || block.type === 'heading') : blocks
  return <article className="markdown-document">
    {query && !visible.some(block => block.type !== 'heading') && <div className="quiet-box">No guide section contains “{search}”.</div>}
    {visible.map((block, index) => {
      const key = `${block.type}-${index}`
      if (block.type === 'heading') {
        const Tag = `h${Math.min(4, block.level + 1)}`
        return <Tag key={key}>{inlineParts(block.text, key)}</Tag>
      }
      if (block.type === 'paragraph') return <p key={key}>{inlineParts(block.text, key)}</p>
      if (block.type === 'quote') return <blockquote key={key}>{inlineParts(block.text, key)}</blockquote>
      if (block.type === 'rule') return <hr key={key} />
      if (block.type === 'code') return <CodeBlock key={key} block={block} />
      if (block.type === 'list') {
        const Tag = block.ordered ? 'ol' : 'ul'
        return <Tag key={key}>{block.items.map((item, itemIndex) => <li key={`${key}-${itemIndex}`}>{inlineParts(item, `${key}-${itemIndex}`)}</li>)}</Tag>
      }
      if (block.type === 'table') return <div className="markdown-table-wrap" key={key}><table><thead><tr>{block.header.map((cell, cellIndex) => <th key={cellIndex}>{inlineParts(cell, `${key}-h${cellIndex}`)}</th>)}</tr></thead><tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{inlineParts(cell, `${key}-${rowIndex}-${cellIndex}`)}</td>)}</tr>)}</tbody></table></div>
      return null
    })}
  </article>
}
