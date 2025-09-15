<script setup lang="ts">
import {useI18n} from 'vue-i18n'

const { t } = useI18n()

defineProps<{
  isTranscribing: boolean
}>()

const emit = defineEmits(['stop'])
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

      <p v-if="!isTranscribing" class="mt-4 font-semibold text-gray-700">{{ t('RecordingModal.recording') }}</p>
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
  height: 40px; /* Prevents layout shift when switching animations */
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
