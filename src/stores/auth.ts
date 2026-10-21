// 访问口令鉴权 store
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getPasskey, setPasskey, clearPasskey, getData, UnauthorizedError } from '@/lib/api'
import { ROLE_PASSWORDS } from '@/types'
import { useUserStore } from './user'

// 按登录口令设置身份（820 → 安安妈妈，2026 → 安安爸爸）
function applyRoleFromKey(key: string) {
  const matched = ROLE_PASSWORDS[key]
  if (!matched) return
  useUserStore().apply({ name: matched.name, role: matched.role })
}

export const useAuthStore = defineStore('auth', () => {
  const authed = ref(false)
  const checking = ref(true)
  const error = ref('')

  async function init() {
    checking.value = true
    error.value = ''
    try {
      await getData() // 已存口令且正确则通过
      authed.value = true
      applyRoleFromKey(getPasskey())
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

  async function login(key: string) {
    error.value = ''
    setPasskey(key.trim())
    try {
      await getData()
      authed.value = true
      applyRoleFromKey(key.trim())
      return true
    } catch (e) {
      clearPasskey()
      if (e instanceof UnauthorizedError) error.value = '口令不正确，请重试'
      else error.value = (e as Error).message
      return false
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