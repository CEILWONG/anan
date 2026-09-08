<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBabyStore } from '@/stores/baby'
import { useRecordsStore } from '@/stores/records'
import { ArrowLeft, Check, Loader2 } from 'lucide-vue-next'
import { dayjs } from '@/lib/utils'

const router = useRouter()
const babyStore = useBabyStore()
const recordsStore = useRecordsStore()

const title = ref('')
const category = ref<'physical' | 'cognitive' | 'language' | 'social' | 'other'>('physical')
const datetime = ref(dayjs().format('YYYY-MM-DDTHH:mm'))
const description = ref('')
const submitting = ref(false)

const suggestions = {
  physical: [
    '第一次抬头',
    '第一次翻身',
    '第一次坐',
    '第一次爬',
    '第一次站',
    '第一次走',
    '长第一颗牙'
  ],
  language: ['第一次叫妈妈', '第一次叫爸爸', '第一次笑出声', '第一次说词语'],
  social: ['第一次认生', '第一次挥手再见', '第一次拍手'],
  cognitive: ['第一次找藏起来的东西', '第一次指认东西'],
  other: []
}

onMounted(async () => {
  await babyStore.loadBabies()
})

function pickSuggestion(s: string) {
  title.value = s
}

async function submit() {
  if (!title.value.trim()) return
  if (!babyStore.currentBabyId) return
  submitting.value = true
  try {
    await recordsStore.addMilestone({
      babyId: babyStore.currentBabyId,
      datetime: new Date(datetime.value).toISOString(),
      category: category.value,
      title: title.value.trim(),
      achievedAt: new Date(datetime.value).toISOString(),
      description: description.value.trim() || undefined
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
        <h1 class="heading-1 text-xl">⭐ 里程碑</h1>
        <p class="text-xs text-ink-400">珍藏宝宝的每一个"第一次"</p>
      </div>
    </div>

    <div class="px-5 space-y-5 max-w-md mx-auto">
      <!-- 类别 -->
      <div>
        <label class="label">类别</label>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="c in [
              { v: 'physical', l: '🏃 大运动' },
              { v: 'cognitive', l: '🧠 认知' },
              { v: 'language', l: '💬 语言' },
              { v: 'social', l: '🤝 社交' }
            ]"
            :key="c.v"
            @click="category = c.v as any"
            :class="[
              'py-2.5 rounded-xl text-sm transition border',
              category === c.v
              ? 'bg-dusk-50 border-dusk-200 text-dusk-400 font-medium'
              : 'bg-white border-cream-200 text-ink-500'
            ]"
          >
            {{ c.l }}
          </button>
        </div>
      </div>

      <!-- 建议 -->
      <div v-if="suggestions[category]?.length">
        <label class="label">常见里程碑</label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="s in suggestions[category]"
            :key="s"
            @click="pickSuggestion(s)"
            class="chip hover:bg-cream-300 transition"
          >
            {{ s }}
          </button>
        </div>
      </div>

      <!-- 标题 -->
      <div>
        <label class="label">标题</label>
        <input
          v-model="title"
          class="input"
          placeholder="比如：第一次叫妈妈"
          maxlength="30"
        />
      </div>

      <!-- 时间 -->
      <div>
        <label class="label">达成时间</label>
        <input v-model="datetime" type="datetime-local" class="input" />
      </div>

      <!-- 描述 -->
      <div>
        <label class="label">这一刻发生了什么</label>
        <textarea
          v-model="description"
          class="input min-h-[100px] resize-none"
          placeholder="捕捉那一刻的细节，以后翻看会更感动..."
          maxlength="500"
        ></textarea>
      </div>

      <!-- 提交 -->
      <button
        @click="submit"
        :disabled="!title.trim() || submitting"
        class="btn-primary w-full flex items-center justify-center gap-2"
      >
        <Loader2 v-if="submitting" class="w-4 h-4 animate-spin" />
        <Check v-else class="w-4 h-4" />
        珍藏这一刻
      </button>
    </div>
  </div>
</template>