// 数据导出/导入（无登录模式）
import JSZip from 'jszip'
import { dbApi } from './db'
import { parseMarkdown, recordToMarkdown, recordFilename } from './markdown'
import type { AnyRecord, Baby } from '@/types'
import { downloadBlob } from './utils'

interface ExportData {
  babies: Baby[]
  records: AnyRecord[]
  exportedAt: string
  version: string
}

// 导出全部数据为 zip
export async function exportAllAsZip(): Promise<Blob> {
  const data = await dbApi.exportAll()
  const exportedAt = new Date().toISOString()

  const zip = new JSZip()
  const root = zip.folder('anan-backup')
  if (!root) throw new Error('Failed to create zip folder')

  // export.json - 机器读取的元数据
  root.file(
    'export.json',
    JSON.stringify(
      {
        babies: data.babies,
        exportedAt,
        version: '0.2.0',
        schema: 'no-auth'
      },
      null,
      2
    )
  )

  // README
  root.file(
    'README.md',
    `# 安安记 数据备份

> 导出时间：${new Date().toLocaleString('zh-CN')}
> 数据版本：0.2.0（无登录模式）
> 宝宝数量：${data.babies.length}　|　记录数量：${data.records.length}

## 目录结构

\`\`\`
.
├── export.json          # 数据索引（程序读取）
├── README.md            # 本文件
├── records/             # 所有记录（按类型分类）
│   ├── feeding/         # 喂养记录
│   ├── diaper/          # 换尿布
│   ├── weight/          # 体重
│   ├── jaundice/        # 黄疸
│   └── milestone/       # 里程碑
└── babies/              # 宝宝档案
\`\`\`

每个记录都是一个 Markdown 文件，可使用任意编辑器打开。
所有结构化数据存储在 YAML frontmatter 中。

---
Made with 安安记 · 记录宝宝成长的每一天
`
  )

  // 宝宝档案
  const babiesFolder = root.folder('babies')
  for (const b of data.babies) {
    babiesFolder?.file(`${b.id}.md`, recordToMarkdown(b as any, b.name))
  }

  // 记录
  const recordsFolder = root.folder('records')
  for (const r of data.records) {
    const sub = recordsFolder?.folder(r.type)
    sub?.file(recordFilename(r), recordToMarkdown(r))
  }

  return zip.generateAsync({ type: 'blob' })
}

// 触发下载
export async function downloadExport() {
  const blob = await exportAllAsZip()
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  downloadBlob(blob, `anan-backup-${ts}.zip`)
}

// 从 zip 导入
export async function importFromZip(file: File): Promise<{
  babies: number
  records: number
}> {
  const zip = await JSZip.loadAsync(file)
  const jsonFile = zip.file('export.json')
  if (!jsonFile) {
    throw new Error('不是有效的安安记备份（缺少 export.json）')
  }
  const text = await jsonFile.async('string')
  let data: any
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('export.json 格式损坏')
  }

  const babies: Baby[] = []
  const records: AnyRecord[] = []

  // 新版导出：从 export.json 直接拿数据
  if (Array.isArray(data.babies)) {
    for (const b of data.babies) {
      if (b.id && b.birthday) babies.push(b)
    }
  }

  // 重建记录（从 md 文件解析，更可靠）
  const recordsFolder = zip.folder('records')
  if (recordsFolder) {
    const allFiles: string[] = []
    recordsFolder.forEach((relativePath, f) => {
      if (!f.dir && relativePath.endsWith('.md')) {
        allFiles.push(relativePath)
      }
    })
    for (const path of allFiles) {
      const f = zip.file(path)
      if (!f) continue
      const md = await f.async('string')
      const { frontmatter } = parseMarkdown(md)
      if (frontmatter && frontmatter.type) {
        records.push(frontmatter as AnyRecord)
      }
    }
  }

  // 宝宝档案：从 md 文件解析（更可靠）
  const babiesFolder = zip.folder('babies')
  if (babiesFolder) {
    const allFiles: string[] = []
    babiesFolder.forEach((relativePath, f) => {
      if (!f.dir && relativePath.endsWith('.md')) {
        allFiles.push(relativePath)
      }
    })
    for (const path of allFiles) {
      const f = zip.file(path)
      if (!f) continue
      const md = await f.async('string')
      const { frontmatter } = parseMarkdown(md)
      if (frontmatter && frontmatter.id && frontmatter.birthday) {
        babies.push(frontmatter as Baby)
      }
    }
  }

  // 去重（避免 export.json 和 md 文件重复）
  const uniqueBabies = Array.from(new Map(babies.map((b) => [b.id, b])).values())
  const uniqueRecords = Array.from(new Map(records.map((r) => [r.id, r])).values())

  await dbApi.importData({ babies: uniqueBabies, records: uniqueRecords })

  return {
    babies: uniqueBabies.length,
    records: uniqueRecords.length
  }
}
