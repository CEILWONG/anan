<script setup lang="ts">
import { ref, reactive, onMounted, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useBabyStore } from '@/stores/baby'
import { useRecordsStore } from '@/stores/records'
import * as echarts from 'echarts/core'
import { LineChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, DataZoomInsideComponent, DataZoomSliderComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { ZoomIn, ZoomOut } from 'lucide-vue-next'
import { dayjs } from '@/lib/utils'
import type { FeedingRecord, DiaperRecord, WeightRecord, JaundiceRecord, MilestoneRecord } from '@/types'

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, DataZoomInsideComponent, DataZoomSliderComponent, CanvasRenderer])

const router = useRouter()
const babyStore = useBabyStore()
const recordsStore = useRecordsStore()

const weightChartEl = ref<HTMLDivElement>()
const feedingBreastEl = ref<HTMLDivElement>()
const feedingBottleEl = ref<HTMLDivElement>()
const diaperChartEl = ref<HTMLDivElement>()
const jaundiceChartEl = ref<HTMLDivElement>()

let weightChart: echarts.ECharts | null = null
let feedingBreastChart: echarts.ECharts | null = null
let feedingBottleChart: echarts.ECharts | null = null
let diaperChart: echarts.ECharts | null = null
let jaundiceChart: echarts.ECharts | null = null

// 各图是否启用了窗口缩放（记录数 > 默认窗口时才有滑动条），用于控制 ＋/− 按钮显示
const zoomable = reactive<Record<string, boolean>>({})

onMounted(async () => {
  await babyStore.loadBabies()
  await recordsStore.loadAll()
  await nextTick()
  renderAll()
})

const DEFAULT_WINDOW = 7 // 默认展示最近 7 天，更早的通过底部滑动条 / 拖拽平移回看
const hasZoom = (days: string[]) => days.length > DEFAULT_WINDOW
// 底部留白：出现滑动条时抬高 grid，避免图表被遮住
function bottomCfg(days: string[]) {
  return hasZoom(days) ? 52 : days.length > 12 ? 40 : 26
}
function zoomCfg(days: string[]) {
  if (!hasZoom(days)) return []
  const openRatio = DEFAULT_WINDOW / days.length
  const start = Math.max(0, (1 - openRatio) * 100)
  return [
    {
      type: 'inside', start, end: 100, // 触屏：单指拖动平移、两指捏合缩放
      zoomOnMouseWheel: false,
      zoomOnTouch: true,
      moveOnMouseWheel: true,
      moveOnMouseMove: true
    },
    {
      type: 'slider', start, end: 100, // 底部可视化滑动条：拖中间平移窗口、拖两端手柄缩放
      height: 28, // 加高触控区，手机上更好操作
      bottom: 6,
      borderColor: 'rgba(244,162,97,0.4)',
      backgroundColor: 'rgba(244,162,97,0.12)',
      fillerColor: 'rgba(244,162,97,0.32)',
      handleSize: '140%', // 放大两端手柄，减少误触
      handleStyle: { color: '#f4a261', borderColor: '#fff', borderWidth: 2 },
      moveHandleSize: 8, // 中间抓手：拖动它平移窗口
      showDetail: false,
      textStyle: { color: '#9c9177', fontSize: 10 }
    }
  ]
}

// ＋/－ 按钮：放大窗口（看得更细）/ 缩小窗口（看得更全），手机上比拖手柄更易操作
function zoomStep(c: echarts.ECharts | null, dir: 1 | -1) {
  if (!c) return
  const dz = (c.getOption().dataZoom || []) as any[]
  const slider = dz.find((z) => z && z.type === 'slider')
  if (!slider || typeof slider.start !== 'number' || typeof slider.end !== 'number') return
  const w = slider.end - slider.start
  const nextW = Math.min(100, w * (dir === 1 ? 0.8 : 1.25))
  if (dir === -1 && nextW >= 100) return // 已到全览，无需再缩小
  const center = (slider.start + slider.end) / 2
  let s = center - nextW / 2
  let e = center + nextW / 2
  if (s < 0) { s = 0; e = nextW }
  if (e > 100) { e = 100; s = 100 - nextW }
  c.dispatchAction({ type: 'dataZoom', start: s, end: e })
}

function renderAll() {
  renderWeight()
  renderJaundice()
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
  const dates = recs.map((r) => dayjs(r.datetime).format('MM-DD'))
  zoomable.weight = hasZoom(dates)
  weightChart = weightChart || echarts.init(weightChartEl.value)
  weightChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 8, right: 8, top: 30, bottom: bottomCfg(dates), containLabel: true },
    xAxis: {
      type: 'category',
      data: dates,
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
    }],
    dataZoom: zoomCfg(dates)
  })
}

