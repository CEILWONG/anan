// 宝宝档案 store（无登录模式）
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { dbApi } from '@/lib/db'
import { genId } from '@/lib/crypto'
import type { Baby } from '@/types'

const CURRENT_BABY_KEY = 'anan-current-baby'

export const useBabyStore = defineStore('baby', () => {
  const babies = ref<Baby[]>([])
  const currentBabyId = ref<string | null>(
    localStorage.getItem(CURRENT_BABY_KEY)
  )
  const loaded = ref(false)

  const currentBaby = computed<Baby | null>(() => {
    if (!currentBabyId.value) return babies.value[0] || null
    return (
      babies.value.find((b) => b.id === currentBabyId.value) ||
      babies.value[0] ||
      null
    )
  })

  async function loadBabies() {
    babies.value = await dbApi.getAllBabies()
    loaded.value = true

    if (
      currentBabyId.value &&
      !babies.value.find((b) => b.id === currentBabyId.value)
    ) {
      currentBabyId.value = babies.value[0]?.id || null
    } else if (!currentBabyId.value && babies.value.length > 0) {
      currentBabyId.value = babies.value[0].id
    }

    if (currentBabyId.value) {
      localStorage.setItem(CURRENT_BABY_KEY, currentBabyId.value)
    } else {
      localStorage.removeItem(CURRENT_BABY_KEY)
    }
  }

  async function createBaby(opts: {
    name: string
    fullName?: string
    gender: 'boy' | 'girl'
    birthday: string
    avatarColor?: string
    note?: string
  }) {
    const baby: Baby = {
      id: genId('baby'),
      name: opts.name,
      fullName: opts.fullName,
      gender: opts.gender,
      birthday: opts.birthday,
      avatarColor: opts.avatarColor,
      note: opts.note,
      createdAt: new Date().toISOString()
    }
    await dbApi.createBaby(baby)
    babies.value = [...babies.value, baby]
    currentBabyId.value = baby.id
    localStorage.setItem(CURRENT_BABY_KEY, baby.id)
    return baby
  }

  async function updateBaby(id: string, patch: Partial<Baby>) {
    await dbApi.updateBaby(id, patch)
    babies.value = babies.value.map((b) =>
      b.id === id ? { ...b, ...patch } : b
    )
  }

  async function deleteBaby(id: string) {
    await dbApi.deleteBaby(id)
    babies.value = babies.value.filter((b) => b.id !== id)
    if (currentBabyId.value === id) {
      currentBabyId.value = babies.value[0]?.id || null
      if (currentBabyId.value) {
        localStorage.setItem(CURRENT_BABY_KEY, currentBabyId.value)
      } else {
        localStorage.removeItem(CURRENT_BABY_KEY)
      }
    }
  }

  function switchBaby(id: string) {
    currentBabyId.value = id
    localStorage.setItem(CURRENT_BABY_KEY, id)
  }

  return {
    babies,
    currentBaby,
    currentBabyId,
    loaded,
    loadBabies,
    createBaby,
    updateBaby,
    deleteBaby,
    switchBaby
  }
})
