// src/components/NaviBar.vue
<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'

const route = useRoute()
const { t } = useI18n()

const isActive = (path: string) => route.path === path

// 控制提示框显示状态
const activeTooltip = ref<string | null>(null)

// 导航项配置
const navigationItems = [
  {
    path: '/jobs',
    labelKey: 'nav.jobs',
    tooltipKey: 'nav.jobsTooltip',
  },
  {
    path: '/map',
    labelKey: 'nav.map',
    tooltipKey: 'nav.mapTooltip',
  },
  {
    path: '/ai',
    labelKey: 'nav.aiTools',
    tooltipKey: 'nav.aiToolsTooltip',
  },
  {
    path: '/grants',
    labelKey: 'nav.grants',
    tooltipKey: 'nav.grantsTooltip'
  },
  {
    path: '/faq',
    labelKey: 'nav.faq',
    tooltipKey: 'nav.faqTooltip'
  }
]

const showTooltip = (path: string) => {
  activeTooltip.value = path
}

const hideTooltip = () => {
  activeTooltip.value = null
}
</script>

<template>
  <div
    class="flex justify-between items-center rounded-3xl text-white bg-white/20 backdrop-blur-md border border-white/30 shadow-md mx-4 py-2"
  >
    <!-- Logo -->
    <RouterLink
      to="/"
      class="text-shadow-lg hover flex items-center px-4 py-2 rounded-lg"
    >
      <img src="@/assets/citacita-w.png" alt="Logo" class="h-10 inline-block mx-4" />
    </RouterLink>

    <div class="flex-1"></div>

    <!-- Navigation Items - 添加 data-tour-step="1" -->
    <div data-tour-step="1" class="flex items-center gap-2">
      <div
        v-for="item in navigationItems"
        :key="item.path"
        class="relative"
        @mouseenter="showTooltip(item.path)"
        @mouseleave="hideTooltip"
      >
        <RouterLink
          :to="item.path"
          class="text-shadow-lg text-3xl hover:underline mx-6 py-1 rounded-4xl transition-colors duration-200 block"
          :class="isActive(item.path) ? 'text-[#FFB076]' : 'hover:text-gray-200'"
        >
          {{ t(item.labelKey) }}
        </RouterLink>

        <!-- 无箭头提示框 -->
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 transform translate-y-2 scale-95"
          enter-to-class="opacity-100 transform translate-y-0 scale-100"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 transform translate-y-0 scale-100"
          leave-to-class="opacity-0 transform translate-y-2 scale-95"
        >
          <div
            v-if="activeTooltip === item.path"
            class="absolute top-full left-1/2 transform -translate-x-1/2 mt-3 z-50"
          >
            <!-- 提示框内容（无箭头） -->
            <div class="bg-white/90 backdrop-blur-md border border-white/30 rounded-xl shadow-lg px-4 py-3 min-w-[280px] max-w-[320px]">
              <p class="text-gray-800 text-sm font-medium leading-relaxed text-center">
                {{ t(item.tooltipKey) }}
              </p>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Language Switcher - 添加 data-tour-step="2" -->
    <div data-tour-step="2" class="ml-12 mr-6">
      <LanguageSwitcher />
    </div>
  </div>
</template>

<style scoped>
/* 确保提示框在最上层 */
.relative {
  position: relative;
}

/* 悬浮效果增强 */
.hover\:underline:hover {
  text-decoration-thickness: 2px;
  text-underline-offset: 4px;
}
</style>
