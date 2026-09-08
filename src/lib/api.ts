// HTTP 客户端 + 访问口令管理
import type { Baby, AnyRecord } from '@/types'

export const PASSKEY_KEY = 'anan_passkey'

export function getPasskey(): string {
  return localStorage.getItem(PASSKEY_KEY) || ''
}
export function setPasskey(k: string) {
  localStorage.setItem(PASSKEY_KEY, k)
}
export function clearPasskey() {
  localStorage.removeItem(PASSKEY_KEY)
}

export class UnauthorizedError extends Error {
  constructor(msg = '需要访问口令') {
    super(msg)
  }
}
export class ConflictError extends Error {
  constructor() {
    super('数据发生并发修改，已自动重试')
  }
}

export interface ServerData {
  babies: Baby[]
  records: AnyRecord[]
}
export interface GetDataResp {
  data: ServerData
  version: number
}
export interface PutDataResp {
  data: ServerData
  version: number
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const key = getPasskey()
  if (key) headers['x-access-key'] = key

  const res = await fetch(path, { ...init, headers })

  if (res.status === 401) throw new UnauthorizedError()
  if (res.status === 409) throw new ConflictError()
  if (!res.ok) {
    let msg = `请求失败（HTTP ${res.status}）`
    try {
      const j = await res.json()
      if (j && j.error) msg = j.error
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}

export const getData = () => request<GetDataResp>('/api/data', { method: 'GET' })

export const putData = (body: { data: ServerData; version: number }) =>
  request<PutDataResp>('/api/data', { method: 'PUT', body: JSON.stringify(body) })

export const uploadImage = (dataUrl: string) =>
  request<{ url: string }>('/api/upload', {
    method: 'POST',
    body: JSON.stringify({ dataUrl })
  })