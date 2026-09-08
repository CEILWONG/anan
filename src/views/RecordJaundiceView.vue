<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useBabyStore } from '@/stores/baby'
import { useRecordsStore } from '@/stores/records'
import { ArrowLeft, Check, Loader2 } from 'lucide-vue-next'
import { dayjs } from '@/lib/utils'

const router = useRouter()
const babyStore = useBabyStore()
const recordsStore = useRecordsStore()

const faceValue = ref<number | undefined>(undefined)
const chestValue = ref<number | undefined>(undefined)
const abdomenValue = ref<number | undefined>(undefined)
const datetime = ref(dayjs().format('YYYY-MM-DDTHH:mm'))
const note = ref('')
const submitting = ref(false)

onMounted(async () => {
  await babyStore.loadBabies()
})

const canSubmit = computed(
  () =>
    (faceValue.value !== undefined && faceValue.value >= 0) ||
    (chestValue.value !== undefined && chestValue.value >= 0) ||
    (abdomenValue.value !== undefined && abdomenValue.value >= 0)
)

async function submit() {
  if (!babyStore.currentBabyId) return
  submitting.value = true
  try {
    await recordsStore.addJaundice({
      babyId: babyStore.currentBabyId,
      datetime: new Date(datetime.value).toISOString(),
      faceValue: faceValue.value,
      chestValue: chestValue.value,
      abdomenValue: abdomenValue.value,
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
    <div class="px-5 pt-6 pb-4 flex items-center gap-3 sticky top-0 bg-cream-100/90 backdrop-blur z-10">
      <button @click="router.back()" class="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm">
        <ArrowLeft class="w-4 h-4 text-ink-500" />
      </button>
      <div>
        <h1 class="heading-1 text-xl">🟡 记录黄疸</h1>
        <p class="text-xs text-ink-400">经皮测黄疸值（mg/dL），至少填一项</p>
      </div>
    </div>

    <div class="px-5 space-y-5 max-w-md mx-auto">
      <div class="grid grid-cols-3 gap-3">
        <div>
          <label class="label">头面部</label>
          <input v-model.number="faceValue" type="number" min="0" max="30" step="0.1" class="input text-center" placeholder="—" />
        </div>
        <div>
          <label class="label">胸部</label>
          <input v-model.number="chestValue" type="number" min="0" max="30" step="0.1" class="input text-center" placeholder="—" />
        </div>
        <div>
          <label class="label">腹部</label>
          <input v-model.number="abdomenValue" type="number" min="0" max="30" step="0.1" class="input text-center" placeholder="—" />
        </div>
      </div>
      <p class="text-xs text-ink-400 -mt-2">单位：mg/dL</p>

      <div>
        <label class="label">时间</label>
        <input v-model="datetime" type="datetime-local" class="input" />
      </div>

      <div>
        <label class="label">备注（可选）</label>
        <textarea
          v-model="note"
          class="input min-h-[60px] resize-none"
          placeholder="仪器、护理建议等..."
          maxlength="200"
        ></textarea>
      </div>

      <button
        @click="submit"
        :disabled="!canSubmit || submitting"
        class="btn-primary w-full flex items-center justify-center gap-2"
      >
        <Loader2 v-if="submitting" class="w-4 h-4 animate-spin" />
        <Check v-else class="w-4 h-4" />
        保存记录
      </button>
    </div>
  </div>
</template>