<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useBabyStore } from '@/stores/baby'
import { useRecordsStore } from '@/stores/records'
import { ageOf, fmtTime, dayjs } from '@/lib/utils'
import { Milk, Scale, Sun, Star, Plus, ChevronDown, Cake, Baby as BabyIcon } from 'lucide-vue-next'

const router = useRouter()
const userStore = useUserStore()
const babyStore = useBabyStore()
const recordsStore = useRecordsStore()

onMounted(async () => {
  await babyStore.loadBabies()
  await recordsStore.loadAll()
})

const currentBaby = computed(() => babyStore.currentBaby)
const summary = computed(() => recordsStore.todaySummary)
const lastFeeding = computed(() => recordsStore.lastFeeding)

const ageText = computed(() => {
  if (!currentBaby.value) return ''
  const days = daysAlive.value
  if (days === 0) return '今天刚出生'
  if (days === 1) return '出生 1 天'
  return ageOf(currentBaby.value.birthday)
})

const daysAlive = computed(() => {
  if (!currentBaby.value) return 0
  return dayjs().diff(dayjs(currentBaby.value.birthday), 'day')
})

const daysAliveLabel = computed(() => {
  const days = daysAlive.value
  if (days === 0) return '第 0 天'
  return `第 ${days} 天`
})

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 11) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  if (h < 22) return '晚上好'
  return '夜深了'
})

const showBabyPicker = computed(() => babyStore.babies.length > 1)

function changeBaby() {
  const list = babyStore.babies
  if (list.length < 2) return
  const idx = list.findIndex((b) => b.id === babyStore.currentBabyId)
  const next = list[(idx + 1) % list.length]
  babyStore.switchBaby(next.id)
}

function recordNow(type: string) {
  router.push(`/record/${type}`)
}
</script>

