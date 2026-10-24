// 访问口令鉴权 store
import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getPasskey,
  setPasskey,
  clearPasskey,
  getData,
  UnauthorizedError,
  type AccessUser
} from '@/lib/api'
import { useUserStore } from './user'

// 身份由后端根据口令返回，前端不持有口令与身份的对应关系
function applyServerUser(user: AccessUser | null | undefined) {
  if (!user) return
  useUserStore().apply({ name: user.name, role: user.role })
}

export const useAuthStore = defineStore('auth', () => {
  const authed = ref(false)
  const checking = ref(true)
  const error = ref('')

  async function init() {
    checking.value = true
    error.value = ''
    try {
      const resp = await getData() // 已存口令且正确则通过
      authed.value = true
      applyServerUser(resp.user)
    } catch (e) {
      if (e instanceof UnauthorizedError) authed.value = false
      else {
        authed.value = false
        error.value = (e as Error).message
      }
    } finally {
      checking.value = false
    }
  }

  async function login(key: string): Promise<{ ok: boolean; user: AccessUser | null }> {
    error.value = ''
    setPasskey(key.trim())
    try {
      const resp = await getData()
      authed.value = true
      const user = resp.user || null
      applyServerUser(user)
      return { ok: true, user }
    } catch (e) {
      clearPasskey()
      if (e instanceof UnauthorizedError) error.value = '口令不正确，请重试'
      else error.value = (e as Error).message
      return { ok: false, user: null }
    }
  }

  // 退出：清掉本地口令，回到口令页
  function logout() {
    clearPasskey()
    authed.value = false
  }

  const hasStoredKey = () => getPasskey().length > 0

  return { authed, checking, error, init, login, logout, hasStoredKey }
})
