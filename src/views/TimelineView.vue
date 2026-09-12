<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRecordsStore } from '@/stores/records'
import { useBabyStore } from '@/stores/baby'
import { fmtTime, dayjs } from '@/lib/utils'
import { Filter, Trash2 } from 'lucide-vue-next'
import type { AnyRecord, RecordType, UserRole } from '@/types'

const recordsStore = useRecordsStore()
const babyStore = useBabyStore()

const filter = ref<'all' | RecordType>('all')

onMounted(async () => {
  await babyStore.loadBabies()
  await recordsStore.loadAll()
})

// ---- 左滑删除 ----
const SWIPE_REVEAL = 80 // 完全展开的偏移量(px)
const SWIPE_TRIGGER = 48 // 超过即触发删除展开
const drag = reactive<Record<string, number>>({}) // 拖动过程中的偏移
const swipeOpen = reactive<Record<string, boolean>>({}) // 是否已展开删除按钮
let touch: { id: string; startX: number; startY: number; base: number; horizontal: boolean } | null = null

function onTouchStart(e: TouchEvent, r: AnyRecord) {
  // 已展开时忽略拖动，点击卡片可收起
  if (swipeOpen[r.id]) return
  touch = {
    id: r.id,
    startX: e.touches[0].clientX,
    startY: e.touches[0].clientY,
    base: drag[r.id] || 0,
    horizontal: false
  }
}
function onTouchMove(e: TouchEvent) {
  if (!touch) return
  const dx = e.touches[0].clientX - touch.startX
  const dy = e.touches[0].clientY - touch.startY
  // 竖向滚动不拦截，确定是横向滑动时才处理
  if (!touch.horizontal) {
    if (Math.abs(dy) > Math.abs(dx)) return
    touch.horizontal = true
  }
  e.preventDefault()
  drag[touch.id] = Math.max(0, Math.min(SWIPE_REVEAL, touch.base - dx))
}
function onTouchEnd(r: AnyRecord) {
  if (!touch || touch.id !== r.id) return
  const opened = (drag[r.id] || 0) >= SWIPE_TRIGGER
  if (opened) {
    drag[r.id] = SWIPE_REVEAL
    swipeOpen[r.id] = true
  } else {
    drag[r.id] = 0
    swipeOpen[r.id] = false
  }
  touch = null
}
function onTap(r: AnyRecord) {
  if (!swipeOpen[r.id]) return
  swipeOpen[r.id] = false
  drag[r.id] = 0
}
async function deleteOne(r: AnyRecord) {
  if (!window.confirm(`确定删除这条记录吗？\n「${describe(r)}」\n删除后无法恢复。`)) return
  await recordsStore.deleteRecord(r.id)
  delete drag[r.id]
  delete swipeOpen[r.id]
}
function offsetOf(id: string) {
  const open = swipeOpen[id] ? SWIPE_REVEAL : 0
  const curr = drag[id] || 0
  return Math.max(open, curr)
}