// ---- 黄疸均值曲线（每次测量取头/胸/腹的平均值，mg/dL）----
function renderJaundice() {
  if (!jaundiceChartEl.value) return
  const recs = recordsStore.forCurrentBaby()
    .filter((r) => r.type === 'jaundice')
    .sort((a, b) => a.datetime.localeCompare(b.datetime)) as JaundiceRecord[]
  if (recs.length === 0) return
  jaundiceChartEl.value.style.display = 'block'
  const dates = recs.map((r) => dayjs(r.datetime).format('MM-DD'))
  zoomable.jaundice = hasZoom(dates)
  // 平均值 = 该次实测部位数值求和 ÷ 部位数，保留 1 位小数
  const avgs = recs.map((r) => {
    const vals = [r.faceValue, r.chestValue, r.abdomenValue].filter((v): v is number => typeof v === 'number')
    if (vals.length === 0) return null
    return Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1))
  })
  jaundiceChart = jaundiceChart || echarts.init(jaundiceChartEl.value)
  jaundiceChart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const i = params[0].dataIndex
        const r = recs[i]
        const lines = [`<b>${dayjs(r.datetime).format('M月D日 HH:mm')}</b>`]
        if (r.faceValue != null) lines.push(`头部: ${r.faceValue} mg/dL`)
        if (r.chestValue != null) lines.push(`胸部: ${r.chestValue} mg/dL`)
        if (r.abdomenValue != null) lines.push(`腹部: ${r.abdomenValue} mg/dL`)
        if (avgs[i] != null) lines.push(`<b>平均: ${avgs[i]} mg/dL</b>`)
        return lines.join('<br/>')
      }
    },
    legend: { data: ['黄疸平均值'], top: 0 },
    grid: { left: 8, right: 8, top: 32, bottom: bottomCfg(dates), containLabel: true },
    xAxis: { type: 'category', data: dates, boundaryGap: false, axisLabel: { color: '#9c9177', fontSize: 10 } },
    yAxis: { type: 'value', name: 'mg/dL', scale: true, min: (v: any) => Math.max(0, Math.floor(v.min - 0.5)) },
    series: [{
      name: '黄疸平均值',
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 7,
      lineStyle: { width: 2.5, color: '#e0a53e' },
      itemStyle: { color: '#e0a53e' },
      areaStyle: { opacity: 0.12 },
      label: {
        show: true,
        position: 'top',
        color: '#6b7280',
        fontSize: 10,
        backgroundColor: 'rgba(255,255,255,0.8)',
        padding: [2, 4],
        borderRadius: 3,
        formatter: (p: any) => (p.value == null ? '' : String(p.value))
      },
      data: avgs
    }],
    dataZoom: zoomCfg(dates)
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
  zoomable.breast = hasZoom(days)
  feedingBreastChart = feedingBreastChart || echarts.init(feedingBreastEl.value)
  feedingBreastChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['亲喂时长(分钟)'], top: 0 },
    grid: { left: 8, right: 8, top: 32, bottom: bottomCfg(days), containLabel: true },
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
  zoomable.bottle = hasZoom(days)
  const by = (k: keyof DayAgg) => days.map((d) => map.get(d)![k])
  feedingBottleChart = feedingBottleChart || echarts.init(feedingBottleEl.value)
  feedingBottleChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['奶粉奶量(ml)', '母乳奶量(ml)'], top: 0 },
    grid: { left: 8, right: 8, top: 32, bottom: bottomCfg(days), containLabel: true },
    xAxis: { type: 'category', data: days },
    yAxis: { type: 'value', name: 'ml' },
    series: [
      {
        name: '奶粉奶量(ml)',
        type: 'bar',
        barMaxWidth: 14,
        itemStyle: { color: '#8ecae6', borderRadius: [2, 2, 0, 0] },
        label: { show: true, position: 'top', color: '#6b7280', fontSize: 10, formatter: (p: any) => (p.value ? p.value + '' : '') },
        data: by('formula')
      },
      {
        name: '母乳奶量(ml)',
        type: 'bar',
        barMaxWidth: 14,
        itemStyle: { color: '#a4c3a8', borderRadius: [2, 2, 0, 0] },
        label: { show: true, position: 'top', color: '#6b7280', fontSize: 10, formatter: (p: any) => (p.value ? p.value + '' : '') },
        data: by('pumped')
      }
    ],
    dataZoom: zoomCfg(days)
  })
}

