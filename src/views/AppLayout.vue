<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter, RouterView } from 'vue-router'
import { Home, Clock, Plus, Settings } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const tabs = [
  { name: 'home', path: '/', label: '首页', icon: Home },
  { name: 'timeline', path: '/timeline', label: '时间线', icon: Clock },
  { name: 'record', path: '/record/feeding', label: '记录', icon: Plus, primary: true },
  { name: 'settings', path: '/settings', label: '设置', icon: Settings }
]

const currentTab = computed(() => route.name?.toString() || 'home')

function go(path: string) {
  router.push(path)
}
</script>

<template>
  <div class="min-h-screen bg-cream-100 flex flex-col pb-20">
    <div class="flex-1 max-w-2xl mx-auto w-full">
      <RouterView v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </div>

    <!-- 底部导航 -->
    <nav class="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-cream-200 z-50 pb-[env(safe-area-inset-bottom)]">
      <div class="max-w-2xl mx-auto flex justify-around items-center px-2 pt-2 pb-2">
        <button
          v-for="t in tabs"
          :key="t.name"
          @click="go(t.path)"
          :class="[
            'flex flex-col items-center justify-center gap-0.5 transition-all',
            t.primary
              ? 'w-14 h-14 bg-apricot-400 rounded-full text-white -mt-5 shadow-lg shadow-apricot-300/50'
              : 'w-14 h-12 rounded-xl',
            currentTab === t.name && !t.primary
              ? 'text-apricot-500'
              : !t.primary ? 'text-ink-400' : ''
          ]"
        >
          <component :is="t.icon" :class="t.primary ? 'w-6 h-6' : 'w-5 h-5'" />
          <span v-if="!t.primary" class="text-[10px]">{{ t.label }}</span>
        </button>
      </div>
    </nav>
  </div>
</template>
