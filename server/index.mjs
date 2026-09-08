// 安安记 · 共享后端
// 职责：
//  - 把全部数据存在 server/data.md 这一个 Markdown 文件里（YAML frontmatter）
//  - 提供 GET/PUT /api/data，多用户读写同一份数据，带版本号防并发覆盖
//  - 简单口令鉴权（PASSKEY），未配置则放行
//  - 生产环境顺带托管 ../dist 静态前端
import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DIST_DIR = path.join(ROOT, 'dist')
const DATA_FILE = path.join(__dirname, 'data.md')

// ---- 简易 .env 加载（仅 server/.env，已被进程环境变量覆盖） ----
function loadDotEnv() {
  const envFile = path.join(__dirname, '.env')
  const out = {}
  if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
      if (m) out[m[1]] = m[2]
    }
  }
  return out
}
const fileEnv = loadDotEnv()
const PASSKEY = process.env.PASSKEY ?? fileEnv.PASSKEY ?? ''
const PORT = Number(process.env.PORT ?? fileEnv.PORT ?? 3001)

// ---- data.md 读写 ----
const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

function ensureFile() {
  if (fs.existsSync(DATA_FILE)) return
  const initial = `---
version: 0
babies: []
records: []
---

# 安安记 · 共享数据

这里存放所有宝宝档案与记录，由后端读写，供所有使用者共享。
`
  fs.writeFileSync(DATA_FILE, initial, 'utf8')
}

function readState() {
  ensureFile()
  const md = fs.readFileSync(DATA_FILE, 'utf8')
  const match = md.match(FRONTMATTER_REGEX)
  let fm = { version: 0, babies: [], records: [] }
  try {
    fm = (match && yaml.load(match[1])) || fm
  } catch (e) {
    console.warn('data.md YAML 解析失败，使用空数据：', e)
  }
  return {
    version: fm.version ?? 0,
    babies: Array.isArray(fm.babies) ? fm.babies : [],
    records: Array.isArray(fm.records) ? fm.records : []
  }
}

function writeState(version, babies, records) {
  const md = `---\n${yaml
    .dump({ version, babies, records }, { lineWidth: -1, noRefs: true, sortKeys: false })
    .trimEnd()}\n---\n\n# 安安记 · 共享数据\n\n这里存放所有宝宝档案与记录，由后端读写，供所有使用者共享。\n`
  // 原子写入：先写临时文件再替换，避免写一半被读取
  const tmp = `${DATA_FILE}.tmp`
  fs.writeFileSync(tmp, md, 'utf8')
  fs.renameSync(tmp, DATA_FILE)
}

const app = express()
app.use(express.json({ limit: '5mb' }))

// ---- 口令鉴权 ----
app.use('/api', (req, res, next) => {
  if (!PASSKEY) return next() // 未配置口令 → 放行
  const key = req.get('x-access-key')
  if (key === PASSKEY) return next()
  res.status(401).json({ error: 'unauthorized' })
})

// ---- 数据接口 ----
app.get('/api/data', (req, res) => {
  const s = readState()
  res.json({ data: { babies: s.babies, records: s.records }, version: s.version })
})

app.put('/api/data', (req, res) => {
  const body = req.body || {}
  const nextData = body.data
  const bodyVersion = Number(body.version)
  if (!nextData || !Array.isArray(nextData.babies) || !Array.isArray(nextData.records)) {
    return res.status(400).json({ error: 'bad request' })
  }
  const cur = readState()
  // 版本不匹配 → 有并发写入，返回冲突与最新数据，由前端重放后重试
  if (bodyVersion !== cur.version) {
    return res.status(409).json({
      error: 'conflict',
      data: { babies: cur.babies, records: cur.records },
      version: cur.version
    })
  }
  const newVersion = cur.version + 1
  writeState(newVersion, nextData.babies, nextData.records)
  res.json({ data: { babies: nextData.babies, records: nextData.records }, version: newVersion })
})

app.get('/api/health', (req, res) => res.json({ ok: true }))

// ---- 生产：托管前端静态文件 ----
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR))
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`安安记后端已启动: http://localhost:${PORT}`)
  console.log(`数据文件: ${DATA_FILE}${PASSKEY ? '（已启用口令）' : '（未启用口令）'}`)
})