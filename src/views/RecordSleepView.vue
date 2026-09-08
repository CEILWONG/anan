<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useBabyStore } from '@/stores/baby'
import { useRecordsStore } from '@/stores/records'
import { ArrowLeft, Check, Loader2, Moon, Sun } from 'lucide-vue-next'
import { dayjs } from '@/lib/utils'
import type { SleepQuality } from '@/types'

const router = useRouter()
const babyStore = useBabyStore()
const recordsStore = useRecordsStore()

const mode = ref<'start' | 'end'>('start')
const startTime = ref(dayjs().format('YYYY-MM-DDTHH:mm'))
const endTime = ref(dayjs().format('YYYY-MM-DDTHH:mm'))
const quality = ref<SleepQuality>('good')
const location = ref('')
const note = ref('')
const submitting = ref(false)

const ongoingSleep = computed(() => recordsStore.ongoingSleep)

const durationMin = computed(() => {
  const s = dayjs(startTime.value)
  const e = dayjs(endTime.value)
  return Math.max(1, e.diff(s, 'minute'))
})

onMounted(async () => {
  await babyStore.loadBabies()
  await recordsStore.loadAll()
  // 如果有进行中的睡眠，提示结束它
  if (ongoingSleep.value) {
    mode.value = 'end'
    startTime.value = dayjs(ongoingSleep.value.datetime).format('YYYY-MM-DDTHH:mm')
  }
})

async function submit() {
  if (!babyStore.currentBabyId) return
  submitting.value = true
  try {
    if (mode.value === 'start') {
      await recordsStore.addSleep({
        babyId: babyStore.currentBabyId,
        datetime: new Date(startTime.value).toISOString(),
        startTime: new Date(startTime.value).toISOString(),
        quality: quality.value,
        location: location.value.trim() || undefined,
        note: note.value.trim() || undefined
      })
    } else {
      // 结束已有的睡眠
      if (ongoingSleep.value) {
        await recordsStore.endSleep(ongoingSleep.value.id, new Date(endTime.value).toISOString())
      }
    }
    router.back()
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-cream-100 pb-24">
    <!-- 顶部 -->
    <div class="px-5 pt-6 pb-4 flex items-center gap-3 sticky top-0 bg-cream-100/90 backdrop-blur z-10">
      <button @click="router.back()" class="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm">
        <ArrowLeft class="w-4 h-4 text-ink-500" />
      </button>
      <div>
        <h1 class="heading-1 text-xl">😴 睡眠记录</h1>
        <p class="text-xs text-ink-400">给 {{ babyStore.currentBaby?.name || '宝宝' }} 记一笔</p>
      </div>
    </div>

    <div class="px-5 space-y-5 max-w-md mx-auto">
      <!-- 模式切换 -->
      <div class="bg-cream-200 rounded-2xl p-1 grid grid-cols-2 gap-1">
        <button
          @click="mode = 'start'"
          :class="[
            'py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5',
            mode === 'start' ? 'bg-white shadow-sm text-ink-700' : 'text-ink-500'
          ]"
        >
          <Moon class="w-3.5 h-3.5" /> 开始睡眠
        </button>
        <button
          @click="mode = 'end'"
          :class="[
            'py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5',
            mode === 'end' ? 'bg-white shadow-sm text-ink-700' : 'text-ink-500'
          ]"
        >
          <Sun class="w-3.5 h-3.5" /> 结束睡眠
        </button>
      </div>

      <!-- 开始时间 -->
      <div>
        <label class="label">开始时间</label>
        <input v-model="startTime" type="datetime-local" class="input" />
      </div>

      <!-- 结束时间（仅结束模式） -->
      <div v-if="mode === 'end'">
        <label class="label">结束时间</label>
        <input v-model="endTime" type="datetime-local" class="input" />
        <div v-if="durationMin > 0" class="mt-2 text-xs text-ink-500">
          时长约 {{ Math.floor(durationMin / 60) }} 小时 {{ durationMin % 60 }} 分钟
        </div>
      </div>

      <!-- 质量 -->
      <div>
        <label class="label">睡眠质量</label>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="q in [
              { v: 'good', l: '很好' },
              { v: 'normal', l: '一般' },
              { v: 'restless', l: '不安稳' }
            ]"
            :key="q.v"
            @click="quality = q.v as SleepQuality"
            :class="[
              'py-2.5 rounded-xl text-sm transition border',
              quality === q.v
              ? 'bg-dusk-50 border-dusk-200 text-dusk-400 font-medium'
              : 'bg-white border-cream-200 text-ink-500'
            ]"
          >
            {{ q.l }}
          </button>
        </div>
      </div>

      <!-- 地点 -->
      <div>
        <label class="label">在哪里睡的（可选）</label>
        <input
          v-model="location"
          class="input"
          placeholder="比如：小床、妈妈怀里"
          maxlength="20"
        />
      </div>

      <!-- 备注 -->
      <div>
        <label class="label">备注（可选）</label>
        <textarea
          v-model="note"
          class="input min-h-[80px] resize-none"
          placeholder="夜醒几次？做梦了吗？"
          maxlength="200"
        ></textarea>
      </div>

      <!-- 提交 -->
      <button
        @click="submit"
        :disabled="submitting"
        class="btn-primary w-full flex items-center justify-center gap-2"
      >
        <Loader2 v-if="submitting" class="w-4 h-4 animate-spin" />
        <Check v-else class="w-4 h-4" />
        保存记录
      </button>
    </div>
  </div>
</template>