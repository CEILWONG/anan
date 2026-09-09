<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useBabyStore } from '@/stores/baby'
import { useRecordsStore } from '@/stores/records'
import { downloadExport, importFromZip } from '@/lib/export'
import {
  ArrowLeft,
  Download,
  Upload,
  Edit3,
  Check,
  Trash2
} from 'lucide-vue-next'
import { dbApi } from '@/lib/db'

const router = useRouter()
const userStore = useUserStore()
const babyStore = useBabyStore()
const recordsStore = useRecordsStore()

const exporting = ref(false)
const importing = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

// 编辑名字
const editingName = ref(false)
const tempName = ref('')
function startEditName() {
  tempName.value = userStore.user.name
  editingName.value = true
}
function saveName() {
  userStore.setName(tempName.value)
  editingName.value = false
}

onMounted(async () => {
  await babyStore.loadBabies()
  await recordsStore.loadAll()
})

function showMessage(msg: string, type: 'success' | 'error' = 'success') {
  message.value = msg
  messageType.value = type
  setTimeout(() => {
    message.value = ''
  }, 3000)
}

async function exportData() {
  exporting.value = true
  try {
    await downloadExport()
    showMessage('备份文件已开始下载')
  } catch (e: any) {
    showMessage(e?.message || '导出失败', 'error')
  } finally {
    exporting.value = false
  }
}

async function importData(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  const ok = window.confirm(
    '导入会覆盖当前所有数据，确定继续吗？建议先备份当前数据。'
  )
  if (!ok) {
    target.value = ''
    return
  }
  importing.value = true
  try {
    const result = await importFromZip(file)
    await babyStore.loadBabies()
    await recordsStore.loadAll()
    showMessage(`导入成功：${result.babies} 个宝宝，${result.records} 条记录`)
  } catch (e: any) {
    showMessage(e?.message || '导入失败', 'error')
  } finally {
    importing.value = false
    target.value = ''
  }
}

async function clearData() {
  const ok1 = window.confirm(
    '⚠️ 这将永久删除所有宝宝档案和全部记录，无法恢复！\n\n建议先备份。确定继续吗？'
  )
  if (!ok1) return
  await dbApi.clearAll()
  // 清空当前选中的 baby id
  localStorage.removeItem('anan-current-baby')
  await babyStore.loadBabies()
  await recordsStore.loadAll()
  showMessage('所有数据已清除')
}

const count = computed(() => ({
  babies: babyStore.babies.length,
  records: recordsStore.records.length
}))
</script>

<template>
  <div class="min-h-screen bg-cream-100 pb-24">
    <!-- 顶部 -->
    <div class="px-5 pt-6 pb-4 flex items-center gap-3 sticky top-0 bg-cream-100/90 backdrop-blur z-10">
      <button @click="router.back()" class="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm">
        <ArrowLeft class="w-4 h-4 text-ink-500" />
      </button>
      <div>
        <h1 class="heading-1 text-xl">设置</h1>
        <p class="text-xs text-ink-400">个性化与数据</p>
      </div>
    </div>

    <div class="px-5 space-y-5 max-w-md mx-auto">
      <!-- 消息 -->
      <div
        v-if="message"
        :class="[
          'px-4 py-3 rounded-xl text-sm',
          messageType === 'success'
            ? 'bg-sage-50 text-sage-500'
            : 'bg-dusk-50 text-dusk-400'
        ]"
      >
        {{ message }}
      </div>

      <!-- 记录者 -->
      <div>
        <h3 class="text-xs text-ink-400 mb-2 uppercase tracking-wide">记录者</h3>
        <div class="card">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-cream-200 rounded-2xl flex items-center justify-center text-2xl">
              {{ userStore.emoji }}
            </div>
            <div class="flex-1">
              <p v-if="!editingName" class="text-sm font-medium text-ink-700">
                {{ userStore.user.name }}
              </p>
              <input
                v-else
                v-model="tempName"
                class="input text-sm"
                placeholder="你的称呼"
                maxlength="12"
                @keyup.enter="saveName"
              />
              <p class="text-xs text-ink-400 mt-0.5">
                {{ count.babies }} 个宝宝 · {{ count.records }} 条记录
              </p>
            </div>
            <button
              v-if="!editingName"
              @click="startEditName"
              class="w-8 h-8 bg-cream-100 hover:bg-cream-200 rounded-lg flex items-center justify-center"
            >
              <Edit3 class="w-4 h-4 text-ink-500" />
            </button>
            <button
              v-else
              @click="saveName"
              class="w-8 h-8 bg-sage-100 hover:bg-sage-200 rounded-lg flex items-center justify-center"
            >
              <Check class="w-4 h-4 text-sage-500" />
            </button>
          </div>
        </div>
      </div>

      <!-- 数据备份 -->
      <div>
        <h3 class="text-xs text-ink-400 mb-2 uppercase tracking-wide">数据</h3>
        <div class="card space-y-2">
          <button
            @click="exportData"
            :disabled="exporting"
            class="w-full flex items-center gap-3 py-2 text-left"
          >
            <div class="w-9 h-9 bg-sage-50 rounded-xl flex items-center justify-center">
              <Download class="w-4 h-4 text-sage-500" />
            </div>
            <div class="flex-1">
              <p class="text-sm text-ink-700">备份全部数据</p>
              <p class="text-xs text-ink-400">导出为 .zip</p>
            </div>
          </button>

          <label class="w-full flex items-center gap-3 py-2 cursor-pointer">
            <div class="w-9 h-9 bg-apricot-50 rounded-xl flex items-center justify-center">
              <Upload class="w-4 h-4 text-apricot-500" />
            </div>
            <div class="flex-1">
              <p class="text-sm text-ink-700">导入备份数据</p>
              <p class="text-xs text-ink-400">{{ importing ? '导入中...' : '从 .zip 恢复' }}</p>
            </div>
            <input
              type="file"
              accept=".zip"
              class="hidden"
              @change="importData"
              :disabled="importing"
            />
          </label>
        </div>
      </div>

      <!-- 危险区 -->
      <div>
        <h3 class="text-xs text-ink-400 mb-2 uppercase tracking-wide">危险操作</h3>
        <button
          @click="clearData"
          class="card w-full flex items-center gap-3 text-left text-dusk-400 hover:bg-dusk-50/40"
        >
          <div class="w-9 h-9 bg-dusk-50 rounded-xl flex items-center justify-center">
            <Trash2 class="w-4 h-4" />
          </div>
          <div class="flex-1">
            <p class="text-sm">清除所有数据</p>
            <p class="text-xs text-ink-400">不可恢复，请先备份</p>
          </div>
        </button>
      </div>

      <!-- 关于 -->
      <div class="text-center text-xs text-ink-300 pt-8 pb-4 space-y-1">
        <p>安安记 v0.3.0</p>
        <p>用爱记录，温柔以待</p>
      </div>
    </div>
  </div>
</template>
