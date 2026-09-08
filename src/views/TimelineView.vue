<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRecordsStore } from '@/stores/records'
import { useBabyStore } from '@/stores/baby'
import { fmtTime, dayjs } from '@/lib/utils'
import { Filter } from 'lucide-vue-next'
import type { AnyRecord, RecordType, UserRole } from '@/types'

const recordsStore = useRecordsStore()
const babyStore = useBabyStore()

const filter = ref<'all' | RecordType>('all')

onMounted(async () => {
  await babyStore.loadBabies()
  await recordsStore.loadAll()
})

const groupedRecords = computed(() => {
  const babyId = babyStore.currentBabyId
  if (!babyId) return []

  let list = recordsStore.records.filter((r) => r.babyId === babyId)
  if (filter.value !== 'all') {
    list = list.filter((r) => r.type === filter.value)
  }

  // 按日期分组
  const groups: Record<string, AnyRecord[]> = {}
  for (const r of list) {
    const date = dayjs(r.datetime).format('YYYY-MM-DD')
    if (!groups[date]) groups[date] = []
    groups[date].push(r)
  }

  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({
      date,
      items: items.sort((a, b) => b.datetime.localeCompare(a.datetime))
    }))
})

function dateLabel(date: string) {
  const d = dayjs(date)
  const today = dayjs().startOf('day')
  const diff = today.diff(d.startOf('day'), 'day')
  if (diff === 0) return '今天'
  if (diff === 1) return '昨天'
  if (diff === 2) return '前天'
  if (diff < 7) return `${diff} 天前`
  return d.format('MM月DD日')
}

function authorName(r: AnyRecord) {
  return r.author || '家人'
}

const ROLE_EMOJI_MAP: Record<UserRole, string> = {
  mom: '👩',
  dad: '👨',
  grandma: '👵',
  grandpa: '👴',
  custom: '🙂'
}

function authorEmoji(r: AnyRecord) {
  return ROLE_EMOJI_MAP[(r.authorRole || 'custom') as UserRole] || '🙂'
}

function describe(r: AnyRecord): string {
  switch (r.type) {
    case 'feeding': {
      const f = r as any
      if (f.method === 'breast') return `亲喂${f.durationMin ? ` · ${f.durationMin}分钟` : ''}${f.side ? ` · ${f.side === 'left' ? '左' : f.side === 'right' ? '右' : '两侧'}` : ''}`
      if (f.method === 'formula') return `瓶喂奶粉 · ${f.amountMl}ml`
      if (f.method === 'pumped_milk') return `瓶喂母乳 · ${f.amountMl}ml`
      return '喂养'
    }
    case 'diaper': {
      const d = r as any
      const t = d.diaperType
      return t === 'wet' ? '小便' : t === 'dirty' ? '大便' : '大小便'
    }
    case 'weight': {
      return `体重 · ${(r as any).weightKg} kg`
    }
    case 'jaundice': {
      const j = r as any
      const parts = []
      if (j.faceValue !== undefined) parts.push(`头${j.faceValue}`)
      if (j.chestValue !== undefined) parts.push(`胸${j.chestValue}`)
      if (j.abdomenValue !== undefined) parts.push(`腹${j.abdomenValue}`)
      return `黄疸${parts.length ? ' · ' + parts.join(' ') : ''}`
    }
    case 'milestone':
      return (r as any).title || '里程碑'
    default:
      return '记录'
  }
}
</script>

<template>
  <div class="px-5 pt-8 pb-4">
    <h1 class="heading-1 mb-1">时间线</h1>
    <p class="text-sm text-ink-400 mb-5">
      {{ babyStore.currentBaby?.name }} 的成长记录
    </p>

    <!-- 筛选 -->
    <div class="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-5 px-5 scrollbar-hide">
      <button
        v-for="f in [
          { v: 'all', l: '全部' },
          { v: 'feeding', l: '🍼 喂养' },
          { v: 'diaper', l: '🧷 尿布' },
          { v: 'weight', l: '⚖️ 体重' },
          { v: 'jaundice', l: '🟡 黄疸' },
          { v: 'milestone', l: '⭐ 里程碑' }
        ]"
        :key="f.v"
        @click="filter = f.v as any"
        :class="[
          'px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition',
          filter === f.v
            ? 'bg-ink-600 text-white'
            : 'bg-white text-ink-500 border border-cream-200'
        ]"
      >
        {{ f.l }}
      </button>
    </div>

    <!-- 时间线列表 -->
    <div v-if="groupedRecords.length === 0" class="card text-center py-16">
      <Filter class="w-12 h-12 text-ink-200 mx-auto mb-3" />
      <p class="text-ink-500">还没有记录</p>
    </div>

    <div v-else class="space-y-6">
      <div v-for="group in groupedRecords" :key="group.date">
        <div class="sticky top-0 z-10 bg-cream-100/85 backdrop-blur-sm py-2 mb-2">
          <h3 class="text-sm font-medium text-ink-600">
            {{ dateLabel(group.date) }} · {{ dayjs(group.date).format('M月D日 dddd') }}
          </h3>
        </div>
        <div class="space-y-2">
          <div
            v-for="r in group.items"
            :key="r.id"
            class="card flex items-start gap-3"
          >
            <div class="flex flex-col items-center w-12 flex-shrink-0">
              <span class="text-lg">
                <span v-if="r.type === 'feeding'">🍼</span>
                <span v-else-if="r.type === 'diaper'">🧷</span>
                <span v-else-if="r.type === 'weight'">⚖️</span>
                <span v-else-if="r.type === 'jaundice'">🟡</span>
                <span v-else-if="r.type === 'milestone'">⭐</span>
                <span v-else>📝</span>
              </span>
              <span class="text-[10px] text-ink-400 mt-1">{{ fmtTime(r.datetime) }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-ink-700">{{ describe(r) }}</p>
              <p v-if="r.note" class="text-xs text-ink-400 mt-1">{{ r.note }}</p>
              <div class="flex items-center gap-1.5 mt-2 text-[10px] text-ink-300">
                <span>{{ authorEmoji(r) }}</span>
                <span>{{ authorName(r) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
</style>