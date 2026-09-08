// 简单的 PIN 哈希（基于 Web Crypto）
// 用 PBKDF2 派生，盐值随机生成并拼接在结果中
const ITERATIONS = 100_000
const HASH_ALG = 'SHA-256'

export async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: HASH_ALG
    },
    keyMaterial,
    256
  )
  const hashBytes = new Uint8Array(bits)
  // 拼接 salt + hash, base64 编码
  const combined = new Uint8Array(salt.length + hashBytes.length)
  combined.set(salt, 0)
  combined.set(hashBytes, salt.length)
  return base64Encode(combined)
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  try {
    const combined = base64Decode(stored)
    const salt = combined.slice(0, 16)
    const hashBytes = combined.slice(16)
    const enc = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(pin),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    )
    const bits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: ITERATIONS,
        hash: HASH_ALG
      },
      keyMaterial,
      256
    )
    const newHash = new Uint8Array(bits)
    return constantTimeEqual(newHash, hashBytes)
  } catch (e) {
    return false
  }
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

function base64Encode(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

function base64Decode(s: string): Uint8Array {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

// 生成 ID
export function genId(prefix = 'id'): string {
  const t = Date.now().toString(36)
  const r = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${t}${r}`
}