// ---- 尿布趋势（按天：小便 / 大便堆积，mixed 拆成各一次）----
function renderDiaper() {
  if (!diaperChartEl.value) return
  const WET = '#8ecae6'
  const DIRTY = '#e3b587'

  // 每天按时间排序的大小便事件（“都有”拆成一次小便 + 一次大便）
  const dayEvents = new Map<string, { dt: string; type: 'wet' | 'dirty' }[]>()
  recordsStore.forCurrentBaby().filter((r) => r.type === 'diaper').forEach((r) => {
    const d = r as DiaperRecord
    const day = dayjs(r.datetime).format('YYYY-MM-DD')
    const list = dayEvents.get(day) || []
    if (d.diaperType === 'wet') list.push({ dt: r.datetime, type: 'wet' })
    else if (d.diaperType === 'dirty') list.push({ dt: r.datetime, type: 'dirty' })
    else { list.push({ dt: r.datetime, type: 'wet' }, { dt: r.datetime, type: 'dirty' }) }
    dayEvents.set(day, list)
  })
  if (dayEvents.size === 0) return
  diaperChartEl.value.style.display = 'block'

  const days = [...dayEvents.keys()].sort()
  zoomable.diaper = hasZoom(days)
  const maxEvents = Math.max(...[...dayEvents.values()].map((l) => l.length))
  // 每条柱 = 一个时间槽位；某天该槽位有事件则色块置 1，否则为透明 0 占位保持对齐
  const series = []
  for (let i = 0; i < maxEvents; i++) {
    const data = days.map((day) => {
      const evs = dayEvents.get(day)!
      if (i < evs.length) {
        return { value: 1, itemStyle: { color: evs[i].type === 'dirty' ? DIRTY : WET, borderColor: 'rgba(120,100,80,0.35)', borderWidth: 1 } }
      }
      return { value: 0, itemStyle: { color: 'transparent', borderWidth: 0 } }
    })
    series.push({ name: '', type: 'bar' as const, stack: 'diaper', barMaxWidth: 22, data })
  }

  diaperChart = diaperChart || echarts.init(diaperChartEl.value)
  diaperChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const day = days[params[0].dataIndex]
        const evs = dayEvents.get(day) || []
        const lines = [`<b>${dayjs(day).format('M月D日 dddd')}</b>（共 ${evs.length} 次）`]
        evs.forEach((ev) => {
          const t = ev.type === 'dirty' ? '💩 大便' : '💧 小便'
          lines.push(`${dayjs(ev.dt).format('HH:mm')} ${t}`)
        })
        return lines.join('<br/>')
      }
    },
    grid: { left: 8, right: 8, top: 24, bottom: bottomCfg(days), containLabel: true },
    xAxis: { type: 'category', data: days, axisLabel: { formatter: (v: string) => dayjs(v).format('MM-DD') } },
    yAxis: { type: 'value', name: '次' },
    series,
    dataZoom: zoomCfg(days)
  })
}

// ---- 里程碑时间线 ----
const milestones = computed(() => {
  return recordsStore.forCurrentBaby()
    .filter((r) => r.type === 'milestone')
    .sort((a, b) => (b as MilestoneRecord).achievedAt.localeCompare((a as MilestoneRecord).achievedAt)) as MilestoneRecord[]
})

const hasBaby = computed(() => !!babyStore.currentBaby)

