<template>
  <Transition
    enter-active-class="transition ease-out duration-300"
    enter-from-class="transform opacity-0 -translate-y-4"
    enter-to-class="transform opacity-100 translate-y-0"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="transform opacity-100 translate-y-0"
    leave-to-class="transform opacity-0 -translate-y-4"
  >
    <div
      v-if="showToast"
      class="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center rounded-lg bg-white p-4 text-gray-700 shadow-xl"
    >
      <svg
        class="h-6 w-6 animate-spin text-blue-600"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        ></circle>
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      <p class="ml-3 font-medium">{{ toastMessage }}</p>
    </div>
  </Transition>
</template>

<script setup lang="ts">
// 使用 Vue 3 Composition API 的示例
// 在实际应用中，这些 props 会由父组件传递
import { defineProps } from 'vue'

const props = defineProps({
  showToast: {
    type: Boolean,
    default: false,
  },
  toastMessage: {
    type: String,
    default: '正在处理中...', // 默认消息
  },
})
</script>
