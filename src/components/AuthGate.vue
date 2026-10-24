<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const key = ref('')
const submitting = ref(false)

async function submit() {
  if (!key.value.trim() || submitting.value) return
  submitting.value = true
  await auth.login(key.value)
  submitting.value = false
}
</script>

<template>
  <div class="min-h-screen bg-cream-100 flex flex-col items-center justify-center px-6">
    <div class="w-full max-w-sm card p-6">
      <div class="w-14 h-14 bg-apricot-100 rounded-2xl flex items-center justify-center text-3xl mb-4">
        🌱
      </div>
      <h1 class="heading-1 text-2xl mb-1">安安记</h1>
      <p class="text-sm text-ink-400 mb-6">请输入访问口令以查看共享记录</p>

      <input
        v-model="key"
        type="password"
        class="input w-full mb-3"
        placeholder="访问口令"
        @keyup.enter="submit"
      />
      <p v-if="auth.error" class="text-xs text-dusk-400 mb-3">{{ auth.error }}</p>
      <button
        @click="submit"
        :disabled="submitting || !key.trim()"
        class="w-full bg-apricot-400 text-white rounded-xl py-3 font-medium disabled:opacity-40"
      >
        {{ submitting ? '验证中…' : '进入' }}
      </button>
    </div>
    <p class="text-xs text-ink-300 mt-6">用爱记录，温柔以待</p>
  </div>
</template>