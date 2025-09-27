<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps<{
  isTranscribing: boolean
}>()

const emit = defineEmits(['stop'])

// 响应式变量，用于存储剩余的秒数
const countdown = ref(30)
// 用于存储 setInterval 的 ID，以便后续清除
let timerId: number | undefined = undefined

// 在组件挂载后执行
onMounted(() => {
  // 启动一个每秒执行一次的定时器
  timerId = setInterval(() => {
    countdown.value-- // 将倒计时减 1
    // 如果倒计时结束
    if (countdown.value <= 0) {
      clearInterval(timerId) // 清除定时器
      emit('stop') // 自动触发停止事件
    }
  }, 1000)
})

// 在组件卸载前执行
onUnmounted(() => {
  // 确保组件销毁时清除定时器，防止内存泄漏
  if (timerId) {
    clearInterval(timerId)
  }
})
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm">
    <div class="flex w-72 flex-col items-center rounded-lg bg-white p-8 shadow-xl">
      <div v-if="!isTranscribing" class="recording-animation">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>

      <div v-else class="transcribing-animation">
        <svg
          class="h-10 w-10 animate-spin text-blue-600"
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
      </div>

      <p v-if="!isTranscribing" class="mt-4 font-semibold text-gray-700">
        {{ t('RecordingModal.recording') }} ({{ countdown }}s)
      </p>
      <p v-else class="mt-4 font-semibold text-gray-700">{{ t('RecordingModal.processing') }}</p>

      <button
        v-if="!isTranscribing"
        @click="emit('stop')"
        class="mt-6 rounded-full bg-red-600 px-6 py-2 text-white shadow-md transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 cursor-pointer"
      >
        {{ t('RecordingModal.stop') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.recording-animation,
.transcribing-animation {
  display: flex;
  height: 40px;
  align-items: center;
  justify-content: center;
}

.recording-animation {
  gap: 10px;
}

.dot {
  width: 16px;
  height: 16px;
  background-color: #ef4444; /* red-500 */
  border-radius: 50%;
  animation: pulse 1.4s infinite ease-in-out both;
}

.dot:nth-child(1) {
  animation-delay: -0.32s;
}

.dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes pulse {
  0%,
  80%,
  100% {
    transform: scale(0.5);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