const hasWeight = computed(() => recordsStore.forCurrentBaby().some((r) => r.type === 'weight'))
const hasJaundice = computed(() => recordsStore.forCurrentBaby().some((r) => r.type === 'jaundice'))
const hasDiaper = computed(() => recordsStore.forCurrentBaby().some((r) => r.type === 'diaper'))
const hasBottleFeed = computed(() =>
  recordsStore.forCurrentBaby().some((r): r is FeedingRecord => r.type === 'feeding' && r.method !== 'breast')
)
const hasBreastFeed = computed(() =>
  recordsStore.forCurrentBaby().some((r): r is FeedingRecord => r.type === 'feeding' && r.method === 'breast')
)

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
        <div class="flex items-center justify-between mb-3">
          <h3 class="heading-2">⚖️ 体重曲线</h3>
          <div v-if="hasWeight && zoomable.weight" class="flex items-center gap-1.5">
            <button @click="zoomStep(weightChart, -1)" class="w-8 h-8 rounded-lg bg-white border border-apricot-200 text-apricot-500 flex items-center justify-center shadow-sm active:scale-90 transition" aria-label="缩小窗口"><ZoomOut class="w-4 h-4" /></button>
            <button @click="zoomStep(weightChart, 1)" class="w-8 h-8 rounded-lg bg-white border border-apricot-200 text-apricot-500 flex items-center justify-center shadow-sm active:scale-90 transition" aria-label="放大窗口"><ZoomIn class="w-4 h-4" /></button>
          </div>
        </div>
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
        <p v-if="!hasWeight" class="text-xs text-ink-400 text-center py-8">
          还没有体重记录
        </p>
      </div>

      <!-- 黄疸均值曲线 -->
      <div class="card mb-5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="heading-2">🟡 黄疸均值曲线</h3>
          <div v-if="hasJaundice && zoomable.jaundice" class="flex items-center gap-1.5">
            <button @click="zoomStep(jaundiceChart, -1)" class="w-8 h-8 rounded-lg bg-white border border-apricot-200 text-apricot-500 flex items-center justify-center shadow-sm active:scale-90 transition" aria-label="缩小窗口"><ZoomOut class="w-4 h-4" /></button>
            <button @click="zoomStep(jaundiceChart, 1)" class="w-8 h-8 rounded-lg bg-white border border-apricot-200 text-apricot-500 flex items-center justify-center shadow-sm active:scale-90 transition" aria-label="放大窗口"><ZoomIn class="w-4 h-4" /></button>
          </div>
        </div>
        <p class="text-xs text-ink-400 -mt-2 mb-3">每次测量取头部 / 胸部 / 腹部的平均值（mg/dL），曲线上的数字即平均值</p>
        <div ref="jaundiceChartEl" class="h-56 w-full" style="display:none"></div>
        <p v-if="!hasJaundice" class="text-xs text-ink-400 text-center py-8">
          还没有黄疸记录
        </p>
      </div>

      <!-- 喂养②：瓶喂趋势（奶粉 / 母乳） -->
      <div class="card mb-5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="heading-2">🍼 瓶喂趋势</h3>
          <div v-if="hasBottleFeed && zoomable.bottle" class="flex items-center gap-1.5">
            <button @click="zoomStep(feedingBottleChart, -1)" class="w-8 h-8 rounded-lg bg-white border border-apricot-200 text-apricot-500 flex items-center justify-center shadow-sm active:scale-90 transition" aria-label="缩小窗口"><ZoomOut class="w-4 h-4" /></button>
            <button @click="zoomStep(feedingBottleChart, 1)" class="w-8 h-8 rounded-lg bg-white border border-apricot-200 text-apricot-500 flex items-center justify-center shadow-sm active:scale-90 transition" aria-label="放大窗口"><ZoomIn class="w-4 h-4" /></button>
          </div>
        </div>
        <div ref="feedingBottleEl" class="h-56 w-full" style="display:none"></div>
        <p v-if="!hasBottleFeed" class="text-xs text-ink-400 text-center py-8">
          还没有瓶喂记录
        </p>
      </div>

      <!-- 尿布趋势 -->
      <div class="card mb-5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="heading-2">🧷 尿布趋势</h3>
          <div v-if="hasDiaper && zoomable.diaper" class="flex items-center gap-1.5">
            <button @click="zoomStep(diaperChart, -1)" class="w-8 h-8 rounded-lg bg-white border border-apricot-200 text-apricot-500 flex items-center justify-center shadow-sm active:scale-90 transition" aria-label="缩小窗口"><ZoomOut class="w-4 h-4" /></button>
            <button @click="zoomStep(diaperChart, 1)" class="w-8 h-8 rounded-lg bg-white border border-apricot-200 text-apricot-500 flex items-center justify-center shadow-sm active:scale-90 transition" aria-label="放大窗口"><ZoomIn class="w-4 h-4" /></button>
          </div>
        </div>
        <div ref="diaperChartEl" class="h-56 w-full" style="display:none"></div>
        <p v-if="!hasDiaper" class="text-xs text-ink-400 text-center py-8">
          还没有尿布记录
        </p>
      </div>

      <!-- 喂养①：亲喂时长 -->
      <div class="card mb-5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="heading-2">🤱 亲喂时长</h3>
          <div v-if="hasBreastFeed && zoomable.breast" class="flex items-center gap-1.5">
            <button @click="zoomStep(feedingBreastChart, -1)" class="w-8 h-8 rounded-lg bg-white border border-apricot-200 text-apricot-500 flex items-center justify-center shadow-sm active:scale-90 transition" aria-label="缩小窗口"><ZoomOut class="w-4 h-4" /></button>
            <button @click="zoomStep(feedingBreastChart, 1)" class="w-8 h-8 rounded-lg bg-white border border-apricot-200 text-apricot-500 flex items-center justify-center shadow-sm active:scale-90 transition" aria-label="放大窗口"><ZoomIn class="w-4 h-4" /></button>
          </div>
        </div>
        <div ref="feedingBreastEl" class="h-56 w-full" style="display:none"></div>
        <p v-if="!hasBreastFeed" class="text-xs text-ink-400 text-center py-8">
          还没有亲喂记录
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