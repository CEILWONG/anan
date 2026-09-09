<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useBabyStore } from '@/stores/baby'
import { useRecordsStore } from '@/stores/records'
import * as echarts from 'echarts/core'
import { LineChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, DataZoomInsideComponent, DataZoomSliderComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { dayjs } from '@/lib/utils'
import type { FeedingRecord, DiaperRecord, WeightRecord, MilestoneRecord } from '@/types'

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, DataZoomInsideComponent, DataZoomSliderComponent, CanvasRenderer])

const router = useRouter()
const babyStore = useBabyStore()
const recordsStore = useRecordsStore()

const weightChartEl = ref<HTMLDivElement>()
const feedingBreastEl = ref<HTMLDivElement>()
const feedingBottleEl = ref<HTMLDivElement>()
const diaperChartEl = ref<HTMLDivElement>()

let weightChart: echarts.ECharts | null = null
let feedingBreastChart: echarts.ECharts | null = null
let feedingBottleChart: echarts.ECharts | null = null
let diaperChart: echarts.ECharts | null = null

onMounted(async () => {
  await babyStore.loadBabies()
  await recordsStore.loadAll()
  await nextTick()
  renderAll()
})

function zoomCfg(days: string[]) {
  return days.length > 12
    ? [
        { type: 'inside', start: Math.max(0, 100 - (12 / days.length) * 100), end: 100 },
        { type: 'slider', bottom: 0, height: 16, start: Math.max(0, 100 - (12 / days.length) * 100), end: 100 }
      ]
    : []
}

function renderAll() {
  renderWeight()
  renderFeedingBreast()
  renderFeedingBottle()
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

// ---- 喂养①：亲喂时长（按天总分钟数）----
function renderFeedingBreast() {
  if (!feedingBreastEl.value) return
  const map = new Map<string, number>()
  recordsStore.forCurrentBaby().filter((r) => r.type === 'feeding').forEach((r) => {
    const f = r as FeedingRecord
    if (f.method !== 'breast') return
    const day = dayjs(r.datetime).format('MM-DD')
    map.set(day, (map.get(day) || 0) + (f.durationMin || 0))
  })
  if (map.size === 0) return
  feedingBreastEl.value.style.display = 'block'
  const days = [...map.keys()].sort()
  feedingBreastChart = feedingBreastChart || echarts.init(feedingBreastEl.value)
  feedingBreastChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['亲喂时长(分钟)'], top: 0 },
    grid: { left: 8, right: 8, top: 32, bottom: days.length > 12 ? 40 : 26, containLabel: true },
    xAxis: { type: 'category', data: days },
    yAxis: { type: 'value', name: '分钟' },
    series: [{
      name: '亲喂时长(分钟)',
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { width: 2.5, color: '#f4a261' },
      itemStyle: { color: '#f4a261' },
      areaStyle: { opacity: 0.12 },
      data: days.map((d) => map.get(d)!)
    }],
    dataZoom: zoomCfg(days)
  })
}

// ---- 喂养②：瓶喂趋势（奶粉 / 母乳每日奶量）----
function renderFeedingBottle() {
  if (!feedingBottleEl.value) return
  type DayAgg = { formula: number; pumped: number }
  const map = new Map<string, DayAgg>()
  recordsStore.forCurrentBaby().filter((r) => r.type === 'feeding').forEach((r) => {
    const f = r as FeedingRecord
    if (f.method === 'breast') return
    const day = dayjs(r.datetime).format('MM-DD')
    const cur = map.get(day) || { formula: 0, pumped: 0 }
    if (f.method === 'formula') cur.formula += f.amountMl || 0
    else cur.pumped += f.amountMl || 0
    map.set(day, cur)
  })
  if (map.size === 0) return
  feedingBottleEl.value.style.display = 'block'
  const days = [...map.keys()].sort()
  const by = (k: keyof DayAgg) => days.map((d) => map.get(d)![k])
  feedingBottleChart = feedingBottleChart || echarts.init(feedingBottleEl.value)
  feedingBottleChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['奶粉奶量(ml)', '母乳奶量(ml)'], top: 0 },
    grid: { left: 8, right: 8, top: 32, bottom: days.length > 12 ? 40 : 26, containLabel: true },
    xAxis: { type: 'category', data: days },
    yAxis: { type: 'value', name: 'ml' },
    series: [
      { name: '奶粉奶量(ml)', type: 'bar', barMaxWidth: 14, itemStyle: { color: '#8ecae6' }, data: by('formula') },
      { name: '母乳奶量(ml)', type: 'bar', barMaxWidth: 14, itemStyle: { color: '#a4c3a8' }, data: by('pumped') }
    ],
    dataZoom: zoomCfg(days)
  })
}

