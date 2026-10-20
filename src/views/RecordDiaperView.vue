<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBabyStore } from '@/stores/baby'
import { useRecordsStore } from '@/stores/records'
import { ArrowLeft, Check, Loader2 } from 'lucide-vue-next'
import { dayjs } from '@/lib/utils'
import type { DiaperType } from '@/types'

const router = useRouter()
const babyStore = useBabyStore()
const recordsStore = useRecordsStore()

const diaperType = ref<DiaperType>('wet')
const datetime = ref(dayjs().format('YYYY-MM-DDTHH:mm'))
const rash = ref(false)
const note = ref('')
const submitting = ref(false)

onMounted(async () => {
  await babyStore.loadBabies()
  await recordsStore.loadAll()
  // 默认时间为打开时刻减 5 分钟，备注默认留空；类型和红屁屁沿用上次记录
  const last = recordsStore.lastDiaper
  if (last) {
    diaperType.value = last.diaperType
    rash.value = last.rash || false
  }
  datetime.value = dayjs().subtract(5, 'minute').format('YYYY-MM-DDTHH:mm')
})

async function submit() {
  if (!babyStore.currentBabyId) return
  submitting.value = true
  try {
    await recordsStore.addDiaper({
      babyId: babyStore.currentBabyId,
      datetime: new Date(datetime.value).toISOString(),
      diaperType: diaperType.value,
      rash: rash.value,
      note: note.value.trim() || undefined
    })
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
        <h1 class="heading-1 text-xl">🧷 换尿布</h1>
        <p class="text-xs text-ink-400">给 {{ babyStore.currentBaby?.name || '宝宝' }} 记一笔</p>
      </div>
    </div>

    <div class="px-5 space-y-5 max-w-md mx-auto">
      <!-- 类型 -->
      <div>
        <label class="label">类型</label>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="t in [
              { v: 'wet', l: '小便' },
              { v: 'dirty', l: '大便' }
            ]"
            :key="t.v"
            @click="diaperType = t.v as DiaperType"
            :class="[
              'py-2 rounded-xl text-xs transition border',
              diaperType === t.v
              ? 'bg-sage-50 border-sage-300 text-sage-500 font-medium'
              : 'bg-white border-cream-200 text-ink-500'
            ]"
          >
            {{ t.l }}
          </button>
        </div>
      </div>

      <!-- 时间 -->
      <div>
        <label class="label">时间</label>
        <input v-model="datetime" type="datetime-local" class="input" />
      </div>

      <!-- 红屁屁 -->
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" v-model="rash" class="w-4 h-4 accent-dusk-300" />
          <span class="text-sm text-ink-600">有红屁屁</span>
        </label>
      </div>

      <!-- 备注 -->
      <div>
        <label class="label">备注（可选）</label>
        <textarea
          v-model="note"
          class="input min-h-[60px] resize-none"
          placeholder="比如：颜色、形状..."
          maxlength="200"
        ></textarea>
      </div>

      <button
        @click="submit"
        :disabled="submitting"
        class="btn-primary w-full flex items-center justify-center gap-2"
      >
        <Loader2 v-if="submitting" class="w-4 h-4 animate-spin" />
        <Check v-else class="w-4 h-4" />
        保存
      </button>
    </div>
  </div>
</template>