// Markdown 文件序列化/反序列化
// 格式：YAML frontmatter + Markdown 正文
import yaml from 'js-yaml'
import type { AnyRecord } from '@/types'

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

export interface ParsedDoc {
  frontmatter: Record<string, any>
  body: string
}

export function parseMarkdown(content: string): ParsedDoc {
  const match = content.match(FRONTMATTER_REGEX)
  if (!match) {
    return { frontmatter: {}, body: content }
  }
  let frontmatter: Record<string, any> = {}
  try {
    frontmatter = (yaml.load(match[1]) as Record<string, any>) || {}
  } catch (e) {
    console.warn('YAML parse error:', e)
  }
  return { frontmatter, body: match[2].trim() }
}

export function serializeMarkdown(
  frontmatter: Record<string, any>,
  body: string
): string {
  const yamlStr = yaml.dump(frontmatter, {
    lineWidth: -1,
    noRefs: true,
    sortKeys: false
  })
  return `---\n${yamlStr}---\n\n${body.trim()}\n`
}

// 把记录转为 md 文件
export function recordToMarkdown(record: AnyRecord, title?: string): string {
  const { id, createdAt, ...meta } = record as any
  const fm: Record<string, any> = {
    ...meta,
    createdAt: record.createdAt || new Date().toISOString()
  }

  const heading = title || defaultTitle(record)
  const body = [
    `# ${heading}`,
    '',
    record.note ? `> ${record.note}` : '',
    ''
  ]
    .filter(Boolean)
    .join('\n')

  return serializeMarkdown(fm, body)
}

function defaultTitle(record: AnyRecord): string {
  const dt = new Date(record.datetime)
  const ymd = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
  const hm = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`
  switch (record.type) {
    case 'feeding':
      return `喂养 · ${ymd} ${hm}`
    case 'diaper':
      return `换尿布 · ${ymd} ${hm}`
    case 'milestone':
      return `里程碑 · ${record.title || ymd}`
    default:
      return `记录 · ${ymd}`
  }
}

// 生成文件名
export function recordFilename(record: AnyRecord): string {
  const dt = new Date(record.datetime)
  const stamp =
    dt.getFullYear().toString() +
    String(dt.getMonth() + 1).padStart(2, '0') +
    String(dt.getDate()).padStart(2, '0') +
    '-' +
    String(dt.getHours()).padStart(2, '0') +
    String(dt.getMinutes()).padStart(2, '0') +
    String(dt.getSeconds()).padStart(2, '0')
  const safe = record.type
  return `${stamp}_${safe}_${record.id.slice(-6)}.md`
}