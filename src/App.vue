<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AuthGate from '@/components/AuthGate.vue'

const auth = useAuthStore()
onMounted(() => auth.init())
</script>

<template>
  <div v-if="auth.checking" class="min-h-screen bg-cream-100 flex items-center justify-center text-ink-400">
    加载中…
  </div>
  <AuthGate v-else-if="!auth.authed" />
  <RouterView v-else />
</template>