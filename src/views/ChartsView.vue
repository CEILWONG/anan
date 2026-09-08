<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useBabyStore } from '@/stores/baby'
import { useRecordsStore } from '@/stores/records'
import * as echarts from 'echarts/core'
import { LineChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { dayjs } from '@/lib/utils'
import type { FeedingRecord, DiaperRecord, WeightRecord, MilestoneRecord } from '@/types'

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const router = useRouter()
const babyStore = useBabyStore()
const recordsStore = useRecordsStore()

const weightChartEl = ref<HTMLDivElement>()
const feedingChartEl = ref<HTMLDivElement>()
const diaperChartEl = ref<HTMLDivElement>()

let weightChart: echarts.ECharts | null = null
let feedingChart: echarts.ECharts | null = null
let diaperChart: echarts.ECharts | null = null

onMounted(async () => {
  await babyStore.loadBabies()
  await recordsStore.loadAll()
  await nextTick()
  renderAll()
})

function renderAll() {
  renderWeight()
  renderFeeding()
  renderDiaper()
}

// ---- 体重曲线 ----
function renderWeight() {
  if (!weightChartEl.value) return
  const recs = recordsStore.forCurrentBaby().filter((r) => r.type === 'weight').sort(
    (a, b) => a.datetime.localeCompare(b.datetime)
  ) as WeightRecord[]
  if (recs.length === 0) return
  weightChartEl.value.style.display = 'block'
  weightChart = weightChart || echarts.init(weightChartEl.value)
  weightChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 8, right: 8, top: 30, bottom: 24, containLabel: true },
    xAxis: {
      type: 'category',
      data: recs.map((r) => dayjs(r.datetime).format('MM-DD')),
      boundaryGap: false
    },
    yAxis: { type: 'value', name: 'kg', min: (v: any) => Math.floor(v.min - 0.5), scale: true },
    series: [{
      name: '体重',
      type: 'line',
      smooth: true,
      data: recs.map((r) => r.weightKg),
      areaStyle: { opacity: 0.15 },
      itemStyle: { color: '#f4a261' }
    }]
  })
}

// ---- 喂养趋势（按天聚合次数 + 瓶喂奶量）----
function renderFeeding() {
  if (!feedingChartEl.value) return
  const map = new Map<string, { count: number; milkMl: number }>()
  recordsStore.forCurrentBaby().filter((r) => r.type === 'feeding').forEach((r) => {
    const day = dayjs(r.datetime).format('MM-DD')
    const f = r as FeedingRecord
    const cur = map.get(day) || { count: 0, milkMl: 0 }
    cur.count++
    cur.milkMl += f.amountMl || 0
    map.set(day, cur)
  })
  if (map.size === 0) return
  feedingChartEl.value.style.display = 'block'
  const days = [...map.keys()].sort()
  feedingChart = feedingChart || echarts.init(feedingChartEl.value)
  feedingChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['喂养次数', '奶量(ml)'], top: 0 },
    grid: { left: 8, right: 8, top: 30, bottom: 24, containLabel: true },
    xAxis: { type: 'category', data: days },
    yAxis: { type: 'value' },
    series: [
      { name: '喂养次数', type: 'bar', data: days.map((d) => map.get(d)!.count), itemStyle: { color: '#f6a8c0' } },
      { name: '奶量(ml)', type: 'line', smooth: true, data: days.map((d) => map.get(d)!.milkMl), itemStyle: { color: '#90a8c7' } }
    ]
  })
}

// ---- 尿布趋势（按天聚合，拆分类型堆积）----
function renderDiaper() {
  if (!diaperChartEl.value) return
  const map = new Map<string, { wet: number; dirty: number; mixed: number }>()
  recordsStore.forCurrentBaby().filter((r) => r.type === 'diaper').forEach((r) => {
    const day = dayjs(r.datetime).format('MM-DD')
    const d = r as DiaperRecord
    const cur = map.get(day) || { wet: 0, dirty: 0, mixed: 0 }
    if (d.diaperType === 'wet') cur.wet++
    else if (d.diaperType === 'dirty') cur.dirty++
    else cur.mixed++
    map.set(day, cur)
  })
  if (map.size === 0) return
  diaperChartEl.value.style.display = 'block'
  const days = [...map.keys()].sort()
  diaperChart = diaperChart || echarts.init(diaperChartEl.value)
  diaperChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['小便', '大便', '都有'], top: 0 },
    grid: { left: 8, right: 8, top: 30, bottom: 24, containLabel: true },
    xAxis: { type: 'category', data: days },
    yAxis: { type: 'value' },
    series: [
      { name: '小便', type: 'bar', stack: 'total', data: days.map((d) => map.get(d)!.wet), itemStyle: { color: '#8ecae6' } },
      { name: '大便', type: 'bar', stack: 'total', data: days.map((d) => map.get(d)!.dirty), itemStyle: { color: '#e3b587' } },
      { name: '都有', type: 'bar', stack: 'total', data: days.map((d) => map.get(d)!.mixed), itemStyle: { color: '#c4a7e7' } }
    ]
  })
}

