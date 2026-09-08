// 共享后端数据层 - 替代原 IndexedDB
//
// 全部数据存服务器一个 data.md 文件里，多用户共享。
// 这里维护一份内存缓存，增删改通过 HTTP 提交到后端（整份写回 + 版本号防并发覆盖），
// 接口签名与原来 dbApi 完全一致，stores / views 无需改动。
import type { Baby, AnyRecord } from '@/types'
import * as api from './api'
import { UnauthorizedError, ConflictError } from './api'

interface Cache {
  babies: Baby[]
  records: AnyRecord[]
}

let cache: Cache | null = null
let version = 0

function cloneCache(c: Cache): Cache {
  return { babies: [...c.babies], records: [...c.records] }
}

async function ensureLoaded(): Promise<{ data: Cache; version: number }> {
  if (!cache) {
    const res = await api.getData()
    cache = res.data
    version = res.version
  }
  return { data: cache, version }
}

async function loadFresh(): Promise<{ data: Cache; version: number }> {
  const res = await api.getData()
  cache = res.data
  version = res.version
  return { data: cache, version }
}

// 提交一次变更：producer 基于当前快照返回新数据；若后端发现版本冲突则重新拉取后重放重试
async function commit(
  producer: (snapshot: Cache) => Cache
): Promise<void> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const st = await ensureLoaded()
    const next = producer(cloneCache(st.data))
    try {
      const res = await api.putData({ data: next, version: st.version })
      cache = res.data
      version = res.version
      return
    } catch (e) {
      if (e instanceof ConflictError) {
        await loadFresh()
        continue
      }
      throw e
    }
  }
  throw new Error('数据短暂冲突，请稍后重试')
}

export function isUnauthorized(e: unknown): boolean {
  return e instanceof UnauthorizedError
}

export const dbApi = {
  // ---- 宝宝 ----
  async createBaby(baby: Baby) {
    await commit((c) => ({ ...c, babies: [...c.babies, baby] }))
    return baby
  },
  async getBaby(id: string) {
    const { data } = await ensureLoaded()
    return data.babies.find((b) => b.id === id)
  },
  async getAllBabies() {
    const { data } = await ensureLoaded()
    return [...data.babies]
  },
  async updateBaby(id: string, patch: Partial<Baby>) {
    await commit((c) => ({
      ...c,
      babies: c.babies.map((b) => (b.id === id ? { ...b, ...patch } : b))
    }))
  },
  async deleteBaby(id: string) {
    await commit((c) => ({ ...c, babies: c.babies.filter((b) => b.id !== id) }))
  },

  // ---- 记录 ----
  async createRecord(record: AnyRecord) {
    await commit((c) => ({ ...c, records: [...c.records, record] }))
    return record
  },
  async getRecord(id: string) {
    const { data } = await ensureLoaded()
    return data.records.find((r) => r.id === id)
  },
  async updateRecord(id: string, patch: Partial<AnyRecord>) {
    await commit((c) => ({
      ...c,
      records: c.records.map((r) => {
        if (r.id !== id) return r
        return { ...r, ...patch } as AnyRecord
      })
    }))
  },
  async deleteRecord(id: string) {
    await commit((c) => ({
      ...c,
      records: c.records.filter((r) => r.id !== id)
    }))
  },
  async getAllRecords() {
    const { data } = await ensureLoaded()
    return [...data.records].sort((a, b) => b.datetime.localeCompare(a.datetime))
  },
  async getRecordsByBaby(babyId: string) {
    const { data } = await ensureLoaded()
    return data.records
      .filter((r) => r.babyId === babyId)
      .sort((a, b) => b.datetime.localeCompare(a.datetime))
  },
  async getRecordsByDateRange(startISO: string, endISO: string) {
    const { data } = await ensureLoaded()
    return data.records
      .filter((r) => r.datetime >= startISO && r.datetime <= endISO)
      .sort((a, b) => b.datetime.localeCompare(a.datetime))
  },

  // ---- 导出 / 导入 ----
  async exportAll() {
    const { data } = await ensureLoaded()
    return { babies: [...data.babies], records: [...data.records] }
  },
  async importData(data: { babies: Baby[]; records: AnyRecord[] }) {
    await commit(() => ({ babies: [...data.babies], records: [...data.records] }))
  },

  // ---- 清空 ----
  async clearAll() {
    await commit(() => ({ babies: [], records: [] }))
  },

  // ---- 供鉴权/重载使用 ----
  async refresh() {
    await loadFresh()
  }
}