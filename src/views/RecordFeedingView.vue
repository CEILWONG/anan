<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useBabyStore } from '@/stores/baby'
import { useRecordsStore } from '@/stores/records'
import { ArrowLeft, Check, Loader2 } from 'lucide-vue-next'
import { dayjs } from '@/lib/utils'
import type { FeedingMethod, BreastSide } from '@/types'

const router = useRouter()
const babyStore = useBabyStore()
const recordsStore = useRecordsStore()

const method = ref<FeedingMethod>('breast')
const datetime = ref(dayjs().format('YYYY-MM-DDTHH:mm'))
const submitting = ref(false)

const durationMin = ref<number>(15)
const side = ref<BreastSide>('left')
const amountMl = ref<number>(120)
const foodName = ref('')
const foodAmount = ref('')
const note = ref('')

onMounted(async () => {
  await babyStore.loadBabies()
})

const canSubmit = computed(() => {
  if (method.value === 'breast') return true
  if (method.value === 'bottle') return amountMl.value > 0
  if (method.value === 'solid') return foodName.value.trim().length > 0
  return false
})

async function submit() {
  if (!babyStore.currentBabyId) return
  submitting.value = true
  try {
    const record: any = {
      babyId: babyStore.currentBabyId,
      datetime: new Date(datetime.value).toISOString(),
      note: note.value.trim() || undefined,
      method: method.value
    }
    if (method.value === 'breast') {
      record.durationMin = durationMin.value
      record.side = side.value
    } else if (method.value === 'bottle') {
      record.amountMl = amountMl.value
    } else if (method.value === 'solid') {
      record.foodName = foodName.value.trim()
      record.foodAmount = foodAmount.value.trim() || undefined
    }
    await recordsStore.addFeeding(record)
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
        <h1 class="heading-1 text-xl">🍼 喂养记录</h1>
        <p class="text-xs text-ink-400">给 {{ babyStore.currentBaby?.name || '宝宝' }} 记一笔</p>
      </div>
    </div>

    <div class="px-5 space-y-5 max-w-md mx-auto">
      <!-- 方式 -->
      <div>
        <label class="label">喂养方式</label>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="m in [
              { v: 'breast', l: '🍼 母乳' },
              { v: 'bottle', l: '🧃 奶粉' },
              { v: 'solid', l: '🍚 辅食' }
            ]"
            :key="m.v"
            @click="method = m.v as FeedingMethod"
            :class="[
              'py-3 rounded-xl text-sm transition border',
              method === m.v
                ? 'bg-apricot-50 border-apricot-300 text-apricot-500 font-medium'
                : 'bg-white border-cream-200 text-ink-500'
            ]"
          >
            {{ m.l }}
          </button>
        </div>
      </div>

      <!-- 时间 -->
      <div>
        <label class="label">时间</label>
        <input v-model="datetime" type="datetime-local" class="input" />
      </div>

      <!-- 母乳字段 -->
      <template v-if="method === 'breast'">
        <div>
          <label class="label">时长（分钟）</label>
          <div class="flex items-center gap-2">
            <button
              @click="durationMin = Math.max(1, durationMin - 5)"
              class="w-10 h-10 bg-white rounded-xl border border-cream-200 text-ink-500"
            >−</button>
            <input
              v-model.number="durationMin"
              type="number"
              min="1"
              max="120"
              class="input text-center"
            />
            <button
              @click="durationMin = Math.min(120, durationMin + 5)"
              class="w-10 h-10 bg-white rounded-xl border border-cream-200 text-ink-500"
            >+</button>
          </div>
        </div>

        <div>
          <label class="label">哪一侧</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="s in [
                { v: 'left', l: '左' },
                { v: 'right', l: '右' },
                { v: 'both', l: '两侧' }
              ]"
              :key="s.v"
              @click="side = s.v as BreastSide"
              :class="[
                'py-2.5 rounded-xl text-sm transition border',
                side === s.v
                ? 'bg-apricot-50 border-apricot-300 text-apricot-500 font-medium'
                : 'bg-white border-cream-200 text-ink-500'
              ]"
            >
              {{ s.l }}
            </button>
          </div>
        </div>
      </template>

      <!-- 奶粉字段 -->
      <template v-else-if="method === 'bottle'">
        <div>
          <label class="label">奶量（ml）</label>
          <div class="flex items-center gap-2">
            <button
              @click="amountMl = Math.max(10, amountMl - 10)"
              class="w-10 h-10 bg-white rounded-xl border border-cream-200 text-ink-500"
            >−</button>
            <input
              v-model.number="amountMl"
              type="number"
              min="10"
              max="500"
              step="10"
              class="input text-center"
            />
            <button
              @click="amountMl = Math.min(500, amountMl + 10)"
              class="w-10 h-10 bg-white rounded-xl border border-cream-200 text-ink-500"
            >+</button>
          </div>
        </div>
      </template>

      <!-- 辅食字段 -->
      <template v-else>
        <div>
          <label class="label">吃了什么</label>
          <input
            v-model="foodName"
            class="input"
            placeholder="比如：南瓜米糊、苹果泥"
            maxlength="30"
          />
        </div>
        <div>
          <label class="label">吃了多少（可选）</label>
          <input
            v-model="foodAmount"
            class="input"
            placeholder="比如：半碗、3 勺"
            maxlength="20"
          />
        </div>
      </template>

      <!-- 备注 -->
      <div>
        <label class="label">备注（可选）</label>
        <textarea
          v-model="note"
          class="input min-h-[80px] resize-none"
          placeholder="任何想记下来的..."
          maxlength="200"
        ></textarea>
      </div>

      <!-- 提交 -->
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