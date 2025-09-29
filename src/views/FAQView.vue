<!-- src/views/FAQView.vue -->
<template>
  <div class="min-h-screen relative">
    <!-- Background with blur effect -->
    <div
      class="fixed inset-0 -z-10"
      :style="{
        backgroundImage: 'url(/images/faq.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        filter: 'blur(8px) brightness(0.2)'
      }"
    ></div>

    <!-- Main content container -->
    <div class="relative z-10 container mx-auto px-6 py-16">
      <!-- Page Title -->
      <div class="text-center mb-8">
        <h1 class="text-5xl md:text-6xl font-bold text-white mb-6" style="text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">
          {{ t('faq.title') }}
        </h1>
        <!-- Horizontal separator line -->
        <div class="w-full h-0.5 bg-white/60 shadow-lg"></div>
      </div>

      <!-- FAQ Section -->
      <div class="max-w-4xl mx-auto bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl">
        <!-- FAQ Items -->
        <div v-for="(faq, index) in faqData" :key="index" class="border-b border-white/20 last:border-b-0">
          <!-- Question Header -->
          <div
            class="flex items-center justify-between p-6 cursor-pointer hover:bg-white/5 transition-colors duration-200"
            @click="toggleFAQ(index)"
          >
            <h3 class="text-xl md:text-2xl font-semibold text-white pr-4" style="text-shadow: 1px 1px 2px rgba(0,0,0,0.6);">
              {{ faq.question }}
            </h3>
            <!-- Plus/Minus Button -->
            <button
              class="faq-button flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white text-2xl font-bold hover:bg-white/30"
              :class="{ 'rotate-180': expandedItems[index] }"
            >
              <span>
                {{ expandedItems[index] ? '-' : '+' }}
              </span>
            </button>
          </div>

          <!-- Answer Content with Collapse Animation -->
          <transition
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="opacity-0 max-h-0"
            enter-to-class="opacity-100 max-h-96"
            leave-active-class="transition-all duration-300 ease-in"
            leave-from-class="opacity-100 max-h-96"
            leave-to-class="opacity-0 max-h-0"
          >
            <div v-if="expandedItems[index]" class="px-6 pb-6 overflow-hidden">
              <div class="text-white text-lg leading-relaxed" style="text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">
                <!-- Handle multi-line answers with proper formatting -->
                <div v-if="faq.answer.includes('\n')" class="whitespace-pre-line">{{ faq.answer }}</div>
                <div v-else-if="faq.answer.includes('https://')" v-html="formatAnswerWithLink(faq.answer)"></div>
                <div v-else>{{ faq.answer }}</div>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>

    <!-- Citabot Icon -->
    <div class="fixed bottom-1 right-1 z-1">
      <img
        :src="citabotImage"
        alt="Citabot"
        class="w-50 h-50 cursor-pointer transition-transform duration-300 ease-out hover:scale-110 object-contain"
        style="width: 200px; height: 200px; max-width: 200px; max-height: 200px;"
        @click="router.push('/ai')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { t, tm, locale } = useI18n()
const router = useRouter()

// Dynamic citabot image based on locale
const citabotImage = computed(() => {
  switch (locale.value) {
    case 'ms':
      return '/images/citabot-ms.png'
    case 'zh-CN':
      return '/images/citabot-zh.png'
    case 'en':
    default:
      return '/images/citabot.png'
  }
})

// FAQ data structure
interface FAQItem {
  question: string
  answer: string
}

// Get FAQ data from i18n translations
const faqData = computed<FAQItem[]>(() => {
  return tm('faq.questions') as FAQItem[]
})

// Track which FAQ items are expanded
const expandedItems = reactive<Record<number, boolean>>({})

// Toggle FAQ expand/collapse
const toggleFAQ = (index: number) => {
  expandedItems[index] = !expandedItems[index]
}

// Format answer with clickable link
const formatAnswerWithLink = (answer: string) => {
  return answer.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" class="text-blue-300 hover:text-blue-200 underline">$1</a>'
  )
}
</script>

<style scoped>
/* FAQ Button Animation and Styling */
.faq-button {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: center center;
}

.faq-button:hover {
  transform: scale(1.1);
}

.faq-button.rotate-180 {
  transform: rotate(180deg);
}

.faq-button.rotate-180:hover {
  transform: rotate(180deg) scale(1.1);
}

/* Perfect centering for button symbols */
.faq-button span {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  line-height: 1;
  margin: 0;
  padding: 0;
  position: relative;
  top: -1px; /* Fine-tune vertical centering */
  font-family: monospace; /* Ensures consistent symbol width */
}

/* Ensure proper text rendering on different backgrounds */
.container {
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Custom scrollbar for better UX if content overflows */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

/* Enhanced button interaction feedback */
.faq-button:active {
  transform: scale(0.95);
}

.faq-button.rotate-180:active {
  transform: rotate(180deg) scale(0.95);
}
</style>