<template>
  <div class="px-5 pt-8 pb-4 flex flex-col min-h-full">
    <!-- 顶部问候 -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <p class="text-sm text-ink-400">{{ greeting }}，{{ userStore.user.name }}</p>
        <p class="text-xs text-ink-300 mt-0.5">记录者</p>
      </div>
      <button
        @click="router.push('/settings')"
        class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-xl"
        aria-label="设置"
      >
        {{ userStore.emoji }}
      </button>
    </div>

    <!-- 宝宝信息卡 -->
    <div v-if="currentBaby" class="bg-gradient-to-br from-apricot-200 via-cream-100 to-sage-100 rounded-3xl p-6 mb-5 relative overflow-hidden">
      <div class="absolute -right-8 -top-8 w-32 h-32 bg-white/30 rounded-full blur-2xl"></div>
      <div class="absolute -right-4 -bottom-4 w-24 h-24 bg-dusk-100/40 rounded-full blur-2xl"></div>

      <div class="relative flex items-start justify-between">
        <div class="flex items-center gap-3">
          <div
            class="w-16 h-16 rounded-2xl bg-white/70 flex items-center justify-center text-4xl overflow-hidden"
          >
            <img v-if="currentBaby.avatar" :src="currentBaby.avatar" class="w-full h-full object-cover" alt="头像" />
            <span v-else>{{ currentBaby.gender === 'girl' ? '👧' : '👦' }}</span>
          </div>
          <div>
            <p class="text-xs text-ink-400 mb-0.5">Hi，{{ currentBaby.name }}</p>
            <h1 class="text-2xl font-serif text-ink-700 mb-1">{{ currentBaby.name }}</h1>
            <div class="flex items-center gap-2 text-xs text-ink-500">
              <Cake class="w-3.5 h-3.5" />
              <span>{{ ageText }}{{ daysAliveLabel ? ` · ${daysAliveLabel}` : '' }}</span>
            </div>
          </div>
        </div>
      </div>

      <button
        v-if="showBabyPicker"
        @click="changeBaby"
        class="relative mt-4 inline-flex items-center gap-1.5 text-xs text-ink-500 bg-white/60 hover:bg-white/80 px-3 py-1.5 rounded-full transition"
      >
        <span>切换宝宝</span>
        <ChevronDown class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- 未添加宝宝提示 -->
    <div v-else class="card text-center py-12 mb-5">
      <div class="text-5xl mb-3">🌱</div>
      <p class="text-ink-500 mb-1">还没有添加宝宝档案</p>
      <p class="text-xs text-ink-400 mb-4">先添加一个，就可以开始记录啦</p>
      <button @click="router.push('/baby/new')" class="btn-primary inline-flex items-center gap-2">
        <Plus class="w-4 h-4" /> 添加宝宝
      </button>
    </div>

    <!-- 快速记录 -->
    <div v-if="currentBaby" class="grid grid-cols-5 gap-2 mb-6">
      <button
        v-for="item in [
          { type: 'feeding', label: '喂养', icon: Milk, color: 'bg-apricot-100', text: 'text-apricot-500' },
          { type: 'diaper', label: '尿布', icon: BabyIcon, color: 'bg-sage-100', text: 'text-sage-500' },
          { type: 'weight', label: '体重', icon: Scale, color: 'bg-dusk-100', text: 'text-dusk-400' },
          { type: 'jaundice', label: '黄疸', icon: Sun, color: 'bg-amber-100', text: 'text-amber-500' },
          { type: 'milestone', label: '里程碑', icon: Star, color: 'bg-cream-300', text: 'text-ink-500' }
        ]"
        :key="item.type"
        @click="recordNow(item.type)"
        class="card hover:shadow-md transition flex flex-col items-center gap-1.5 py-3"
      >
        <div :class="[item.color, 'w-9 h-9 rounded-xl flex items-center justify-center']">
          <component :is="item.icon" :class="['w-4 h-4', item.text]" />
        </div>
        <span class="text-[11px] text-ink-500">{{ item.label }}</span>
      </button>
    </div>

    <!-- 今日统计 -->
    <div v-if="currentBaby" class="grid grid-cols-4 gap-3 mb-6">
      <div class="card text-center py-4">
        <div class="text-2xl mb-1">🍼</div>
        <div class="text-xl font-serif text-ink-700">{{ summary.feeding }}</div>
        <div class="text-xs text-ink-400">次喂养</div>
      </div>
      <div v-if="summary.milkMl > 0" class="card text-center py-4">
        <div class="text-2xl mb-1">🥛</div>
        <div class="text-sm font-serif text-ink-700 leading-tight">{{ summary.milkMl }}ml</div>
        <div class="text-xs text-ink-400">瓶喂奶量</div>
      </div>
      <div v-else class="card text-center py-4">
        <div class="text-2xl mb-1">🧷</div>
        <div class="text-xl font-serif text-ink-700">{{ summary.diaper }}</div>
        <div class="text-xs text-ink-400">换尿布</div>
      </div>
      <div class="card text-center py-4">
        <div class="text-2xl mb-1">⚖️</div>
        <div class="text-xl font-serif text-ink-700">{{ summary.weight }}</div>
        <div class="text-xs text-ink-400">体重</div>
      </div>
      <div class="card text-center py-4">
        <div class="text-2xl mb-1">⏱️</div>
        <div class="text-xl font-serif text-ink-700">
          {{ lastFeeding ? fmtTime(lastFeeding.datetime) : '—' }}
        </div>
        <div class="text-xs text-ink-400">上次喂</div>
      </div>
    </div>

    <!-- 最近记录 -->
    <div v-if="currentBaby && recordsStore.records.length > 0" class="card">
      <div class="flex items-center justify-between mb-3">
        <h3 class="heading-2">最近记录</h3>
        <button @click="router.push('/timeline')" class="text-xs text-apricot-500">
          查看全部 →
        </button>
      </div>
      <div class="space-y-2">
        <div
          v-for="r in recordsStore.forCurrentBaby().slice(0, 5)"
          :key="r.id"
          class="flex items-center gap-3 py-2 border-b border-cream-200/60 last:border-0"
        >
          <div class="text-xl">
            <span v-if="r.type === 'feeding'">🍼</span>
            <span v-else-if="r.type === 'diaper'">🧷</span>
            <span v-else-if="r.type === 'weight'">⚖️</span>
            <span v-else-if="r.type === 'jaundice'">🟡</span>
            <span v-else-if="r.type === 'milestone'">⭐</span>
            <span v-else>📝</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-ink-700 truncate">
              <template v-if="r.type === 'feeding'">
                <template v-if="(r as any).method === 'breast'">
                  亲喂{{ (r as any).durationMin ? ` · ${(r as any).durationMin}分钟` : '' }}
                </template>
                <template v-else>
                  {{ (r as any).method === 'formula' ? '瓶喂奶粉' : '瓶喂母乳' }} · {{ (r as any).amountMl }}ml
                </template>
              </template>
              <template v-else-if="r.type === 'diaper'">
                <template v-if="(r as any).diaperType === 'wet'">小便</template>
                <template v-else-if="(r as any).diaperType === 'dirty'">大便</template>
                <template v-else>大小便</template>
              </template>
              <template v-else-if="r.type === 'weight'">
                体重 · {{ (r as any).weightKg }} kg
              </template>
              <template v-else-if="r.type === 'jaundice'">
                黄疸
                <template v-if="(r as any).faceValue !== undefined"> 头{{ (r as any).faceValue }}</template>
                <template v-if="(r as any).chestValue !== undefined"> 胸{{ (r as any).chestValue }}</template>
                <template v-if="(r as any).abdomenValue !== undefined"> 腹{{ (r as any).abdomenValue }}</template>
              </template>
              <template v-else-if="r.type === 'milestone'">
                {{ (r as any).title }}
              </template>
            </p>
            <p v-if="r.note" class="text-xs text-ink-400 truncate mt-0.5">{{ r.note }}</p>
            <p v-if="r.author" class="text-[10px] text-ink-300 mt-0.5">{{ r.author }} 记</p>
          </div>
          <div class="text-xs text-ink-300">
            {{ fmtTime(r.datetime) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态提示 -->
    <div v-else-if="currentBaby" class="card text-center mt-4 flex-1 flex flex-col items-center justify-center min-h-[200px]">
      <div class="text-4xl mb-3">✨</div>
      <p class="text-ink-500 mb-1">还没有记录</p>
      <p class="text-xs text-ink-400 mb-4">点击上方按钮开始第一次记录</p>
    </div>
  </div>
</template>