// ---- 尿布趋势（按天：类型堆积 + 总次数）----
function renderDiaper() {
  if (!diaperChartEl.value) return
  const META = [
    { key: 'wet', name: '小便', color: '#8ecae6' },
    { key: 'dirty', name: '大便', color: '#e3b587' },
    { key: 'mixed', name: '都有', color: '#c4a7e7' }
  ]
  type DayAgg = { wet: number; dirty: number; mixed: number; total: number }
  const map = new Map<string, DayAgg>()
  recordsStore.forCurrentBaby().filter((r) => r.type === 'diaper').forEach((r) => {
    const day = dayjs(r.datetime).format('MM-DD')
    const d = r as DiaperRecord
    const cur = map.get(day) || { wet: 0, dirty: 0, mixed: 0, total: 0 }
    if (d.diaperType === 'wet') cur.wet++
    else if (d.diaperType === 'dirty') cur.dirty++
    else cur.mixed++
    cur.total++
    map.set(day, cur)
  })
  if (map.size === 0) return
  diaperChartEl.value.style.display = 'block'
  const days = [...map.keys()].sort()
  const by = (k: keyof DayAgg) => days.map((d) => map.get(d)![k])
  diaperChart = diaperChart || echarts.init(diaperChartEl.value)
  diaperChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['小便', '大便', '都有', '总次数'], top: 0 },
    grid: { left: 8, right: 26, top: 32, bottom: days.length > 12 ? 40 : 26, containLabel: true },
    xAxis: { type: 'category', data: days },
    yAxis: [
      { type: 'value', name: '次' },
      { type: 'value', name: '次', splitLine: { show: false }, max: (v: any) => Math.max(v.max * 1.2, 1) }
    ],
    series: [
      ...META.map((m) => ({
        name: m.name,
        type: 'bar' as const,
        stack: 'diaper',
        barMaxWidth: 18,
        itemStyle: { color: m.color },
        data: by(m.key as keyof DayAgg)
      })),
      { name: '总次数', type: 'line', yAxisIndex: 1, smooth: true, symbol: 'circle', symbolSize: 6, lineStyle: { width: 2.5, color: '#5b8db8' }, itemStyle: { color: '#5b8db8' }, data: by('total') }
    ],
    dataZoom: days.length > 12
      ? [
          { type: 'inside', start: Math.max(0, 100 - (12 / days.length) * 100), end: 100 },
          { type: 'slider', bottom: 0, height: 16, start: Math.max(0, 100 - (12 / days.length) * 100), end: 100 }
        ]
      : []
  })
}

// ---- 里程碑时间线 ----
const milestones = computed(() => {
  return recordsStore.forCurrentBaby()
    .filter((r) => r.type === 'milestone')
    .sort((a, b) => (b as MilestoneRecord).achievedAt.localeCompare((a as MilestoneRecord).achievedAt)) as MilestoneRecord[]
})

const hasBaby = computed(() => !!babyStore.currentBaby)

// 最新一次体重 + 斤两换算
const latestWeight = computed(() => {
  const recs = recordsStore.forCurrentBaby()
    .filter((r) => r.type === 'weight')
    .sort((a, b) => b.datetime.localeCompare(a.datetime))
  return recs[0] as WeightRecord | undefined
})
function toGrace(kg: number) {
  const g = Math.round(kg * 1000)
  const totalJin = g / 500
  let wholeJin = Math.floor(totalJin)
  let liang = Math.round((g - wholeJin * 500) / 50)
  if (liang >= 10) { wholeJin += 1; liang = 0 } // 满10两进位成1斤
  return { g, jinLabel: `${wholeJin}斤${liang}两` }
}
const latestWeightInfo = computed(() =>
  latestWeight.value ? toGrace(latestWeight.value.weightKg) : null
)
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
        class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm overflow-hidden"
        aria-label="设置"
      >
        <img
          v-if="babyStore.currentBaby?.avatar"
          :src="babyStore.currentBaby.avatar"
          class="w-full h-full object-cover"
          alt="头像"
        />
        <span v-else class="text-xl">{{ babyStore.currentBaby?.gender === 'girl' ? '👧' : '👦' }}</span>
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
        <template v-if="latestWeightInfo">
          <div class="flex items-baseline gap-2">
            <span class="text-2xl font-serif text-ink-700">{{ latestWeightInfo.g }} g</span>
            <span class="text-base text-apricot-500 font-medium">{{ latestWeightInfo.jinLabel }}</span>
          </div>
          <p class="text-xs text-ink-400 mt-1 mb-3">
            {{ dayjs(latestWeight?.datetime).format('YYYY-MM-DD HH:mm') }} · 最新一次
          </p>
        </template>
        <div ref="weightChartEl" class="h-56 w-full" style="display:none"></div>
        <p v-if="!recordsStore.forCurrentBaby().some((r) => r.type === 'weight')" class="text-xs text-ink-400 text-center py-8">
          还没有体重记录
        </p>
      </div>

      <!-- 喂养①：亲喂时长 -->
      <div class="card mb-5">
        <h3 class="heading-2 mb-3">🤱 亲喂时长</h3>
        <div ref="feedingBreastEl" class="h-56 w-full" style="display:none"></div>
        <p v-if="!recordsStore.forCurrentBaby().some((r) => r.type === 'feeding' && (r as any).method === 'breast')" class="text-xs text-ink-400 text-center py-8">
          还没有亲喂记录
        </p>
      </div>

      <!-- 喂养②：瓶喂趋势（奶粉 / 母乳） -->
      <div class="card mb-5">
        <h3 class="heading-2 mb-3">🍼 瓶喂趋势</h3>
        <div ref="feedingBottleEl" class="h-56 w-full" style="display:none"></div>
        <p v-if="!recordsStore.forCurrentBaby().some((r) => r.type === 'feeding' && (r as any).method !== 'breast')" class="text-xs text-ink-400 text-center py-8">
          还没有瓶喂记录
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