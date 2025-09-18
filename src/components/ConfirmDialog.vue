<template>
  <div v-if="isVisible" class="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
    
    <!-- 对话框 -->
    <div class="relative bg-white rounded-lg shadow-2xl border max-w-md w-full mx-4 p-6 pointer-events-auto">
      <!-- 标题 -->
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">
          {{ title }}
        </h3>
        <button @click="handleCancel" class="text-gray-400 hover:text-gray-600 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <!-- 消息内容 -->
      <div class="mb-6">
        <p class="text-sm text-gray-600 leading-relaxed">
          {{ message }}
        </p>
      </div>
      
      <!-- 按钮 -->
      <div class="flex justify-end space-x-3">
        <button 
          @click="handleCancel"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
        >
          {{ cancelText }}
        </button>
        <button 
          @click="handleConfirm"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'CitaCita',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel'
})

const isVisible = ref(false)
let resolvePromise: ((value: boolean) => void) | null = null

const show = (customMessage?: string, customTitle?: string): Promise<boolean> => {
  isVisible.value = true
  return new Promise((resolve) => {
    resolvePromise = resolve
  })
}

const handleConfirm = () => {
  isVisible.value = false
  if (resolvePromise) {
    resolvePromise(true)
    resolvePromise = null
  }
}

const handleCancel = () => {
  isVisible.value = false
  if (resolvePromise) {
    resolvePromise(false)
    resolvePromise = null
  }
}

defineExpose({
  show
})
</script>