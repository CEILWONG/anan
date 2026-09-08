<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useBabyStore } from '@/stores/baby'
import { ArrowLeft, Check, Loader2, Plus } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const babyStore = useBabyStore()

const isEdit = computed(() => !!route.params.id)
const editingId = computed(() => route.params.id as string | undefined)

const name = ref('')
const fullName = ref('')
const gender = ref<'boy' | 'girl'>('girl')
const birthday = ref(new Date().toISOString().slice(0, 10))
const note = ref('')
const submitting = ref(false)
const errorMsg = ref('')

onMounted(async () => {
  await babyStore.loadBabies()
  if (editingId.value) {
    const baby = babyStore.babies.find((b) => b.id === editingId.value)
    if (baby) {
      name.value = baby.name
      fullName.value = baby.fullName || ''
      gender.value = baby.gender
      birthday.value = baby.birthday.slice(0, 10)
      note.value = baby.note || ''
    }
  }
})

async function submit() {
  errorMsg.value = ''
  if (!name.value.trim()) {
    errorMsg.value = '请填写昵称'
    return
  }
  submitting.value = true
  try {
    if (editingId.value) {
      await babyStore.updateBaby(editingId.value, {
        name: name.value.trim(),
        fullName: fullName.value.trim() || undefined,
        gender: gender.value,
        birthday: birthday.value,
        note: note.value.trim() || undefined
      })
    } else {
      await babyStore.createBaby({
        name: name.value.trim(),
        fullName: fullName.value.trim() || undefined,
        gender: gender.value,
        birthday: birthday.value,
        note: note.value.trim() || undefined
      })
    }
    router.back()
  } catch (e: any) {
    errorMsg.value = e?.message || '保存失败'
  } finally {
    submitting.value = false
  }
}

async function removeBaby() {
  if (!editingId.value) return
  if (!confirm(`确定要删除宝宝"${name.value}"吗？相关记录会保留但显示"未知宝宝"。`)) return
  await babyStore.deleteBaby(editingId.value)
  router.replace('/')
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
        <h1 class="heading-1 text-xl">{{ isEdit ? '编辑宝宝' : '添加宝宝' }}</h1>
        <p class="text-xs text-ink-400">{{ isEdit ? '修改宝宝档案' : '为新生命创建档案' }}</p>
      </div>
    </div>

    <div class="px-5 space-y-5 max-w-md mx-auto">
      <!-- 性别 -->
      <div>
        <label class="label">性别</label>
        <div class="grid grid-cols-2 gap-3">
          <button
            @click="gender = 'girl'"
            :class="[
              'py-6 rounded-2xl text-base transition border-2',
              gender === 'girl'
              ? 'bg-dusk-50 border-dusk-300 text-dusk-400 font-medium'
              : 'bg-white border-cream-200 text-ink-500'
            ]"
          >
            <div class="text-3xl mb-1">👧</div>
            女宝宝
          </button>
          <button
            @click="gender = 'boy'"
            :class="[
              'py-6 rounded-2xl text-base transition border-2',
              gender === 'boy'
              ? 'bg-sage-50 border-sage-300 text-sage-500 font-medium'
              : 'bg-white border-cream-200 text-ink-500'
            ]"
          >
            <div class="text-3xl mb-1">👦</div>
            男宝宝
          </button>
        </div>
      </div>

      <!-- 昵称 -->
      <div>
        <label class="label">昵称 / 小名</label>
        <input
          v-model="name"
          class="input"
          placeholder="家里怎么叫ta"
          maxlength="20"
        />
      </div>

      <!-- 全名 -->
      <div>
        <label class="label">大名（可选）</label>
        <input
          v-model="fullName"
          class="input"
          placeholder="姓名 / 英文名"
          maxlength="30"
        />
      </div>

      <!-- 生日 -->
      <div>
        <label class="label">生日</label>
        <input v-model="birthday" type="date" class="input" />
      </div>

      <!-- 备注 -->
      <div>
        <label class="label">备注（可选）</label>
        <textarea
          v-model="note"
          class="input min-h-[80px] resize-none"
          placeholder="比如：过敏、爱好、性格..."
          maxlength="200"
        ></textarea>
      </div>

      <!-- 错误 -->
      <div v-if="errorMsg" class="bg-dusk-50 text-dusk-400 px-4 py-3 rounded-xl text-sm">
        {{ errorMsg }}
      </div>

      <!-- 提交 -->
      <button
        @click="submit"
        :disabled="submitting"
        class="btn-primary w-full flex items-center justify-center gap-2"
      >
        <Loader2 v-if="submitting" class="w-4 h-4 animate-spin" />
        <Check v-else class="w-4 h-4" />
        {{ isEdit ? '保存修改' : '创建档案' }}
      </button>

      <!-- 删除 -->
      <button
        v-if="isEdit"
        @click="removeBaby"
        class="btn-ghost w-full text-dusk-400"
      >
        删除此宝宝档案
      </button>
    </div>
  </div>
</template>