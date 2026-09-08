// 当前使用者 store - 无登录模式，仅 localStorage 轻量持久化
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CurrentUser, UserRole } from '@/types'

const KEY = 'anan-current-user'

function load(): CurrentUser {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const u = JSON.parse(raw)
      if (u && typeof u.name === 'string') {
        return { name: u.name, role: u.role || 'custom' }
      }
    }
  } catch {
    /* ignore */
  }
  return { name: '我', role: 'custom' }
}

function save(u: CurrentUser) {
  try {
    localStorage.setItem(KEY, JSON.stringify(u))
  } catch {
    /* ignore */
  }
}

export const useUserStore = defineStore('user', () => {
  const user = ref<CurrentUser>(load())

  function setName(name: string) {
    user.value.name = name.trim() || '我'
    save(user.value)
  }

  function setRole(role: UserRole) {
    user.value.role = role
    save(user.value)
  }

  function apply(patch: Partial<CurrentUser>) {
    user.value = { ...user.value, ...patch }
    save(user.value)
  }

  function reset() {
    user.value = { name: '我', role: 'custom' }
    save(user.value)
  }

  const emoji = computed(() => {
    const map: Record<UserRole, string> = {
      mom: '👩',
      dad: '👨',
      grandma: '👵',
      grandpa: '👴',
      custom: '🙂'
    }
    return map[user.value.role] || '🙂'
  })

  return { user, emoji, setName, setRole, apply, reset }
})