// ---- 每条记录的图标 + 颜色（区分喂养/尿布子类型）----
function recordVisual(r: AnyRecord) {
  switch (r.type) {
    case 'feeding': {
      const f = r as any
      if (f.method === 'formula') return { emoji: '🍼', bg: 'bg-sky-100' }
      if (f.method === 'pumped_milk') return { emoji: '🥛', bg: 'bg-green-100' }
      return { emoji: '🤱', bg: 'bg-apricot-100' }
    }
    case 'diaper': {
      const t = (r as any).diaperType
      if (t === 'dirty') return { emoji: '💩', bg: 'bg-amber-100' }
      if (t === 'mixed') return { emoji: '🧷', bg: 'bg-purple-100' }
      return { emoji: '💧', bg: 'bg-sky-100' }
    }
    case 'weight': return { emoji: '⚖️', bg: 'bg-dusk-100' }
    case 'jaundice': return { emoji: '🟡', bg: 'bg-yellow-100' }
    case 'milestone': return { emoji: '⭐', bg: 'bg-cream-200' }
    default: return { emoji: '📝', bg: 'bg-cream-200' }
  }
}

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
    .map(([date, items]) => {
      items.sort((a, b) => b.datetime.localeCompare(a.datetime))
      // 一天拆成两列：上午(0-12) / 下午(12-24)
      const am = items.filter((r) => dayjs(r.datetime).hour() < 12)
      const pm = items.filter((r) => dayjs(r.datetime).hour() >= 12)
      return { date, am, pm }
    })
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

        <div class="grid grid-cols-2 gap-3">
          <!-- 上午 0-12 -->
          <div class="space-y-2">
            <p class="text-[10px] text-ink-400 font-medium">☀️ 上午 (0-12)</p>
            <div
              v-for="r in group.am"
              :key="r.id"
              class="relative rounded-xl overflow-hidden"
            >
              <button
                class="absolute inset-y-0 right-0 w-16 bg-rose-400 flex items-center justify-center"
                @click="deleteOne(r)"
                aria-label="删除"
              >
                <Trash2 class="w-4 h-4 text-white" />
              </button>
              <div
                class="rounded-xl shadow-sm flex items-start gap-2 p-3 relative transition-transform duration-200"
                :class="recordVisual(r).bg"
                :style="{ transform: `translateX(-${offsetOf(r.id)}px)` }"
                @touchstart="onTouchStart($event, r)"
                @touchmove="onTouchMove($event)"
                @touchend="onTouchEnd(r)"
                @click="onTap(r)"
              >
                <div class="flex flex-col items-center w-9 flex-shrink-0">
                  <span class="text-lg leading-none">{{ recordVisual(r).emoji }}</span>
                  <span class="text-[9px] text-ink-400 mt-1">{{ fmtTime(r.datetime) }}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-[13px] text-ink-700">{{ describe(r) }}</p>
                  <p v-if="r.note" class="text-[11px] text-ink-400 mt-0.5 truncate">{{ r.note }}</p>
                  <div class="flex items-center gap-1 mt-1 text-[9px] text-ink-300">
                    <span>{{ authorEmoji(r) }}</span>
                    <span>{{ authorName(r) }}</span>
                  </div>
                </div>
              </div>
            </div>
            <p v-if="group.am.length === 0" class="text-xs text-ink-300 text-center py-3">无记录</p>
          </div>

          <!-- 下午 12-24 -->
          <div class="space-y-2">
            <p class="text-[10px] text-ink-400 font-medium">🌙 下午 (12-24)</p>
            <div
              v-for="r in group.pm"
              :key="r.id"
              class="relative rounded-xl overflow-hidden"
            >
              <button
                class="absolute inset-y-0 right-0 w-16 bg-rose-400 flex items-center justify-center"
                @click="deleteOne(r)"
                aria-label="删除"
              >
                <Trash2 class="w-4 h-4 text-white" />
              </button>
              <div
                class="rounded-xl shadow-sm flex items-start gap-2 p-3 relative transition-transform duration-200"
                :class="recordVisual(r).bg"
                :style="{ transform: `translateX(-${offsetOf(r.id)}px)` }"
                @touchstart="onTouchStart($event, r)"
                @touchmove="onTouchMove($event)"
                @touchend="onTouchEnd(r)"
                @click="onTap(r)"
              >
                <div class="flex flex-col items-center w-9 flex-shrink-0">
                  <span class="text-lg leading-none">{{ recordVisual(r).emoji }}</span>
                  <span class="text-[9px] text-ink-400 mt-1">{{ fmtTime(r.datetime) }}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-[13px] text-ink-700">{{ describe(r) }}</p>
                  <p v-if="r.note" class="text-[11px] text-ink-400 mt-0.5 truncate">{{ r.note }}</p>
                  <div class="flex items-center gap-1 mt-1 text-[9px] text-ink-300">
                    <span>{{ authorEmoji(r) }}</span>
                    <span>{{ authorName(r) }}</span>
                  </div>
                </div>
              </div>
            </div>
            <p v-if="group.pm.length === 0" class="text-xs text-ink-300 text-center py-3">无记录</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
</style>