// ---- 里程碑时间线 ----
const milestones = computed(() => {
  return recordsStore.forCurrentBaby()
    .filter((r) => r.type === 'milestone')
    .sort((a, b) => (b as MilestoneRecord).achievedAt.localeCompare((a as MilestoneRecord).achievedAt)) as MilestoneRecord[]
})

const hasBaby = computed(() => !!babyStore.currentBaby)
</script>

<template>
  <div class="px-5 pt-8 pb-4 flex flex-col min-h-full">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="heading-1 text-xl">📊 图表</h1>
        <p class="text-xs text-ink-400">{{ babyStore.currentBaby?.name || '宝宝' }} 的成长趋势</p>
      </div>
      <button
        @click="router.push('/settings')"
        class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm"
        aria-label="设置"
      >
        <span class="text-xl">{{ babyStore.currentBaby?.gender === 'girl' ? '👧' : '👦' }}</span>
      </button>
    </div>

    <div v-if="!hasBaby" class="card text-center py-12">
      <div class="text-5xl mb-3">🌱</div>
      <p class="text-ink-500 mb-1">还没有添加宝宝档案</p>
      <button @click="router.push('/baby/new')" class="btn-primary mt-3 inline-flex items-center gap-2">
        添加宝宝
      </button>
    </div>

    <template v-else>
      <!-- 体重曲线 -->
      <div class="card mb-5">
        <h3 class="heading-2 mb-3">⚖️ 体重曲线</h3>
        <div ref="weightChartEl" class="h-56 w-full" style="display:none"></div>
        <p v-if="!recordsStore.forCurrentBaby().some((r) => r.type === 'weight')" class="text-xs text-ink-400 text-center py-8">
          还没有体重记录
        </p>
      </div>

      <!-- 喂养趋势 -->
      <div class="card mb-5">
        <h3 class="heading-2 mb-3">🍼 喂养趋势</h3>
        <div ref="feedingChartEl" class="h-56 w-full" style="display:none"></div>
        <p v-if="!recordsStore.forCurrentBaby().some((r) => r.type === 'feeding')" class="text-xs text-ink-400 text-center py-8">
          还没有喂养记录
        </p>
      </div>

      <!-- 尿布趋势 -->
      <div class="card mb-5">
        <h3 class="heading-2 mb-3">🧷 尿布趋势</h3>
        <div ref="diaperChartEl" class="h-56 w-full" style="display:none"></div>
        <p v-if="!recordsStore.forCurrentBaby().some((r) => r.type === 'diaper')" class="text-xs text-ink-400 text-center py-8">
          还没有尿布记录
        </p>
      </div>

      <!-- 里程碑时间线 -->
      <div class="card mb-5">
        <h3 class="heading-2 mb-3">⭐ 里程碑</h3>
        <div v-if="milestones.length > 0" class="relative pl-5 border-l-2 border-cream-200 space-y-5 py-1">
          <div v-for="m in milestones" :key="m.id" class="relative">
            <span class="absolute -left-[26px] top-1 w-3 h-3 rounded-full bg-apricot-400"></span>
            <p class="text-sm font-medium text-ink-700">{{ m.title }}</p>
            <p class="text-[11px] text-ink-400 mt-0.5">{{ dayjs(m.achievedAt).format('YYYY-MM-DD') }}</p>
            <p v-if="m.description" class="text-xs text-ink-500 mt-1">{{ m.description }}</p>
          </div>
        </div>
        <p v-else class="text-xs text-ink-400 text-center py-6">还没有里程碑记录</p>
      </div>

      <!-- 查看全部记录 -->
      <button
        @click="router.push('/timeline')"
        class="card w-full text-center py-3 text-sm text-apricot-500 font-medium"
      >
        查看全部记录 →
      </button>
    </template>
  </div>
</template>