// 记录 store（无登录模式）
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { dbApi } from '@/lib/db'
import { genId } from '@/lib/crypto'
import { dayjs } from '@/lib/utils'
import type {
  AnyRecord,
  FeedingRecord,
  DiaperRecord,
  WeightRecord,
  JaundiceRecord,
  MilestoneRecord
} from '@/types'
import { useBabyStore } from './baby'
import { useUserStore } from './user'

export const useRecordsStore = defineStore('records', () => {
  const records = ref<AnyRecord[]>([])
  const loading = ref(false)

  async function loadAll() {
    loading.value = true
    try {
      records.value = await dbApi.getAllRecords()
    } finally {
      loading.value = false
    }
  }

  function forCurrentBaby(babyId?: string) {
    const babyStore = useBabyStore()
    const bid = babyId || babyStore.currentBabyId
    if (!bid) return []
    return records.value.filter((r) => r.babyId === bid)
  }

  // 今日统计
  const todaySummary = computed(() => {
    const babyStore = useBabyStore()
    const bid = babyStore.currentBabyId
    if (!bid) return { feeding: 0, diaper: 0, weight: 0, jaundice: 0, feedCount: 0, milkMl: 0 }
    const today = dayjs().startOf('day').toISOString()
    const tomorrow = dayjs().endOf('day').toISOString()
    const todayRecords = records.value.filter(
      (r) => r.babyId === bid && r.datetime >= today && r.datetime <= tomorrow
    )
    const feeding = todayRecords.filter((r) => r.type === 'feeding').length
    const diaper = todayRecords.filter((r) => r.type === 'diaper').length
    const weight = todayRecords.filter((r) => r.type === 'weight').length
    const jaundice = todayRecords.filter((r) => r.type === 'jaundice').length
    const feedCount = feeding
    const milkMl = todayRecords
      .filter((r) => r.type === 'feeding')
      .reduce((acc, r) => acc + ((r as FeedingRecord).amountMl || 0), 0)
    return { feeding, diaper, weight, jaundice, feedCount, milkMl }
  })

  // 最近的喂养
  const lastFeeding = computed(() => {
    const babyStore = useBabyStore()
    const bid = babyStore.currentBabyId
    if (!bid) return null
    return (
      records.value
        .filter((r) => r.babyId === bid && r.type === 'feeding')
        .sort((a, b) => b.datetime.localeCompare(a.datetime))[0] || null
    )
  })

  // 自动填上 author
  async function addRecord<T extends AnyRecord>(
    record: Omit<T, 'id' | 'createdAt' | 'author' | 'authorRole'>
  ) {
    const userStore = useUserStore()
    const r = {
      ...record,
      id: genId('rec'),
      author: userStore.user.name,
      authorRole: userStore.user.role,
      createdAt: new Date().toISOString()
    } as unknown as AnyRecord
    await dbApi.createRecord(r)
    records.value = [r, ...records.value]
    return r
  }

  async function updateRecord(id: string, patch: Partial<AnyRecord>) {
    await dbApi.updateRecord(id, patch)
    records.value = records.value.map((r) =>
      r.id === id ? ({ ...r, ...patch } as AnyRecord) : r
    )
  }

  async function deleteRecord(id: string) {
    await dbApi.deleteRecord(id)
    records.value = records.value.filter((r) => r.id !== id)
  }

  // 便捷封装
  async function addFeeding(
    opts: Omit<FeedingRecord, 'id' | 'createdAt' | 'type' | 'author' | 'authorRole'>
  ) {
    return addRecord<FeedingRecord>({ ...opts, type: 'feeding' })
  }
  async function addDiaper(
    opts: Omit<DiaperRecord, 'id' | 'createdAt' | 'type' | 'author' | 'authorRole'>
  ) {
    return addRecord<DiaperRecord>({ ...opts, type: 'diaper' })
  }
  async function addWeight(
    opts: Omit<WeightRecord, 'id' | 'createdAt' | 'type' | 'author' | 'authorRole'>
  ) {
    return addRecord<WeightRecord>({ ...opts, type: 'weight' })
  }
  async function addJaundice(
    opts: Omit<JaundiceRecord, 'id' | 'createdAt' | 'type' | 'author' | 'authorRole'>
  ) {
    return addRecord<JaundiceRecord>({ ...opts, type: 'jaundice' })
  }
  async function addMilestone(
    opts: Omit<MilestoneRecord, 'id' | 'createdAt' | 'type' | 'author' | 'authorRole'>
  ) {
    return addRecord<MilestoneRecord>({ ...opts, type: 'milestone' })
  }

  return {
    records,
    loading,
    todaySummary,
    lastFeeding,
    loadAll,
    forCurrentBaby,
    addRecord,
    updateRecord,
    deleteRecord,
    addFeeding,
    addDiaper,
    addWeight,
    addJaundice,
    addMilestone
  }
})
