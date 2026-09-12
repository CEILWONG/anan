<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter, RouterView } from 'vue-router'
import { ClipboardList, BarChart3, Settings } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const tabs = [
  { name: 'record', path: '/', label: '记录', icon: ClipboardList },
  { name: 'charts', path: '/charts', label: '图表', icon: BarChart3 },
  { name: 'settings', path: '/settings', label: '设置', icon: Settings }
]

const currentTab = computed(() => {
  if (route.path === '/' || route.path.startsWith('/record')) return 'record'
  if (route.path.startsWith('/charts')) return 'charts'
  if (route.path.startsWith('/settings')) return 'settings'
  return 'record'
})

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
            'flex flex-col items-center justify-center gap-0.5 w-14 h-12 rounded-xl transition-all',
            currentTab === t.name ? 'text-apricot-500' : 'text-ink-400'
          ]"
        >
          <component :is="t.icon" class="w-5 h-5" />
          <span class="text-[10px]">{{ t.label }}</span>
        </button>
      </div>
    </nav>
  </div>
</template>
