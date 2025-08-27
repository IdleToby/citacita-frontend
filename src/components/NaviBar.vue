<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'

const route = useRoute()
const { t } = useI18n()

const isActive = (path: string) => route.path === path
</script>

<template>
  <div
    class="flex justify-between items-center rounded-3xl text-white bg-white/20 backdrop-blur-md border border-white/30 shadow-md mx-4 py-2"
  >
    <RouterLink
      to="/"
      class=" text-shadow-lg hover flex items-center px-4 py-2 rounded-lg"
    >
      <img src="@/assets/citacita-w.png" alt="Logo" class="h-10 inline-block mx-4" />
    </RouterLink>

    <div class="flex-1"></div>

    <RouterLink
      to="/jobs"
      class=" text-shadow-lg text-3xl hover:underline mx-6 py-1 rounded-4xl"
      :class="isActive('/jobs') ? ' text-[#FFB076]' : ''"
    >
      {{ t('nav.jobs') }}
    </RouterLink>
    <RouterLink
      to="/map"
      class=" text-shadow-lg text-3xl hover:underline mx-6 py-1 rounded-4xl"
      :class="isActive('/map') ? ' text-[#FFB076]' : ''"
    >
      {{ t('nav.map') }}
    </RouterLink>
    <RouterLink
      to="/ai"
      class=" text-shadow-lg text-3xl hover:underline mx-6 py-1 rounded-4xl"
      :class="isActive('/ai') ? ' text-[#FFB076]' : ''"
    >
      {{ t('nav.aiTools') }}
    </RouterLink>
    <RouterLink
      to="/grants"
      class=" text-shadow-lg text-3xl hover:underline mx-6 py-1 rounded-4xl"
      :class="isActive('/grants') ? ' text-[#FFB076]' : ''"
    >
      {{ t('nav.grants') }}
    </RouterLink>
    <RouterLink
      to="/faq"
      class=" text-shadow-lg text-3xl hover:underline mx-6 py-1 rounded-4xl"
      :class="isActive('/faq') ? ' text-[#FFB076]' : ''"
    >
      {{ t('nav.faq') }}
    </RouterLink>
    <div class="ml-12 mr-6">
      <LanguageSwitcher />
    </div>
  </div>
</template>

<style scoped></style>
